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
var executePlugin = function (data, next, done) {
  var code = 'with (window.console._notebookApi) {\n' + data.code + '\n}';

  /* jshint evil: true */
  data.context.eval('console._notebookApi.require = ' + loadScript);

  // Uses an asynchronous callback to clear the any possible stack trace
  // that would include implementation logic.
  // TODO: Augment the stack trace to remove any existing implementation logic.
  process.nextTick(function () {
    var exec = {};

    try {
      /* jshint evil: true */
      exec.result  = data.context.eval(code);
      exec.isError = false;
    } catch (error) {
      exec.result  = error;
      exec.isError = true;
    } finally {
      return done(null, exec);
    }
  });
};

/**
 * Attach sandbox related core middleware.
 *
 * @param  {Object} middleware
 */
module.exports = function (middleware) {
  middleware.core('sandbox:execute', executePlugin);
  middleware.core('sandbox:context', contextPlugin);
};
