var _         = require('underscore');
var Cell      = require('./cell');
var Inspector = require('../inspector');

var ResultCell = module.exports = Cell.extend({
  className: 'cell cell-result result-pending'
});

ResultCell.prototype._reset = function () {
  if (this.inspector) { this.inspector.remove(); }
  this.el.classList.add('result-pending');
  this.el.classList.remove('result-error');
  return this;
};

ResultCell.prototype._renderInspector = function (options) {
  this._reset();
  this.inspector = new Inspector(options);
  this.inspector.render().appendTo(this.el);
  this.el.classList.remove('result-pending');
  return this;
};

ResultCell.prototype.setResult = function (result, context) {
  this._renderInspector({ inspect: result, context: context });
  return this;
};

ResultCell.prototype.setError = function (error, context) {
  // Pass through an additional error flag which will cause the inspector
  // to go into an error rendering mode
  this._renderInspector({ inspect: error, context: context, error: true });
  this.el.classList.add('result-error');
  return this;
};
