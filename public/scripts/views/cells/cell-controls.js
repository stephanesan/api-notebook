/*
  TODO:
  - Rename to cell-controls
  - Switch mode button should change label to "Swith to Text" /
    "Switch to Code" deopending on current mode.
*/

var _                 = require('underscore');
var domify            = require('domify');
var Backbone          = require('backbone');
var View              = require('../view');
var CellControlsModel = require('../../models/cell-controls');

var ControlsView = module.exports = View.extend({
  className: 'cell-controls',
  events: {
    'mousedown': function (e) { e.stopPropagation(); },
    'click .action': 'onClick'
  }
});

/**
 * Creates a new ControlsView. Takes an editorCell instance to control.
 *
 * @param {EditorCell} EditorCell  Instance of editorCell to control.
 */
ControlsView.prototype.initialize = function () {
  this.model = this.model || new CellControlsModel();
};

/**
 * Toggles the control to be appended or removed from a view. If the control
 * is already appended to the passed in view, it is simply removed from the
 * view; otherwise the control is appended to the view.
 *
 * @param {View} view  The view to append to or remove from.
 */
ControlsView.prototype.toggleView = function (view) {
  var toggleOn = (this.editorView !== view);

  this.detach();

  if (toggleOn) {
    this.editorView = view;
    this.appendTo(view.el);
  }
};

ControlsView.prototype.detach = function () {
  if (this.editorView) {
    this.el.parentNode.removeChild(this.el);
  }
  delete this.editorView;
};

ControlsView.prototype.render = function () {
  var html = _.map(this.model.actions, function (action) {
    var button = '<button class="action" data-action="' + action.name + '">';
    button += action.label + '<span>' + action.keyCode + '</span></button>';
    return button;
  }).join('\n');
  this.el.appendChild(domify(html));

  var onBlur = _.bind(this.detach, this);
  this.listenTo(Backbone.$(document), 'mousedown',  onBlur);
  this.listenTo(Backbone.$(document), 'touchstart', onBlur);

  this.listenTo(Backbone.$(document), 'keydown', _.bind(function (e) {
    var ESC = 27;

    if (e.which === ESC) {
      return this.detach();
    }
  }, this));

  return this;
};

/**
 * Event handler for clicks on control buttons. Pass thru for clicks on the
 * parent element.
 * @param {object} e The normalized event object.
 */
ControlsView.prototype.onClick = function (e) {
  var action     = e.target.getAttribute('data-action');
  var editorView = this.editorView;
  var viewFn     = editorView[action];

  if (typeof viewFn === 'function') {
    viewFn.call(editorView);
  }

  this.detach();
};
