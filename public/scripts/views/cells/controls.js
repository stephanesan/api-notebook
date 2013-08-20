/*
  TODO:
  - Switch mode button should change label to "Swith to Text" /
    "Switch to Code" deopending on current mode.
  - Cancel hover event to make multi-cells work
*/

var Backbone      = require('backbone');
var View          = require('../view');
var ControlsModel = require('../../models/controls');

var ControlsView = module.exports = View.extend({
  className: 'cell-controls',
  events: {
    "click": "onClick"
  }
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
    // TODO move action to a data-attrib
    actionElStr = '<button class="action-' + action.name +
      '"><i class="icon-' + action.icon + ' icon-white"></i> ' + action.label +
      '</button>';
    // Parse HTML to DOM element and append to this view.
    self.el.appendChild(Backbone.$(actionElStr)[0]);
  });
};

/**
 * Event handler for clicks on control buttons. Pass thru for clicks on the
 * parent element.
 * @param {object} event  The normalized event object.
 */
ControlsView.prototype.onClick = function (event) {
  console.log(event);
  if (event.target === this.el) {
    return;
  }
  // TODO Handle new-case
  var action = event.target.className.replace(/action-/, '');
  var editorView = this.editorView;
  var viewFn = editorView[action];
  if (!viewFn) {
    return console.warn("No editorView action: " + action, editorView);
  } else {
    viewFn.call(editorView);
  }

};
