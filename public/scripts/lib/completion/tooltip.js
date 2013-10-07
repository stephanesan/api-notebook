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
};
