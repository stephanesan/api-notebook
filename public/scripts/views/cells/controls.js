var HbsView = require('../hbs');
var ControlsModel = require('../../models/controls');

var ControlsView = module.exports = HbsView.extend({
  className: 'cell-controls',
  template: require('../../../templates/controls.hbs')
});

/**
 * Creates a new ControlsView. Takes an editorCell instance to control.
 *
 * @param {EditorCell} EditorCell  Instance of editorCell to control.
 */
ControlsView.prototype.initialize = function () {
  this.model = this.model || new ControlsModel();
};