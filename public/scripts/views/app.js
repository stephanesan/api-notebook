var _        = require('underscore');
var fs       = require('fs');
var Backbone = require('backbone');
var domify   = require('domify');

var View     = require('./view');
var Notebook = require('./notebook');
var messages = require('../lib/messages');

var App = module.exports = View.extend({
  className: 'application'
});

// Access a sandbox instance from tests
App.Sandbox     = require('../lib/sandbox');
App.PostMessage = require('../lib/post-message');

// Alias all the available views
App.View = {
  View:           require('./view'),
  Notebook:       require('./notebook'),
  Inspector:      require('./inspector'),
  ErrorInspector: require('./error-inspector'),
  Cell:           require('./cells/cell'),
  CodeCell:       require('./cells/code'),
  TextCell:       require('./cells/text'),
  EditorCell:     require('./cells/editor'),
  ResultCell:     require('./cells/result')
};

// Alias all the available models
App.Model = {
  Entry:     require('../models/entry'),
  CodeEntry: require('../models/code-entry'),
  TextEntry: require('../models/text-entry'),
  Gist:      require('../models/gist'),
  Session:   require('../models/session')
};

// Alias all the available collections
App.Collection = {
  Notebook: require('../collections/notebook')
};

App.prototype.events = {
  'click .modal-toggle':   'toggleShortcuts',
  'click .modal-backdrop': 'hideShortcuts',
  'click .notebook-exec':  'runNotebook',
  'click .notebook-fork':  'forkNotebook',
  'click .notebook-auth':  'authNotebook'
};

App.prototype.initialize = function (options) {
  var appRouter = new (Backbone.Router.extend({
    routes: {
      '':    'application',
      ':id': 'application'
    },
    application: _.bind(function (id) {
      this.setGist(new App.Model.Gist({ id: id }, { user: this.user }));
    }, this)
  }))();

  Backbone.history.start({
    root:      '/',
    pushState: false,
    silent:    true
  });

  // Listen to keyboard presses
  this.listenTo(Backbone.$(document), 'keydown', _.bind(function (e) {
    var ESC           = 27;
    var QUESTION_MARK = 191;

    if (e.which === QUESTION_MARK && e.shiftKey) {
      return this.toggleShortcuts();
    }

    if (e.which === ESC) {
      return this.hideShortcuts();
    }
  }, this));

  this.user = new App.Model.Session();
  this.user.fetch();

  this.listenTo(this.user, 'changeUser', this.updateUser);

  this.setupEmbeddableWidget();
};

App.prototype.remove = function () {
  Backbone.history.stop();
  window.onresize = null;
  View.prototype.remove.call(this);
};

App.prototype.updateUser = function () {
  var isNew   = this.user.isNew();
  var isOwner = this.notebook.isOwner();

  this.el.classList[isOwner  ? 'add' : 'remove']('user-is-owner');
  this.el.classList[!isOwner ? 'add' : 'remove']('user-not-owner');
  this.el.classList[isNew    ? 'add' : 'remove']('user-not-authenticated');
  this.el.classList[!isNew   ? 'add' : 'remove']('user-is-authenticated');

  // Adding some of these classes cause the container to resize.
  messages.trigger('resize');
};

App.prototype.showShortcuts = function () {
  this.el.classList.add('modal-visible');
};

App.prototype.hideShortcuts = function () {
  this.el.classList.remove('modal-visible');
};

App.prototype.toggleShortcuts = function () {
  if (this.el.classList.contains('modal-visible')) {
    this.hideShortcuts();
  } else {
    this.showShortcuts();
  }
};

App.prototype.setGist = function (gist) {
  // Remove any old notebook that might be hanging around
  if (this.notebook) {
    this.notebook.remove();
    this.stopListening(this.notebook.gist);
  }

  this.notebook = new App.View.Notebook({
    gist: gist,
    user: this.user
  });

  this.updateUser();
  this.notebook.render().appendTo(this.el);
  this.listenTo(gist, 'sync', this.updateUser);

  return this;
};

App.prototype.setupEmbeddableWidget = function () {
  if (!global.parent || global === global.parent) { return this; }

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

  // Send a message to the parent frame and let it know we are ready to accept
  // messages and data.
  postMessage.trigger('ready');

  // Listen to any resize triggers from the messages object and send the parent
  // frame our updated iframe size.
  messages.on('resize', _.debounce(function () {
    postMessage.trigger('height', doc.documentElement.scrollHeight);
  }, 50));
};

App.prototype.render = function () {
  View.prototype.render.call(this);

  this.el.appendChild(domify(
    fs.readFileSync(__dirname + '/../../templates/application.html')
  ));

  return this;
};

App.prototype.appendTo = function () {
  View.prototype.appendTo.apply(this, arguments);
  Backbone.history.loadUrl();

  this.onResize = window.onresize = function () {
    messages.trigger('resize');
  };

  this.onResize();
};

App.prototype.runNotebook = function () {
  this.notebook.execute();
  return this;
};

App.prototype.authNotebook = function () {
  // Assign a global variable since it's the only way for the popup to access
  // back to this scope
  window.authenticate = _.bind(function (err, user) {
    this.user.save(user);
    // Clean up after itself
    delete window.authenticate;
  }, this);

  var width  = 500;
  var height = 350;
  var left   = (window.screen.availWidth - width) / 2;

  window.open(
    '/auth/github', '',
    'left=' + left + ',top=100,width=' + width + ',height=' + height
  );
};

App.prototype.forkNotebook = function () {
  this.notebook.fork(_.bind(function (err, newGist) {
    this.setGist(newGist);
  }, this));
  return this;
};
