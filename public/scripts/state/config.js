var _          = require('underscore');
var Backbone   = require('backbone');
var middleware = require('./middleware');

/**
 * Configuration is a static backbone model that we listen to for changes in
 * application setup.
 *
 * @type {Object}
 */
var config = module.exports = new Backbone.Model();

/**
 * Updates a base url tag when the referrer id changes.
 */
config.listenTo(config, 'change:referrer', (function () {
  var base = document.getElementsByTagName('base')[0];
  var head = document.head || document.getElementsByTagName('head')[0];

  return function (_, referrer) {
    if (base) { base.parentNode.removeChild(base); }

    base = document.createElement('base');
    base.setAttribute('href', referrer);
    base.setAttribute('target', '_parent');
    head.appendChild(base);
  };
})());

/**
 * Listen to requests to start a new notebook and use the content from the
 * config object.
 *
 * @param  {Object}   data
 * @param  {Function} next
 * @param  {Function} done
 */
middleware.use('persistence:load', function (data, next, done) {
  if (config.has('content')) {
    data.contents = config.get('content');
    return done();
  }

  return next();
});

/**
 * Listens to updates on the alias config and aliases the global variables.
 *
 * @param  {Object} model
 * @param  {Object} alias
 */
config.listenTo(config, 'change:alias', function (model, alias) {
  // Removes previous globals
  _.each(model.previousAttributes().alias, function (_, key) {
    delete global[key];
  });

  _.each(alias, function (value, key) {
    global[key] = value;
  });
});

/**
 * Listens for execution content and eval it.
 */
config.listenTo(config, 'change:exec', function (_, evil) {
  /* jshint evil: true */
  window.eval(evil);
});
