var _          = require('underscore');
var Backbone   = require('backbone');
var state      = require('../../state/state');
var middleware = require('../../state/middleware');
var HintDocs   = require('./hint-documentation');

/**
 * Create a hints popover.
 *
 * @param  {Widget} widget
 * @param  {Array}  results
 * @return {Hints}
 */
var Hints = module.exports = function (widget, results) {
  var that  = this;
  var cm    = this.cm    = widget.completion.cm;
  var hints = this.hints = document.createElement('ul');
  var data  = this.data  = widget.data;
  var text  = cm.getRange(data.from, data.to);

  this.widget = widget;

  _.each(this.results = results, function (result, index) {
    var el     = hints.appendChild(document.createElement('li'));
    var hintEl = document.createElement('span');
    var indexOf;

    el.hintId        = index;
    el.className     = 'CodeMirror-hint';
    hintEl.className = 'CodeMirror-hint-text';

    if ((indexOf = result.title.indexOf(text)) > -1) {
      var prefix  = result.title.substr(0, indexOf);
      var match   = result.title.substr(indexOf, text.length);
      var suffix  = result.title.substr(indexOf + text.length);
      var matchEl = document.createElement('span');

      matchEl.className   = 'CodeMirror-hint-match';
      matchEl.textContent = match;

      hintEl.appendChild(document.createTextNode(prefix));
      hintEl.appendChild(matchEl);
      hintEl.appendChild(document.createTextNode(suffix));
    } else {
      hintEl.textContent = result.title;
    }

    el.appendChild(hintEl);

    if (result.type) {
      var typeEl = document.createElement('span');
      typeEl.className   = 'CodeMirror-hint-type';
      typeEl.textContent = result.type;

      el.appendChild(typeEl);
    }
  });

  hints.className = 'CodeMirror-hints';
  hints.setAttribute('data-overflow-scroll', 'true');
  document.body.appendChild(hints);

  cm.addKeyMap(this.keyMap = {
    'Up': function () {
      that.select(that.currentHint - 1);
    },
    'Down': function () {
      that.select(that.currentHint + 1);
    },
    'Home': function () {
      that.select(0);
    },
    'End': function () {
      that.select(-1);
    },
    'Esc': function () {
      that.remove();
    },
    'Enter': function () {
      that.accept(that.currentHint);
    },
    'PageUp': function () {
      that.select(that.currentHint - that.screenAmount(), true);
    },
    'PageDown': function () {
      that.select(that.currentHint + that.screenAmount(), true);
    }
  });

  Backbone.$(hints).on('click', 'li', function (e, target) {
    if (isNaN(target.hintId)) {
      return;
    }

    that.accept(target.hintId);
  });

  CodeMirror.on(hints, 'mousedown', function () {
    window.setTimeout(function () { cm.focus(); }, 20);
  });

  state.on(
    'change:viewportHeight change:viewportWidth',
    this.onResize = function () { that.reposition(); }
  );

  this.select(0);
};

/**
 * Inherit events from Backbone.
 */
_.extend(Hints.prototype, Backbone.Events);

/**
 * Accept a hint result.
 *
 * @param {Number} index
 */
Hints.prototype.accept = function (index) {
  this.trigger('accept', this.results[index]);
};

/**
 * Select a hint option.
 *
 * @param {Number}  index
 * @param {Boolean} noWrap
 */
Hints.prototype.select = function (index, noWrap) {
  var that  = this;
  var data  = this.data;
  var total = this.hints.childNodes.length;

  // Convert the index to the closest number usable number.
  index = index % total;

  // Avoid wrapping around the menu.
  if (noWrap && (index < 0 || index > total)) {
    return;
  }

  // When we have a negative number, we need to subtract it from the bottom
  // of the hints menu. This gives us the looping around effect.
  if (index < 0) {
    index = total + index;
  }

  // Avoid resetting the currently selected hint.
  if (this.currentHint === index) {
    return;
  }

  // Remove the old active hint if we have a selected hint id.
  if (!isNaN(this.currentHint)) {
    this.removeDocs();

    var old = this.hints.childNodes[this.currentHint];
    old.className = old.className.replace(' CodeMirror-hint-active', '');
  }

  // Add the class to the new active hint
  var node = this.hints.childNodes[this.currentHint = index];
  node.className += ' CodeMirror-hint-active';

  var result = this.results[this.currentHint];

  this.trigger('select', result);
  this.reposition();

  if (node.offsetTop < this.hints.scrollTop) {
    this.hints.scrollTop = node.offsetTop - 3;
  } else {
    var totalOffset = node.offsetTop + node.offsetHeight;
    if (totalOffset > this.hints.scrollTop + this.hints.clientHeight) {
      this.hints.scrollTop = totalOffset - this.hints.clientHeight + 3;
    }
  }

  middleware.trigger('completion:describe', {
    parent:  data.context,
    context: data.context[result.value],
    token:   _.extend({}, data.token, { string: result.value })
  }, function (err, describe) {
    if (err || !describe) { return; }

    that.docs = new HintDocs(that, describe);
  }, true);
};

/**
 * Update the hint positioning.
 */
Hints.prototype.reposition = function () {
  var cm     = this.cm;
  var pos    = cm.cursorCoords(this.data.from, 'window');
  var hints  = this.hints;
  var margin = parseInt(window.getComputedStyle(hints).margin, 10);

  hints.className    = hints.className.replace(' CodeMirror-hints-top', '');
  hints.style.top    = pos.bottom - margin + 'px';
  hints.style.left   = pos.left - margin + 'px';
  hints.style.right  = 'auto';
  hints.style.bottom = 'auto';
  hints.style.width  = 'auto';
  hints.style.height = 'auto';

  var box       = hints.getBoundingClientRect();
  var winWidth  = state.get('viewportWidth');
  var winHeight = state.get('viewportHeight');
  var docWidth  = state.get('documentWidth');
  var docHeight = state.get('documentHeight');

  if (pos.top > winHeight - pos.bottom) {
    hints.className += ' CodeMirror-hints-top';

    var height = box.bottom - box.top;

    if (pos.top < height - margin) {
      hints.style.height = pos.top - margin + 'px';
    }

    hints.style.top    = 'auto';
    hints.style.bottom = docHeight - pos.top - window.scrollY - margin + 'px';
  }

  if (box.right + margin >= winWidth) {
    hints.style.left  = 'auto';
    hints.style.right = docWidth - window.scrollX - winWidth + 'px';
  }

  this.trigger('reposition');
};

/**
 * Return the number of hints the current menu is displaying.
 *
 * @return {Number}
 */
Hints.prototype.screenAmount = function () {
  var amount = this.hints.clientHeight / this.hints.firstChild.offsetHeight;
  return Math.max(Math.floor(amount), 1);
};

/**
 * Remove the documentation widget from the DOM.
 */
Hints.prototype.removeDocs = function () {
  if (this.docs) {
    this.docs.remove();
  }
};

/**
 * Remove the hints menu.
 */
Hints.prototype.remove = function () {
  this.removeDocs();
  this.cm.removeKeyMap(this.keyMap);
  document.body.removeChild(this.hints);
  delete this.keyMap;
  delete this.widget.hints;
};
