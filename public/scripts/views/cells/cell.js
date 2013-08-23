var View = require('../view');
var BtnCellControls = require('./btn-cell-controls');

var CellView = module.exports = View.extend({
  className: 'cell'
});

CellView.prototype.render = function () {
  // Every cell has a controls-menu button
  this.btnCellControls = new BtnCellControls({ parent: this });
  this.btnCellControls.render().appendTo(this.el);
};
