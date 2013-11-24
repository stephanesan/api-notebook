var _          = require('underscore');
var Backbone   = require('backbone');
var View       = require('./template');
var template   = require('../../templates/views/cell-controls.hbs');
var middleware = require('../state/middleware');
var controls   = require('../lib/controls').editor;

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

ControlsView.prototype.template = template;

/**
 * Render the controls overlay.
 *
 * @return {ControlsView}
 */
ControlsView.prototype.render = function () {
  View.prototype.render.call(this);

  // Any events on the document view should cause focus to be lost.
  var onBlur    = _.bind(this.remove, this);
  var $document = Backbone.$(document);
  this.listenTo($document, 'mousedown',  onBlur);
  this.listenTo($document, 'touchstart', onBlur);

  var keydownMiddleware = middleware.register(
    'keydown:Esc', _.bind(function (event, next, done) {
      this.remove();
      return done();
    }, this)
  );

  this.listenTo(this, 'remove', function () {
    middleware.deregister('keydown:Esc', keydownMiddleware);
  });

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
  return this.remove();
};
