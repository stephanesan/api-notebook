var DOMBars  = module.exports = require('dombars/runtime');
var Backbone = require('backbone');

/**
 * Register a custom get method for Backbone views.
 *
 * @param  {Object} obj
 * @param  {String} property
 * @return {*}
 */
DOMBars.get = function (obj, property) {
  if (obj instanceof Backbone.Model) {
    return obj.get(property);
  }

  return obj[property];
};

/**
 * Provide a subscription method for handling Backbone models.
 *
 * @param {Object}   obj
 * @param {String}   property
 * @param {Function} fn
 */
DOMBars.subscribe = function (obj, property, fn) {
  if (!(obj instanceof Backbone.Model)) { return; }

  obj.on('change:' + property, fn);
};

/**
 * Provide an unsubscribe method for removing Backbone model listeners.
 *
 * @param {Object}   obj
 * @param {String}   property
 * @param {Function} fn
 */
DOMBars.unsubscribe = function (obj, property, fn) {
  if (!(obj instanceof Backbone.Model)) { return; }

  obj.off('change:' + property, fn);
};

/**
 * Require all the helpers from the helpers directory.
 */
require('./helpers/view');
require('./helpers/equal');
