var Ghost = require('./ghost');

var Widget = module.exports = function (completion, data) {
  var cm   = completion.cm;
  var that = this;

  this.data       = data;
  this.completion = completion;

  cm.addKeyMap(this.keyMap = {
    'Up':       function () { that.setActive(that.selectedHint - 1); },
    'Down':     function () { that.setActive(that.selectedHint + 1); },
    // Enable `Alt-` navigation for when we are showing advanced properties
    'Alt-Up':   function () { that.setActive(that.selectedHint - 1); },
    'Alt-Down': function () { that.setActive(that.selectedHint + 1); },
    'Home':     function () { that.setActive(0); },
    'End':      function () { that.setActive(completions.length); },
    'Enter':    function () { that.accept(); },
    'Esc':      function () { that.remove(); },
    'PageUp':   function () {
      that.setActive(that.selectedHint - that.screenAmount());
    },
    'PageDown': function () {
      that.setActive(that.selectedHint + that.screenAmount());
    }
  });

  this.refresh();
};

Widget.prototype.remove = function () {
  this.removeGhost();
  this.removeHints();
  this.completion.cm.removeKeyMap(this.keyMap);
  delete this.completion.widget;
};

Widget.prototype.removeHints = function () {
  if (!this.hints) { return; }

  this.completion.cm.off('scroll', this.onScroll);
  if (this.hints.parentNode) { this.hints.parentNode.removeChild(this.hints); }
  delete this.hints;
};

Widget.prototype.removeGhost = function () {
  if (!this.ghost) { return; }

  this.ghost.remove();
};

Widget.prototype.refresh = function () {
  var activeHint  = 0;
  var currentHint = 0;

  // If we have current hints, get the current resultId so we can set it back as
  // close as possible
  if (this.hints && this.selectedHint) {
    currentHint = this.hints.childNodes[this.selectedHint].listId;
  }

  this.removeHints();
  delete this.selectedHint;

  var cm          = this.completion.cm;
  var text        = cm.getRange(this.data.from, this.data.to);
  var hints       = this.hints = document.createElement('ul');
  var completions = this.data.list;

  for (var i = 0, j = 0; i < completions.length; i++) {
    var cur = completions[i];

    // Skip any filtered values
    if (!this.completion._filter(cur)) { continue; }

    var el = hints.appendChild(document.createElement('li'));
    el.hintId    = j++;
    el.listId    = i;
    el.className = 'CodeMirror-hint';

    if (i <= currentHint) {
      activeHint = el.hintId;
    }

    if (cur.indexOf(text) === 0) {
      var match = document.createElement('span');
      match.className = 'CodeMirror-hint-match';
      match.appendChild(document.createTextNode(cur.substr(0, text.length)));
      el.appendChild(match);
      el.appendChild(document.createTextNode(cur.substr(text.length)));
    } else {
      el.appendChild(document.createTextNode(cur));
    }
  }

  if (!hints.childNodes.length) {
    this.removeGhost();
    return this.removeHints();
  }

  if (hints.childNodes.length === 1) {
    this.setActive(0);
    return this.removeHints();
  }

  var pos   = cm.cursorCoords(this.data.from);
  var top   = pos.bottom;
  var left  = pos.left;
  var below = true;

  hints.className  = 'CodeMirror-hints';
  hints.style.top  = top  + 'px';
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

  this.setActive(activeHint);
  document.body.appendChild(hints);

  CodeMirror.on(hints, 'click', function (e) {
    var el = e.target || e.srcElement;
    if (isNaN(el.hintId)) { return; }

    that.setActive(el.hintId);
    that.accept();
  });

  CodeMirror.on(hints, 'mousedown', function () {
    setTimeout(function () { cm.focus(); }, 20);
  });

  var startScroll = cm.getScrollInfo();
  cm.on('scroll', this.onScroll = function () {
    var curScroll = cm.getScrollInfo();
    var newTop    = top + startScroll.top - curScroll.top;
    var editor    = cm.getWrapperElement().getBoundingClientRect();
    var point     = newTop - (window.pageYOffset ||
      (document.documentElement || document.body).scrollTop);

    if (!below) { point += that.hints.offsetHeight; }
    if (point <= editor.top || point >= editor.bottom) {
      return completion.remove();
    }

    that.hints.style.top  = newTop + 'px';
    that.hints.style.left = (left + startScroll.left - curScroll.left) + 'px';
  });
};

Widget.prototype.accept = function () {
  this.ghost.accept();
  this.remove();
};

Widget.prototype.setActive = function (i) {
  var total = this.hints.childNodes.length;
  var node;

  // Switch `i` to the closest number we can abuse
  i = total ? i % total : 0;

  // When we have a negative value, take away from the end of the list, this
  // allows up to loop around the menu.
  if (i < 0) { i = total + i; }

  if (!total)                  { return this.removeGhost(); }
  if (this.selectedHint === i) { return; }

  // Remove the old active hint
  if (!isNaN(this.selectedHint)) {
    node = this.hints.childNodes[this.selectedHint];
    node.className = node.className.replace(' CodeMirror-hint-active', '');
  }

  // Add the class to the new active hint
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

  this.removeGhost();
  this.ghost = new Ghost(this, this.data, this.data.list[node.listId]);
};

Widget.prototype.screenAmount = function () {
  var amount = this.hints.clientHeight / this.hints.firstChild.offsetHeight;
  return Math.floor(amount) || 1;
};
