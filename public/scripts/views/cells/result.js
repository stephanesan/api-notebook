var _    = require('underscore');
var Cell = require('./base');

var ResultCell = module.exports = Cell.extend({
  className: 'cell cell-result result-pending'
});

ResultCell.prototype.render = function () {
  Cell.prototype.render.call(this);

  this._resultNode = document.createTextNode('');
  this.el.appendChild(this._resultNode);

  return this;
};

ResultCell.prototype.setResult = function (result) {
  var node = document.createTextNode(result);
  this._resultNode.parentNode.replaceChild(node, this._resultNode);
  this._resultNode = node;

  this.el.classList.remove('result-pending');

  return this;
};

ResultCell.prototype.setError = function (error) {
  this.setResult(error.message);
  return this;
};
