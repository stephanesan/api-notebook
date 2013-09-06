// Bootstrap any required functionality before launching the application
require('./bootstrap');

// Alias the main app to the window for testing
var App = window.App = require('./views/app');

App._          = require('underscore');
App.Backbone   = require('backbone');

App.state       = require('./state/state');
App.router      = require('./state/router');
App.messages    = require('./state/messages');
App.middleware  = require('./state/middleware');
App.persistence = require('./state/persistence');

App.Sandbox     = require('./lib/sandbox');
App.PostMessage = require('./lib/post-message');

App.CodeMirror = {
  Editor:     CodeMirror, // Programatically create an editor in tests
  Completion: require('./lib/completion')
};

App.View = {
  View:           require('./views/view'),
  Notebook:       require('./views/notebook'),
  Inspector:      require('./views/inspector'),
  ErrorInspector: require('./views/error-inspector'),
  Cell:           require('./views/cell'),
  CodeCell:       require('./views/code-cell'),
  TextCell:       require('./views/text-cell'),
  EditorCell:     require('./views/editor-cell'),
  ResultCell:     require('./views/result-cell'),
  CellControls:   require('./views/cell-controls'),
};

App.Model = {
  Entry:     require('./models/cell'),
  CodeEntry: require('./models/code-cell'),
  TextEntry: require('./models/text-cell')
};

App.Collection = {
  Notebook: require('./collections/notebook')
};

/**
 * Set up the initial application state. This could be synchronous (accessing
 * the page directly) or asynchronous (embeddable widget).
 *
 * @param  {Function} done
 */
var prepareState = function (done) {
  if (!global.parent || global === global.parent) {
    return done();
  }

  var doc         = global.document;
  var base        = doc.getElementsByTagName('base')[0];
  var postMessage = new App.PostMessage(global.parent);

  // Set the base url for opening links from the iframe in the parent frame.
  postMessage.on('referrer', function (href) {
    if (base) { base.parentNode.removeChild(base); }

    base = doc.createElement('base');
    base.setAttribute('href', href);
    base.setAttribute('target', '_parent');
    (doc.head || doc.getElementsByTagName('head')[0]).appendChild(base);
  });

  // Allow passing through default content in the case that loading an id fails
  // or no id was passed through to begin with.
  postMessage.on('content', function (content) {
    App.persistence.set('defaultContent', content);
  }, this);

  // Allow passing of variables between the parent window and child frame.
  postMessage.on('alias', function (key, value) {
    global[key] = value;
  });

  // Allow grabbing a variable from the iframe and passing back to the parent.
  postMessage.on('export', function (key) {
    postMessage.trigger('export', key, global[key]);
  });

  // Listen to any resize triggers from the messages object and send the parent
  // frame our updated iframe size.
  App.state.on('change:window.scrollHeight', function (_, height) {
    postMessage.trigger('height', height);
  });

  postMessage.on('ready', function () {
    done();
  });

  // Send a message to the parent frame and let it know we are ready to accept
  // messages and data.
  postMessage.trigger('ready');
};

/**
 * Define a custom start method so that the application can bind middleware and
 * prepare state before we actually append the notebook which relies on some of
 * the middleware being available.
 *
 * @param  {Function|Element} el
 */
App.start = function (el, done) {
  return prepareState(function (err) {
    done(err, new App().render().appendTo(el));
  });
};

// Attach core plugins
require('./plugins/core/completion')(App.middleware);
require('./plugins/core/result-cell')(App.middleware);
require('./plugins/core/markdown-serialization')(App.middleware);

// Currently for testing, we'll implement persistence alongside the localStorage
// plugin. This allows me to test whether the functionality actually works.
require('./plugins/addons/localstorage-persistence').attach(App.middleware);
