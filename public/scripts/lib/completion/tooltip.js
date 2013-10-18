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

  return this.render();
};

/**
 * Render the tooltip based on the description object.
 *
 * @return {Tooltip}
 */
Tooltip.prototype.render = function () {
  var description = this.data.description;

  this.removeTooltip();

  // Needs the type or a description at minimum to render.
  if (!description['!type'] && !description['!doc']) {
    return this;
  }

  this._tooltip = document.createElement('div');
  this._tooltip.className = 'CodeMirror-tooltip';

  if (description['!type']) {
    var typeEl = this._tooltip.appendChild(document.createElement('div'));
    typeEl.className = 'CodeMirror-tooltip-type';
    typeEl.appendChild(document.createTextNode(description['!type']));
  }

  if (description['!doc']) {
    var docEl = this._tooltip.appendChild(document.createElement('div'));
    docEl.className = 'CodeMirror-tooltip-doc';
    docEl.appendChild(document.createTextNode(description['!doc']));

    if (description['!url']) {
      docEl.appendChild(document.createTextNode(' — '));

      var infoEl = docEl.appendChild(document.createElement('a'));
      infoEl.href      = description['!url'];
      infoEl.target    = '_blank';
      infoEl.className = 'CodeMirror-tooltip-doc-url';
      infoEl.appendChild(document.createTextNode('Read more'));
    }
  }

  // Append the tooltip to the DOM.
  document.body.appendChild(this._tooltip);

  this.reposition();

  // Listen to changes in the viewport size and reposition the tooltip.
  state.on('change:viewportWidth', this.onResize = _.bind(
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
  var tooltip = this._tooltip;
  var padding = 5;
  var pos     = this.completion.cm.cursorCoords(this.data.to);
  var winPos  = this.completion.cm.cursorCoords(this.data.to, 'window');

  tooltip.style.top  = pos.bottom + 'px';
  tooltip.style.left = pos.left   + 'px';

  var tooltipPos   = _.pick(
    tooltip.getBoundingClientRect(), 'top', 'left', 'right', 'bottom'
  );

  var winWidth     = state.get('viewportWidth');
  var winHeight    = state.get('viewportHeight');
  var rightWidth   = winWidth  - winPos.right;
  var bottomHeight = winHeight - winPos.bottom;

  if (tooltipPos.right > winWidth - padding && tooltipPos.left > rightWidth) {
    var docWidth = document.documentElement.scrollWidth;

    tooltip.className += ' CodeMirror-tooltip-right';
    tooltip.style.left  = 'auto';
    tooltip.style.right = docWidth - pos.right + 'px';

    // Update the tooltip positions.
    tooltipPos.left  = winPos.right - tooltip.clientWidth;
    tooltipPos.right = winPos.right;
  }

  if (tooltipPos.bottom > winHeight - padding && winPos.top > bottomHeight) {
    tooltip.style.display = 'none';

    // Get the document height after hiding the tooltip since it can affect the
    // document height.
    var docHeight = document.documentElement.scrollHeight;

    tooltip.className += ' CodeMirror-tooltip-top';
    tooltip.style.top     = 'auto';
    tooltip.style.bottom  = docHeight - pos.top + 'px';
    tooltip.style.display = 'block';

    // Update the tooltip postitions.
    tooltipPos.top    = winPos.top - tooltip.clientHeight;
    tooltipPos.bottom = winPos.top;
  }

  if (tooltipPos.top < padding) {
    tooltip.style.height = tooltipPos.bottom - padding + 'px';
  }

  if (tooltipPos.bottom > winHeight - padding) {
    tooltip.style.height = winHeight - tooltipPos.top - padding + 'px';
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

  state.off('change:viewportWidth', this.onResize);
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
