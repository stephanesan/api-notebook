var ARGUMENTS_PROP = '@arguments';

/**
 * Filters `@arguments` from showing up in the inspector view.
 *
 * @param {Object}   data
 * @param {Function} next
 */
var inspectorFilterPlugin = function (data, next, done) {
  if (typeof data.parent === 'function' && data.property === ARGUMENTS_PROP) {
    return done(null, false);
  }

  return next();
};

/**
 * Augments the completion function with arguments.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var completionArgumentsPlugin = function (data, next, done) {
  // Completes the return property in functions, when available.
  if (ARGUMENTS_PROP in data.fn) {
    return done(null, data.fn[ARGUMENTS_PROP]);
  }

  return next();
};

/**
 * A { key: function } map of all middleware used in the plugin.
 *
 * @type {Object}
 */
var plugins = {
  'inspector:filter':     inspectorFilterPlugin,
  'completion:arguments': completionArgumentsPlugin
};

/**
 * Attach the middleware to the application.
 *
 * @param {Object} middleware
 */
exports.attach = function (middleware) {
  middleware.use(plugins);
};

/**
 * Detaches the middleware from the application. Useful during tests.
 *
 * @param {Object} middleware
 */
exports.detach = function (middleware) {
  middleware.disuse(plugins);
};
