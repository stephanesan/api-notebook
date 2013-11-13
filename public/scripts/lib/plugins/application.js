/* global App */
var _           = require('underscore');
var async       = require('async');
var loadScript  = require('../browser/load-script');
var state       = require('../../state/state');
var config      = require('../../state/config');
var messages    = require('../../state/messages');
var middleware  = require('../../state/middleware');
var PostMessage = require('../post-message');

/**
 * The first middleware for application start has to be the parent frame set up.
 *
 * @param {Object}   options
 * @param {Function} next
 */
middleware.use('application:start', function (options, next) {
  // Skip middleware execution if we are the parent frame.
  if (window === window.parent) { return next(); }

  var postMessage = App.postMessage = new PostMessage(window.parent);

  // Listen for changes in the height of the document and update the parent.
  state.on('change:documentHeight', function (_, height) {
    postMessage.trigger('height', height);
  });

  // Listen for any changes to the current url and update the target.
  postMessage.listenTo(config, 'change:url', (function () {
    var headEl = document.head || document.getElementsByTagName('head')[0];
    var baseEl = document.getElementsByTagName('base')[0];

    return function (_, url) {
      if (baseEl) { baseEl.parentNode.removeChild(baseEl); }

      baseEl = document.createElement('base');
      baseEl.setAttribute('href',   url);
      baseEl.setAttribute('target', '_parent');
      headEl.appendChild(baseEl);
    };
  })());

  // Listen for the parent frame to say its ready and pass use additional config
  // options.
  postMessage.on('ready', function (parentOptions) {
    _.extend(options, parentOptions);
    return next();
  });

  // Run arbitrary code inside the frame by passed an evil string in.
  postMessage.on('exec', function (evil) {
    /* jshint evil: true */
    postMessage.trigger('exec', window.eval(evil));
  });

  // Listen to any configuration changes.
  postMessage.on('config', function () {
    config.set.apply(config, arguments);
  });

  // Trigger cross-frame messages.
  postMessage.on('message', function () {
    messages.trigger.apply(messages, arguments);
  });

  // Trigger config changes back to the parent frame.
  postMessage.listenTo(config, 'all', function (name, model, value) {
    if (name.substr(0, 7) !== 'change:') { return; }

    postMessage.trigger('config:' + name.substr(7), value);
  });

  // Let the parent window know we are ready to receive.
  postMessage.trigger('ready');
});

/**
 * If we are passed a default content object we should use it.
 *
 * @param {Object}   options
 * @param {Function} next
 */
middleware.use('application:start', function (options, next) {
  if (!options.contents) { return next(); }

  middleware.use('persistence:load', function (data, next, done) {
    data.contents = options.contents;
    return done();
  });

  return next();
});

/**
 * Load all injected script options.
 *
 * @param {Object}   options
 * @param {Function} next
 */
middleware.use('application:start', function (options, next) {
  return async.each(options.inject || [], loadScript, function () {
    next();
  });
});

/**
 * Alias any optional global variables passed in.
 *
 * @param {Object}   options
 * @param {Function} next
 */
middleware.use('application:start', function (options, next) {
  _.each(options.alias || {}, function (value, key) {
    window[key] = value;
  });

  return next();
});

/**
 * Execute arbitrary passed in scripts.
 *
 * @param {Object}   options
 * @param {Function} next
 */
middleware.use('application:start', function (options, next) {
  /* jshint evil: true */
  window.eval(options.exec || '');
  return next();
});

/**
 * Update the config object with the optional passed in config.
 *
 * @param {Object}   options
 * @param {Function} next
 */
middleware.use('application:start', function (options, next) {
  var configs = options.config || {};

  middleware.trigger('application:config', configs, function (err, configs) {
    config.set(configs);
    return next();
  });
});
