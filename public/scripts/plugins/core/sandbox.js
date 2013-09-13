var loadScript = require('load-script');

/**
 * Set the some additional context variables.
 *
 * @param  {Object}   context
 * @param  {Function} next
 */
var contextPlugin = function (context, next) {
  // Unfortunately it isn't as easy as this since we have lexical scoping issues
  // to the wrong window object. That would load the script in the wrong window.
  context.require = loadScript;

  return next();
};

/**
 * Sets up the pre-execution plugin.
 *
 * @param  {Object}   window
 * @param  {Function} next
 */
var executePlugin = function (window, next) {
  /* jshint evil: true */
  window.eval('console._notebookApi.require = ' + loadScript);

  return next();
};

/**
 * Attach sandbox related core middleware.
 *
 * @param  {Object} middleware
 */
module.exports = function (middleware) {
  middleware.core('sandbox:context', contextPlugin);
  middleware.core('sandbox:execute', executePlugin);
};
