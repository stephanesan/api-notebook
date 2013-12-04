var _         = require('underscore');
var Backbone  = require('backbone');
var domListen = require('../lib/dom-listen');

/**
 * Very simple implementation of a message bus that can be used anywhere within
 * the application.
 *
 * @type {Object}
 */
var messages = module.exports = _.extend({}, Backbone.Events);

/**
 * Proxy resize events to the current state.
 */
messages.listenTo(domListen(window), 'resize', function () {
  messages.trigger('resize');
});
