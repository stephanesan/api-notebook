var Backbone = require('backbone');
var bounce   = require('../lib/bounce');

/**
 * Configuration is a static backbone model that we listen to for changes in
 * application setup.
 *
 * @type {Object}
 */
var config = module.exports = new Backbone.Model({
  url:       window.location.href,
  fullUrl:   process.env.NOTEBOOK_URL,
  siteUrl:   process.env.NOTEBOOK_URL,
  siteTitle: process.env.NOTEBOOK_TITLE
});

/**
 * Every time the style config changes, update the css.
 */
config.listenTo(config, 'change:style', (function () {
  var headEl  = document.head || document.getElementsByTagName('head')[0];
  var styleEl = headEl.appendChild(document.createElement('style'));

  return bounce(function () {
    styleEl.textContent = config.get('style');
  });
})());

/**
 * Listen for changes in the embedded config option and update conditional
 * styles.
 */
config.listenTo(config, 'change:embedded', bounce(function () {
  var bodyEl     = document.body;
  var isEmbedded = config.get('embedded');

  // Update other configuration options.
  config.set('footer',       isEmbedded);
  config.set('header',       !isEmbedded);
  config.set('sidebar',      !isEmbedded);
  config.set('savable',      !isEmbedded);
  config.set('codeEditable', true);
  config.set('textEditable', !isEmbedded);

  if (isEmbedded) {
    return bodyEl.className += ' notebook-embedded';
  }

  return bodyEl.className = bodyEl.className.replace(' notebook-embedded', '');
}));
