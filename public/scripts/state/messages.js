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
messages.listenTo(domListen(window), 'resize', function (e) {
  /**
   * Every time the window triggers a resize, stop it from propagating so
   * CodeMirror doesn't recalculate itself.
   *
   * TODO: Work out why CodeMirror does this and it sucks so much processing
   * powering. For reference, wrapping try..catch quadruples execution time and
   * additional unnecessary resize events are being triggered from the parent
   * window adjusting the iframe size.
   */
  e.stopImmediatePropagation();

  // Trigger a resize message to the parent frame.
  messages.trigger('resize');
});
