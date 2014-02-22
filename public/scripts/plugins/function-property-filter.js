/* global App */
var _                = App.Library._;
var FILTER_PROPS     = ['!return', '!description'];
var RETURN_PROP      = FILTER_PROPS[0];
var DESCRIPTION_PROP = FILTER_PROPS[1];

/**
 * Filters `@return` from showing up in the inspector view.
 *
 * @param {Object}   data
 * @param {Function} next
 */
var inspectorFilterPlugin = function (data, next, done) {
  if (_.isFunction(data.parent) && _.contains(FILTER_PROPS, data.property)) {
    return done(null, false);
  }

  return next();
};

/**
 * Augments the completion context to take into account the return property.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var completionFunctionPlugin = function (data, next, done) {
  // Completes the return property in functions, when available.
  if (RETURN_PROP in data.context) {
    return done(null, data.context[RETURN_PROP]);
  }

  return next();
};

/**
 * Provide a hook for completing descriptions from the description property.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var completionDescribePlugin = function (data, next, done) {
  if (DESCRIPTION_PROP in data.context) {
    return done(null, data.context[DESCRIPTION_PROP]);
  }

  return next();
};

/**
 * A { key: function } map of all middleware used in the plugin.
 *
 * @type {Object}
 */
module.exports = {
  'inspector:filter':    inspectorFilterPlugin,
  'completion:function': completionFunctionPlugin,
  'completion:describe': completionDescribePlugin
};
