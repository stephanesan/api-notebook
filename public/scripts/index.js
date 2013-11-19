require('./bootstrap');

/**
 * The main application is aliased to the `window` for external access.
 *
 * @type {Function}
 */
var App = module.exports = window.App = {};

// Exposes internally used libraries globally to avoid unneeded requests in
// third-party middleware and plugins.
App.Library = {
  url:         require('url'),
  path:        require('path'),
  crypto:      require('crypto'),
  querystring: require('querystring'),
  async:       require('async'),
  changeCase:  require('change-case'),
  Backbone:    require('backbone')
};

App._        = App.Library._ = require('underscore');
App.nextTick = process.nextTick;

// Exposes configuration details globally
App.state       = require('./state/state');
App.store       = require('./state/store');
App.config      = require('./state/config');
App.messages    = require('./state/messages');
App.middleware  = require('./state/middleware');
App.persistence = require('./state/persistence');
App.Sandbox     = require('./lib/sandbox');
App.PostMessage = require('./lib/post-message');


// Exposes CodeMirror to the world with our custom mods.
App.CodeMirror = {
  Editor:            CodeMirror,
  Completion:        require('./lib/completion'),
  sandboxCompletion: require('./lib/sandbox-completion')
};

// Expose all application views
App.View = {
  App:            require('./views/app'),
  View:           require('./views/view'),
  Notebook:       require('./views/notebook'),
  EditNotebook:   require('./views/edit-notebook'),
  Inspector:      require('./views/inspector'),
  ErrorInspector: require('./views/error-inspector'),
  Cell:           require('./views/cell'),
  CodeCell:       require('./views/code-cell'),
  TextCell:       require('./views/text-cell'),
  EditorCell:     require('./views/editor-cell'),
  ResultCell:     require('./views/result-cell'),
  CellButtons:    require('./views/cell-buttons'),
  CellControls:   require('./views/cell-controls')
};

// Expose application models.
App.Model = {
  Entry:     require('./models/cell'),
  CodeEntry: require('./models/code-cell'),
  TextEntry: require('./models/text-cell')
};

// Expose application collections.
App.Collection = {
  Notebook: require('./collections/notebook')
};

/**
 * Define a custom start method so that the application can bind middleware and
 * prepare state before we actually append the notebook which relies on some of
 * the middleware being available.
 *
 * @param {Function|Element} el
 * @param {Object}           [config]
 * @param {Function}         done
 */
App.start = function (el /*, options */, done) {
  var options = {};

  if (typeof done === 'object') {
    options = arguments[1];
    done    = arguments[2];
  }

  return App.middleware.trigger('application:start', options, function (err) {
    if (err) {
      return done && done(err);
    }

    var app = new App.View.App().render().appendTo(el);

    // Send a `rendered` event back to the parent frame when we are embedded.
    if (App.postMessage) {
      App.postMessage.trigger('rendered');
    }

    return App.middleware.trigger('application:ready', app, done);
  });
};
