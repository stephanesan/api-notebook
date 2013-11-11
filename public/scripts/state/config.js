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
  return persistence.set('id', id);
});

/**
 * Listens for any changes of the persistence id. When it changes, we need to
 * navigate to the updated url.
 *
 * @param {Object} _
 * @param {String} id
 */
config.listenTo(persistence, 'change:id', function (_, id) {
  var cid    = config.get('id');
  var state  = persistence.get('state');
  var silent = state === persistence.SAVING || state === persistence.CLONING;

  // Don't trigger reloads if the id has not really changed.
  silent = silent || (id == null || id === '') && (cid == null || cid === '');

  config.set('id', id);
  return !silent && persistence.load();
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
