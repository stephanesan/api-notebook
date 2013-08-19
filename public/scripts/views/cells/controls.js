/*
  TODO: Switch mode button should change label to "Swith to Text" /
  "Switch to Code" deopending on current mode.
*/

var Backbone      = require('backbone');
var View          = require('../view');
var ControlsModel = require('../../models/controls');

var ControlsView = module.exports = View.extend({
  className: 'cell-controls'
});

/**
 * Creates a new ControlsView. Takes an editorCell instance to control.
 *
 * @param {EditorCell} EditorCell  Instance of editorCell to control.
 */
ControlsView.prototype.initialize = function () {
  this.model = this.model || new ControlsModel();
};

ControlsView.prototype.render = function () {
  var actionElStr;
  var self = this;
  this.model.actions.forEach(function (action) {
    console.log(action);
    actionElStr = '<button class="action-' + action.name +
      '"><i class="icon-' + action.icon + ' icon-white"></i> ' + action.label +
      '</button>';
    // Parse HTML to DOM element and append to this view.
    self.el.appendChild(Backbone.$(actionElStr)[0]);
  });
};