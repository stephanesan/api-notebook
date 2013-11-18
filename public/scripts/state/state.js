var _        = require('underscore');
var Backbone = require('backbone');
var messages = require('./messages');

/**
 * Extendable implementation of application state data. State can listen to the
 * global messaging object, but it should never listen the other way around.
 *
 * @type {Object}
 */
var state = module.exports = new Backbone.Model();

/**
 * Listen to resize events through the messages and update the current state.
 */
state.listenTo(messages, 'resize refresh', _.throttle(function () {
  state.set('viewportWidth',  window.innerWidth);
  state.set('viewportHeight', window.innerHeight);
  state.set('documentWidth',  document.documentElement.scrollWidth);
  state.set('documentHeight', document.documentElement.scrollHeight);
}, 100));
