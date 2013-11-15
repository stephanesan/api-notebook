var _        = require('underscore');
var domify   = require('domify');
var Backbone = require('backbone');
var View     = require('./view');
var controls = require('../lib/controls').editor;

/**
 * Displays the cell controls overlay menu.
 *
 * @type {Function}
 */
var ControlsView = module.exports = View.extend({
  className: 'cell-controls',
  events: {
    'mousedown .action':  'onClick',
    'touchstart .action': 'onClick'
  }
});

/**
 * Keep an array of controls to display.
 *
 * @type {Array}
 */
ControlsView.controls = _.filter(controls, function (control) {
  return _.contains(
    ['moveUp', 'moveDown', 'switch', 'clone', 'remove', 'appendNew'],
    control.command
  );
});

/**
 * Render the controls overlay.
 *
 * @return {ControlsView}
 */
ControlsView.prototype.render = function () {
  View.prototype.render.call(this);

  // Transform the controls array into a DOM list and append to the view.
  var html = _.map(this.constructor.controls, function (action) {
    return [
      '<button class="action" data-action="' + action.command + '">',
      action.label + '<span>' + action.keyCode + '</span>',
      '</button>'
    ].join('');
  }).join('\n');
  this.el.appendChild(domify(html));

  // Any events on the regular document should cause focus to be lost.
  var onBlur    = _.bind(this.remove, this);
  var $document = Backbone.$(document);

  this.listenTo($document, 'mousedown',  onBlur);
  this.listenTo($document, 'touchstart', onBlur);

  this.listenTo($document, 'keydown', _.bind(function (e) {
    var ESC = 27;

    if (e.which === ESC) {
      return this.remove();
    }
  }, this));

  return this;
};

/**
 * Event handler for clicks on control buttons. Pass thru for clicks on the
 * parent element.
 *
 * @param {object} e The normalized event object.
 */
ControlsView.prototype.onClick = function (e) {
  var target = e.target.tagName === 'SPAN' ? e.target.parentNode : e.target;

  this.trigger('action', this, target.getAttribute('data-action'));
  this.remove();
};
