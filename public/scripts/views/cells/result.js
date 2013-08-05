var _    = require('underscore');
var Cell = require('./base');

var ResultCell = module.exports = Cell.extend({
  className: 'cell cell-result result-pending'
});

ResultCell.prototype.setResult = function (result) {
  var node = document.createTextNode(result);
  if (this._resultNode) {
    this.el.replaceChild(node, this._resultNode);
  } else {
    this.el.appendChild(node);
  }

  this._resultNode = node;
  this.el.classList.remove('result-error', 'result-pending');

  return this;
};

ResultCell.prototype.setError = function (error) {
  this.setResult(error); // Leave the object inspector to take care of rendering
  this.el.classList.add('result-error');
  return this;
};
