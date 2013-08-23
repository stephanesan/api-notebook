var _      = require('underscore');
var Events = require('backbone').Events;

/**
 * Very simple implementation of a message bus that can be used anywhere within
 * the application.
 *
 * @type {Object}
 */
module.exports = _.extend({}, Events);
