var PROXY_URL = '/proxy';

/**
 * Augment the ajax middleware with proxy urls when we make requests to a
 * recognised API endpoint.
 *
 * @param  {Object}   data
 * @param  {Function} next
 */
var ajaxPlugin = function (data, next) {
  data.url = PROXY_URL + '/' + encodeURIComponent(data.url);
  return next();
};

/**
 * Attaches the relevant middleware for the plugin.
 *
 * @param {Object} middleware
 */
exports.attach = function (middleware) {
  middleware.use('ajax', ajaxPlugin);
};

/**
 * Detach any middleware added by the plugin.
 *
 * @param {Object} middleware
 */
exports.detach = function (middleware) {
  middleware.disuse('ajax', ajaxPlugin);
};
