/* global App */
var _               = App._;
var ramlParser      = require('raml-parser');
var clientGenerator = require('./lib/client-generator');
var fromPath        = require('../lib/from-path');

/**
 * Provided a special documentation property for functionsw with another plugin.
 *
 * @type {String}
 */
var DESCRIPTION_PROPERTY = '@description';

/**
 * Custom file reader for RAML specs.
 *
 * @param  {String}  url
 * @return {Q.defer}
 */
var injectedReader = new ramlParser.FileReader(function (url) {
  var deferred = this.q.defer();

  App.middleware.trigger('ajax', {
    url: url,
    headers: {
      'Accept': 'application/raml+yaml, */*'
    }
  }, function (err, xhr) {
    if (err) {
      return deferred.reject(err);
    }

    if (Math.floor(xhr.status / 100) !== 2) {
      return deferred.reject(
        new Error('Received status code ' + xhr.status + ' loading ' + url)
      );
    }

    return deferred.resolve(xhr.responseText);
  });

  return deferred.promise;
});

/**
 * The Api object is used in the execution context.
 *
 * @type {Object}
 */
var API = {};

/**
 * Responsible for loading RAML documents and return API clients.
 *
 * @param {String}   name
 * @param {String}   [url]
 * @param {Function} done
 */
API.createClient = function (name, url, done) {
  if (!_.isString(name)) {
    throw new Error('Provide a name for the generated client');
  }

  if (!_.isString(url)) {
    throw new Error('Provide a URL for the ' + name + ' RAML document');
  }

  App._executeContext.timeout(Infinity);
  done = done || App._executeContext.async();

  // Pass our url to the RAML parser for processing and transform the promise
  // back into a callback format.
  ramlParser.loadFile(url, { reader: injectedReader }).then(function (data) {
    var client;

    try {
      client = clientGenerator(data);
      fromPath(App._executeWindow, name.split('.'), client);
    } catch (e) {
      return done(e);
    }

    return done(null, client);
  }, done);
};

API.createClient[DESCRIPTION_PROPERTY] = {
  '!type': 'fn(alias: string, url: string, cb?: fn(error, client))',
  '!doc': [
    'Generate an API client from a RAML document and alias it on the window.'
  ].join(' ')
};

/**
 * Alter the context to include the RAML client generator.
 *
 * @param {Object}   data
 * @param {Function} next
 */
var contextPlugin = function (context, next) {
  context.API = API;

  return next();
};

/**
 * A { key: function } map of all middleware used in the plugin.
 *
 * @type {Object}
 */
module.exports = {
  'sandbox:context': contextPlugin
};
