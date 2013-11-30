/* global App */

/**
 * The notebook triggers a load id middleware event to get the starting id.
 *
 * @param {String}   id
 * @param {Function} next
 * @param {Function} done
 */
var configurePlugin = function (config, next) {
  if (!config.id) {
    config.id = window.location.hash.substr(1);
  }

  return next();
};

/**
 * The notebook will trigger an id sync middleware event when the id changes.
 *
 * @param {String}   id
 * @param {Function} next
 * @param {Function} done
 */
App.config.on('change:id', function (_, id) {
  window.location.hash = id == null ? '' : id;
});

/**
 * A user can use the forward and back buttons to navigate between notebooks.
 */
window.addEventListener('hashchange', function () {
  App.config.set('id',      window.location.hash.substr(1));
  App.config.set('url',     window.location.href);
  App.config.set('fullUrl', window.location.href);
});

/**
 * Export the plugin architecture for direct use.
 *
 * @type {Object}
 */
module.exports = {
  'application:config': configurePlugin
};
