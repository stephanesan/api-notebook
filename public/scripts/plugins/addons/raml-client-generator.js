/* global App */
var ramlParser      = require('raml-parser');
var clientGenerator = require('./lib/client-generator');

/**
 * Simple map for requesting a predefined RAML document.
 * TODO: Enable injecting additional maps and decouple from the server.
 *
 * @type {Object}
 */
var specMap = {
  worldMusic: process.env.NOTEBOOK_URL + '/raml/world-music.yml'
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

  // Allows overloading the middle parameter with a url to load the RAML
  // document from.
  if (arguments.length > 1 && typeof arguments[1] !== 'function') {
    url  = specMap[name] = arguments[1];
    done = arguments[2];
  }

  // Allows the request to run for as long as it needs.
  App._executeContext.timeout = Infinity;

  // Allow a custom callback to be passed in, otherwise we should use the
  // current cells async execution function.
  done = done || App._executeContext.async();

  // Bypass reloading a RAML document if the name and URL already matches a
  // loaded and generated client.
  if (specMap[name] === apiMap[name]) {
    return process.nextTick(function () {
      return done(null, Api[name]);
    });
  }

  // Pass our url to the RAML parser for processing.
  ramlParser.loadFile(url).then(function (data) {
    apiMap[name] = url;
    Api[name]    = clientGenerator(data);
    return done(null, Api[name]);
  }, function (error) {
    return done(error);
  });
};

/**
 * Alter the context to include the RAML client generator.
 *
 * @param  {Object}   data
 * @param  {Function} next
 */
var contextPlugin = function (context, next) {
  // Alias the `Api` function.
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
