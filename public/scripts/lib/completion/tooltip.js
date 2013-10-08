var _     = require('underscore');
var state = require('../../state/state');

/**
 * Renders a documentation tooltip.
 *
 * @param  {Completion} completion
 * @param  {Object}     data
 * @return {Tooltip}
 */

var Tooltip = module.exports = function (completion, data) {
  this.data       = data;
  this.completion = completion;

  CodeMirror.signal(completion.cm, 'startTooltip', completion.cm);

  this.render();
};

/**
 * Render the tooltip based on the description object.
 *
 * @return {Tooltip}
 */
Tooltip.prototype.render = function () {
  this.removeTooltip();

  if (!this.data.description['!type']) {
    return this;
  }

  this._tooltip = document.createElement('div');
  this._tooltip.className = 'CodeMirror-tooltip';

  document.body.appendChild(this._tooltip);

  var typeEl = this._tooltip.appendChild(document.createElement('div'));
  typeEl.className = 'CodeMirror-tooltip-type';
  typeEl.appendChild(document.createTextNode(this.data.description['!type']));

  this.reposition();

  // Listen to changes in the viewport size and reposition the tooltip.
  state.on('change:window.width', this.onResize = _.bind(
    this.reposition, this
  ));

  return this;
};

/**
 * Position the tooltip in the window.
 *
 * @return {[type]} [description]
 */
Tooltip.prototype.reposition = function () {
  var pos = this.completion.cm.cursorCoords(this.data.to);

  this._tooltip.style.position = 'absolute';
  this._tooltip.style.top      = pos.bottom + 'px';
  this._tooltip.style.left     = pos.left   + 'px';

  var tooltip    = this._tooltip.getBoundingClientRect();
  var winWidth   = state.get('window.width');
  var rightWidth = tooltip.right - tooltip.left;

  if (tooltip.right > winWidth - 5 && tooltip.left > rightWidth) {
    this._tooltip.className += ' CodeMirror-tooltip-right';
    this._tooltip.style.left  = 'auto';
    this._tooltip.style.right = winWidth - pos.left + 'px';
  }

  return this;
};

/**
 * Destroy the tooltip DOM element.
 *
 * @return {Tooltip}
 */
Tooltip.prototype.removeTooltip = function () {
  if (this._tooltip) {
    this._tooltip.parentNode.removeChild(this._tooltip);
    delete this._tooltip;
  }

  state.off('change:window.width', this.onResize);
  delete this.onResize;

  return this;
};

/**
 * Remove the tooltip from the DOM.
 *
 * @return {Tooltip}
 */
Tooltip.prototype.remove = function () {
  this.removeTooltip();

  CodeMirror.signal(this.completion.cm, 'endTooltip', this.completion.cm);

  return this;
};
