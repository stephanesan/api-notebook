var Backbone = require('backbone');
var messages = require('./messages');

/**
 * Extendable implementation of application state data. State can listen to the
 * global messaging object, but it should never listen the other way around.
 *
 * @type {Object}
 */
var state = module.exports = new (Backbone.Model.extend())();

var updateScrollDimensions = function () {
  state.set('documentWidth',  document.documentElement.scrollWidth);
  state.set('documentHeight', document.documentElement.scrollHeight);
};

var updateWindowDimensions = function () {
  var width  = window.innerWidth;
  var height = window.innerHeight;

  state.set('viewportWidth',  width);
  state.set('viewportHeight', height);

  return updateScrollDimensions();
};

updateWindowDimensions();
state.listenTo(messages, 'resize',        updateScrollDimensions);
state.listenTo(messages, 'window:resize', updateWindowDimensions);
