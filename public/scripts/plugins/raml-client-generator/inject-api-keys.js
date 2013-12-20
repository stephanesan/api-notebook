/* global App */
var _       = App._;
var apiKeys = process.env.plugins.ramlClient;

/**
 * Every OAuth1 token request we should merge our keys with theirs.
 *
 * @param {Object}   data
 * @param {Function} next
 */
App.middleware.register('ramlClient:oauth1', function (data, next) {
  _.extend(data, apiKeys.oauth1[data.authorizationUri]);
  return next();
});

/**
 * With every OAuth2 token request, we will merge our API keys over theirs.
 *
 * @param {Object}   data
 * @param {Function} next
 */
App.middleware.register('ramlClient:oauth2', function (data, next) {
  _.extend(data, apiKeys.oauth2[data.authorizationUri]);
  return next();
});
