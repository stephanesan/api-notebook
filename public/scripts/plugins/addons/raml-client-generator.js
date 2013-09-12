var raml = require('raml-parser');

// TODO: Remove global.
window.raml = raml;

/**
 * A { key: function } map of all middleware used in the plugin.
 *
 * @type {Object}
 */
var plugins = {
};

/**
 * Attach the middleware to the application.
 *
 * @param {Object} middleware
 */
exports.attach = function (middleware) {
  for (var key in plugins) {
    if (plugins.hasOwnProperty(key)) {
      middleware.use(key, plugins[key]);
    }
  }
};

/**
 * Detaches the middleware from the application. Useful during tests.
 *
 * @param {Object} middleware
 */
exports.detach = function (middleware) {
  for (var key in plugins) {
    if (plugins.hasOwnProperty(key)) {
      middleware.disuse(key, plugins[key]);
    }
  }
};
