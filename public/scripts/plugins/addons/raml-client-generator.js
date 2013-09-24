/* global App */
var ramlParser      = require('raml-parser');
var clientGenerator = require('./lib/client-generator');

/**
 * Simple map for requesting a predefined RAML document.
 *
 * @type {Object}
 */
var specMap = {
  'github': process.env.NOTEBOOK_URL + '/raml/github-v3/api-single.yml'
};

/**
 * Simple map for tracking the return URLs against spec names. Allows names to
 * be overriden at any point and still load up the generated client.
 *
 * @type {Object}
 */
var apiMap = {};

/**
 * Responsible for loading RAML documents and return API clients.
 *
 * @param {String}   name
 * @param {String}   [url]
 * @param {Function} done
 */
var Api = function (name /*, url */, done) {
  var url = specMap[name];

  // Allows overloading the middle parameter with a url for the RAML loader.
  if (arguments.length > 1 && typeof arguments[1] !== 'function') {
    url  = specMap[name] = arguments[1];
    done = arguments[2];
  }

  App._executeContext.timeout(Infinity);
  done = done || App._executeContext.async();

  // Skip loading the document if the name and URL has already been processed.
  if (specMap[name] === apiMap[name]) {
    return process.nextTick(function () {
      return done(null, Api[name]);
    });
  }

  // Pass our url to the RAML parser for processing and transform the promise
  // back into a callback format.
  ramlParser.loadFile(url).then(function (data) {
    try {
      apiMap[name] = url;
      Api[name]    = clientGenerator(data);
    } catch (e) {
      return done(e);
    }

    return done(null, Api[name]);
  }, function (err) {
    return done(err);
  });
};

/**
 * Alter the context to include the RAML client generator.
 *
 * @param  {Object}   data
 * @param  {Function} next
 */
var contextPlugin = function (context, next) {
  context.Api = Api;

  return next();
};

/**
 * A { key: function } map of all middleware used in the plugin.
 *
 * @type {Object}
 */
var plugins = {
  'sandbox:context': contextPlugin
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
