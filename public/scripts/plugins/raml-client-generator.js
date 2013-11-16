/* global App */
var _               = App._;
var Backbone        = App.Library.Backbone;
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
var createReader = function (config) {
  return new ramlParser.FileReader(function (url) {
    var deferred = this.q.defer();

    App.middleware.trigger('ajax', {
      url: url,
      proxy: config.proxy,
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
};

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
API.createClient = function (name, url, config, done) {
  if (!_.isString(name)) {
    throw new Error('Provide a name for the generated client');
  }

  if (!_.isString(url)) {
    throw new Error('Provide a URL for the ' + name + ' RAML document');
  }

  // Allow the config object to be skipped.
  if (typeof config === 'function') {
    done   = arguments[2];
    config = {};
  }

  App._executeContext.timeout(Infinity);
  done   = done   || App._executeContext.async();
  config = config || {};

  // Pass our url to the RAML parser for processing and transform the promise
  // back into a callback format.
  ramlParser.loadFile(url, {
    reader: createReader(config)
  }).then(function (data) {
    var client;

    try {
      client = clientGenerator(data, config);
      fromPath(App._executeWindow, name.split('.'), client);
    } catch (e) {
      return done(e);
    }

    return done(null, client);
  }, done);
};

API.createClient[DESCRIPTION_PROPERTY] = {
  '!type': 'fn(' + [
    'alias: string',
    'url: string',
    'config?: { proxy: boolean }',
    'cb?: fn(error, client)'
  ].join(', ') + ')',
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

/**
 * [loadAPIDefinitions description]
 * @param  {Function} done [description]
 * @return {[type]}        [description]
 */
var loadAPIDefinitions = function (done) {
  return App.middleware.trigger('ajax', {
    url: 'http://api.apihub.com/v1/apis?specFormat=RAML'
  }, function (err, xhr) {
    return done(err, JSON.parse(xhr.responseText).items);
  });
};

/**
 * Show RAML definitions to users in a modal, and upon selection pass the
 * selected definition back to the callback.
 *
 * @param {Function} done
 */
var selectAPIDefinition = function (done) {
  var selected = false;

  return App.middleware.trigger('ui:modal', {
    title: 'Insert an API Client',
    content: function (done) {
      return loadAPIDefinitions(function (err, items) {
        if (err) { return done(err); }

        return done(null, '<div class="modal-instructions">' +
          'Insert an API client from a RAML specification.' +
          ' <a href="http://raml.org/" target="_blank">' +
          'Learn more about RAML</a>.' +
          '</div>' +
          '<ul class="item-list">' +
          _.map(items, function (item) {
          var name = App.Library.changeCase.camelCase(item.title);
          var url  = item.specs.RAML.url;
          var link = [
            '<a href="#" class="btn btn-primary btn-small"',
            'data-raml="' + url + '" data-name="' + name + '">',
            'Add',
            '</a>'
          ].join('');

          return '<li>' +
            '<div class="item-action">' + link + '</div>' +
            '<div class="item-description">' +
            item.title + ' | details </div>' +
            '<div style="display:none;">' +
            item.description +
             '</div>' +
            '</li>';
        }).join('') + '</li>');
      });
    },
    show: function (modal) {
      Backbone.$(modal.el).on('click', '[data-raml]', function (e) {
        e.preventDefault();

        // Close the modal behind ourselves.
        modal.close();

        return done(null, {
          name: e.target.getAttribute('data-name'),
          url:  e.target.getAttribute('data-raml')
        });
      });
    }
  }, function (err) {
    return selected && done(err);
  });
};

/**
 * Inserts a new code cell above with a RAML API client and executes it.
 */
App.View.EditorCell.prototype.newRAMLAbove = function () {
  return selectAPIDefinition(_.bind(function (err, api) {
    this.notebook.prependCodeView(
      this.el, 'API.createClient("' + api.name + '", "' + api.url + '");'
    ).execute();

    this.focus();
  }, this));
};

/**
 * Inserts a new code cell below with a RAML API client and executes it.
 */
App.View.EditorCell.prototype.newRAMLBelow = function () {
  return selectAPIDefinition(_.bind(function (err, api) {
    this.notebook.appendCodeView(
      this.el, 'API.createClient("' + api.name + '", "' + api.url + '");'
    ).execute();

    this.focus();
  }, this));
};

/**
 * Insert a RAML document using the cell buttons.
 *
 * @type {String}
 */
App.View.CellButtons.controls.push({
  label:   'Insert API Client',
  command: 'newRAML'
});
