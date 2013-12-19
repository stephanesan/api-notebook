var Backbone = require('backbone');
var bounce   = require('../lib/bounce');

/**
 * Configuration is a static backbone model that we listen to for changes in
 * application setup.
 *
 * @type {Object}
 */
var config = module.exports = new Backbone.Model({
  // The url is the embedding frame url.
  url:                window.location.href,
  // The full url is the url that the full application is available at.
  fullUrl:            process.env.application.url,
  // Site url is the sponsoring site location without any ids.
  siteUrl:            process.env.application.url,
  // The site title is the name of the sponsoring site.
  siteTitle:          process.env.application.title,
  header:             true,
  footer:             false,
  sidebar:            true,
  savable:            true,
  textReadOnly:       false,
  codeReadOnly:       false,
  authenticateText:   'Authenticate',
  unauthenticateText: 'Unauthenticate'
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
  var isEmbedded = config.get('embedded');

  // Iterate over the updates object and update options that have not been set.
  if (isEmbedded != null) {
    config.set({
      footer:       isEmbedded,
      header:       !isEmbedded,
      sidebar:      !isEmbedded,
      savable:      !isEmbedded,
      textReadOnly: !isEmbedded
    });
  }

  var className = document.body.className.replace(' notebook-embedded', '');

  // If the notebook is embedded add the embedded class.
  if (isEmbedded) {
    document.body.className = className + ' notebook-embedded';
  }
}));
