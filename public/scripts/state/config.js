var Backbone    = require('backbone');
var middleware  = require('./middleware');
var persistence = require('./persistence');

/**
 * Configuration is a static backbone model that we listen to for changes in
 * application setup.
 *
 * @type {Object}
 */
var config = module.exports = new Backbone.Model({
  url: window.location.href
});

/**
 * Listens for global id changes and updates persistence. Primarily for loading
 * a new notebook from the embed frame where the current url scheme is unlikely
 * to be maintained.
 */
config.listenTo(config, 'change:id', function (_, id) {
  persistence.set('id', id);
  return persistence.load();
});

/**
 * Listens for any changes of the persistence id. When it changes, we need to
 * navigate to the updated url.
 *
 * @param {Object} _
 * @param {String} id
 */
config.listenTo(persistence, 'change:id', function (_, id) {
  return config.set('id', id, { silent: true });
});

/**
 * When the application is ready, start loading the initial content.
 *
 * @param {Object}   app
 * @param {Function} next
 */
middleware.use('application:ready', function (app, next) {
  return persistence.load(next);
});
