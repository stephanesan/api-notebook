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
 * Every time the style config changes, update the css.
 */
config.listenTo(config, 'change:style', (function () {
  var headEl  = document.head || document.getElementsByTagName('head')[0];
  var styleEl = headEl.appendChild(document.createElement('style'));

  return function (_, css) {
    styleEl.textContent = css;
  };
})());

/**
 * Listen for changes in the embedded config option and update conditional
 * styles.
 */
config.listenTo(config, 'embedded', function (_, embedded) {
  if (!embedded) {
    return document.body.replace(' notebook-embedded', '');
  }

  // Add a class name to identify embedded notebooks.
  return document.body.className += ' notebook-embedded';
});

/**
 * When the application is ready, start listening for live id changes.
 *
 * @param {Object}   app
 * @param {Function} next
 */
middleware.use('application:ready', function (app, next) {
  // Set the starting id since it has probably been set now.
  persistence.set('id', config.get('id'));

  /**
   * Listens for global id changes and updates persistence. Primarily for
   * loading a new notebook from the embed frame where the current url scheme
   * is unlikely to be maintained.
   */
  config.listenTo(config, 'change:id', function (_, id) {
    var persistId = persistence.get('id');
    persistence.set('id', id);
    return persistId === id || persistence.load();
  });

  /**
   * Trigger refreshes of the persistence layer when the contents change.
   */
  config.listenTo(config, 'change:contents', function () {
    persistence.set('id', '');
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
    return config.set('id', id);
  });

  return next();
});

/**
 * When the application is ready, finally attempt to load the initial content.
 *
 * @param {Object}   app
 * @param {Function} next
 */
middleware.use('application:ready', function (app, next) {
  return persistence.load(next);
});

/**
 * If we have contents set in the config object, we should use them as the
 * default load.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
middleware.use('persistence:load', function (data, next, done) {
  if (config.has('contents')) {
    data.contents = config.get('contents');
    return done();
  }

  return next();
});
