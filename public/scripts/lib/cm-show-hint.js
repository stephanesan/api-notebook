/**
 * CodeMirror hinting utility designed to behave like the Blink inspector.
 *
 * Adapted from `codemirror/addon/hint/show-hint.js` by Blake Embrey on
 * 21/08/2013. Removes some unwanted behaviour and additional customisation in
 * favour of a more streamlined autocompletion module.
 */

(function () {
  'use strict';

  var Widget = function (completion, data) {
    this.data       = data;
    this.completion = completion;

    var cm    = completion.cm;
    var that  = this;
    var text  = cm.getRange(data.from, data.to);
    var hints = this.hints = document.createElement('ul');
    hints.className   = 'CodeMirror-hints';
    this.selectedHint = 0;

    var completions = data.list;

    for (var i = 0; i < completions.length; i++) {
      var el  = hints.appendChild(document.createElement('li'));
      var cur = completions[i];

      el.className = 'CodeMirror-hint' + (i ? '' : ' CodeMirror-hint-active');
      el.hintId = i;

      if (cur.indexOf(text) === 0) {
        var b = document.createElement('span');
        b.className = 'CodeMirror-hint-match';
        b.appendChild(document.createTextNode(cur.substr(0, text.length)));
        el.appendChild(b);
        el.appendChild(document.createTextNode(cur.substr(text.length)));
      } else {
        el.appendChild(document.createTextNode(cur));
      }
    }

    var pos   = cm.cursorCoords(data.from);
    var top   = pos.bottom;
    var left  = pos.left;
    var below = true;

    hints.style.top  = top + 'px';
    hints.style.left = left + 'px';

    var box       = hints.getBoundingClientRect();
    var winWidth  = window.innerWidth || Math.max(document.body.offsetWidth,
      document.documentElement.offsetWidth);
    var winHeight = window.innerHeight || Math.max(document.body.offsetHeight,
      document.documentElement.offsetHeight);

    var overlapX = box.right - winWidth;
    var overlapY = box.bottom - winHeight;

    if (overlapX > 0) {
      if (box.right - box.left > winWidth) {
        hints.style.width = (winWidth - 5) + 'px';
        overlapX -= (box.right - box.left) - winWidth;
      }
      hints.style.left = (left = pos.left - overlapX) + 'px';
    }

    if (overlapY > 0) {
      var height = box.bottom - box.top;
      if (box.top - (pos.bottom - pos.top) - height > 0) {
        below    = false;
        overlapY = height + (pos.bottom - pos.top);
      } else if (height > winHeight) {
        hints.style.height = (winHeight - 5) + 'px';
        overlapY -= height - winHeight;
      }
      hints.style.top = (top = pos.bottom - overlapY) + 'px';
    }

    document.body.appendChild(hints);

    cm.addKeyMap(this.keyMap = {
      Up:       function () { that.setActive(that.selectedHint - 1); },
      Down:     function () { that.setActive(that.selectedHint + 1); },
      Home:     function () { that.setActive(0); },
      End:      function () { that.setActive(completions.length); },
      Enter:    function () { that.accept(); },
      PageUp:   function () {
        that.setActive(that.selectedHint - that.screenAmount());
      },
      PageDown: function () {
        that.setActive(that.selectedHint + that.screenAmount());
      }
    });

    var startScroll = cm.getScrollInfo();
    cm.on('scroll', this.onScroll = function () {
      var curScroll = cm.getScrollInfo();
      var newTop    = top + startScroll.top - curScroll.top;
      var editor    = cm.getWrapperElement().getBoundingClientRect();
      var point     = newTop - (window.pageYOffset ||
        (document.documentElement || document.body).scrollTop);

      if (!below) { point += hints.offsetHeight; }
      if (point <= editor.top || point >= editor.bottom) {
        return completion.remove();
      }

      hints.style.top  = newTop + 'px';
      hints.style.left = (left + startScroll.left - curScroll.left) + 'px';
    });

    CodeMirror.on(hints, 'click', function (e) {
      var el = e.target || e.srcElement;
      if (isNaN(el.hintId)) { return; }

      that.setActive(el.hintId);
      that.accept();
    });

    CodeMirror.on(hints, 'mousedown', function () {
      setTimeout(function () { cm.focus(); }, 20);
    });

    return true;
  };

  Widget.prototype.remove = function () {
    if (this.completion.widget !== this) { return; }

    this.completion.widget = null;
    this.completion.cm.removeKeyMap(this.keyMap);
    this.hints.parentNode.removeChild(this.hints);

    var cm = this.completion.cm;
    cm.off('scroll', this.onScroll);
  };

  Widget.prototype.accept = function () { this.completion.accept(); };

  Widget.prototype.setActive = function (i) {
    var length = this.data.list.length;
    // When we have a negative value, take away from the end of the list, this
    // allows up to loop around the menu.
    if (i < 0)          { i = length + i; }
    if (i > length - 1) { i = i - length; }

    i = Math.max(0, Math.min(i, length - 1));

    if (this.selectedHint === i) { return; }

    var node = this.hints.childNodes[this.selectedHint];
    node.className = node.className.replace(' CodeMirror-hint-active', '');
    node = this.hints.childNodes[this.selectedHint = i];
    node.className += ' CodeMirror-hint-active';

    if (node.offsetTop < this.hints.scrollTop) {
      this.hints.scrollTop = node.offsetTop - 3;
    } else {
      var totalOffset = node.offsetTop + node.offsetHeight;
      if (totalOffset > this.hints.scrollTop + this.hints.clientHeight) {
        this.hints.scrollTop = totalOffset - this.hints.clientHeight + 3;
      }
    }

    this.completion.ghost.setText(this.data.list[i]);
  };

  Widget.prototype.screenAmount = function () {
    var amount = this.hints.clientHeight / this.hints.firstChild.offsetHeight;
    return Math.floor(amount) || 1;
  };

  var Ghost = function (completion, data, text) {
    this.cm         = completion.cm;
    this.data       = data;
    this.completion = completion;

    this.setText(text);
  };

  Ghost.prototype.removeText = function () {
    if (!this.ghost) { return; }

    this.ghost.clear();
    delete this.ghost;
    delete this.suffix;
  };

  Ghost.prototype.setText = function (text) {
    var that = this;
    this.removeText();

    // At the moment, the ghost is going to assume the prefix text is accurate
    var suffix = this.suffix = text.substr(this.data.to.ch - this.data.from.ch);

    if (!suffix.length) { return; }

    var ghostHint = document.createElement('span');
    ghostHint.className = 'CodeMirror-hint-ghost';
    ghostHint.appendChild(document.createTextNode(suffix));

    // Abusing the bookmark feature since it's the only way without modifying
    // CodeMirror source to achieve the effect we need here.
    this.ghost = this.cm.setBookmark(this.data.to, {
      widget:     ghostHint,
      insertLeft: true
    });

    this.cm.setCursor(this.data.to);
  };

  Ghost.prototype.accept = function () {
    this.cm.replaceRange(this.suffix, this.data.to, this.data.to);
    this.removeText();
  };

  Ghost.prototype.remove = function () {
    this.removeText();
  };

  var Completion = function (cm, data, options) {
    var that = cm.state.completionActive = this;
    var closeOnBlur;

    this.cm      = cm;
    this.options = options;
    this.widget  = null;

    this.onBlur = function () {
      closeOnBlur = setTimeout(function () { that.remove(); }, 100);
    };
    this.onFocus = function () {
      clearTimeout(closeOnBlur);
    };
    this.onKeydown = function (cm, e) {
      if (CodeMirror.isModifierKey(e)) { return; }

      var keyName = CodeMirror.keyName(e, e.shiftKey);
      if (that        && keyName in that.keyMap)        { return; }
      if (that.widget && keyName in that.widget.keyMap) { return; }

      that.remove();
    };

    CodeMirror.signal(this.cm, 'startCompletion', this.cm);

    this.cm.addKeyMap(this.keyMap = {
      Esc:   function () { that.remove(); },
      Tab:   function () { that.accept(); },
      Right: function () { that.accept(); }
    });

    this.cm.on('blur',    this.onBlur);
    this.cm.on('focus',   this.onFocus);
    this.cm.on('keydown', this.onKeydown);

    this.showHints(data);
  };

  Completion.prototype.remove = function () {
    if (!this.active()) { return; }

    this.cm.off('blur',    this.onBlur);
    this.cm.off('focus',   this.onFocus);
    this.cm.off('keydown', this.onKeydown);

    this.cm.removeKeyMap(this.keyMap);

    if (this.ghost)  { this.ghost.remove(); }
    if (this.widget) { this.widget.remove(); }
    delete this.cm.state.completionActive;
    CodeMirror.signal(this.cm, 'endCompletion', this.cm);
  };

  Completion.prototype.active = function () {
    return this.cm.state.completionActive === this;
  };

  Completion.prototype.accept = function () {
    this.ghost.accept();
    this.remove();
  };

  Completion.prototype.showHints = function (data) {
    if (!data || !data.list.length || !this.active()) { return this.remove(); }

    this.showGhost(data);

    if (data.list.length > 1) {
      this.showWidget(data);
    }
  };

  Completion.prototype.showGhost = function (data) {
    this.ghost = new Ghost(this, data, data.list[0]);
  };

  Completion.prototype.showWidget = function (data) {
    this.widget = new Widget(this, data);
  };

  CodeMirror.showHint = function (cm, getHints, options) {
    options = options || {};

    if (cm.somethingSelected() || !getHints) { return; }
    if (cm.state.completionActive) { cm.state.completionActive.remove(); }

    return new Completion(cm, getHints(cm, options), options);
  };
})();
