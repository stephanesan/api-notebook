var _ = require('underscore');

/**
 * Generates a ghost text widget that is used to render Chrome-style completion.
 *
 * @param  {Object} widget
 * @param  {Object} data
 * @param  {String} text
 * @return {Ghost}
 */
var Ghost = module.exports = function (widget, data, result) {
  this.cm     = widget.completion.cm;
  this.data   = data;
  this.widget = widget;

  var substring = result.value.substr(0, this.data.to.ch - this.data.from.ch);

  if (substring === data.token.string) {
    this.text = result.value.substr(this.data.to.ch - this.data.from.ch);
  }

  // Don't create the ghost element if there is no text to display. It makes
  // for a janky UI where keys are blocked thanks to the ghost shortcuts.
  if (!this.text) { return; }

  this.cm.addKeyMap(this.keyMap = {
    'Tab':   _.bind(this.accept, this),
    'Right': _.bind(this.accept, this)
  });

  // Creates the ghost element to be styled.
  var ghostHint = document.createElement('span');
  ghostHint.className = 'CodeMirror-hint-ghost';
  ghostHint.appendChild(document.createTextNode(this.text));

  // Abuse the bookmark feature of CodeMirror to achieve the desired completion
  // effect without modifying source code.
  this.ghost = this.cm.setBookmark(this.data.to, {
    widget:     ghostHint,
    insertLeft: true
  });
};

/**
 * Accept the display ghost text.
 *
 * @return {Ghost}
 */
Ghost.prototype.accept = function () {
  if (this.text && this.data) {
    this.cm.replaceRange(this.text, this.data.to, this.data.to);
  }

  return this.remove();
};

/**
 * Remove the ghost suggestion.
 *
 * @return {Ghost}
 */
Ghost.prototype.remove = function () {
  // Clear any set ghost.
  if (this.ghost) {
    this.ghost.clear();
  }

  // No keymap will be defined when we have no text shown in the ghost.
  if (this.keyMap) {
    this.cm.removeKeyMap(this.keyMap);
  }

  // Remove dead references.
  delete this.text;
  delete this.ghost;
  delete this.widget.ghost;

  return this;
};
