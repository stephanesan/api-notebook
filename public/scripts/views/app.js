var _        = require('underscore');
var Backbone = require('backbone');

var View     = require('./hbs');
var Notebook = require('./notebook');

// Alias `App` to `window` for testing purposes
var App = module.exports = View.extend({
  className: 'application',
  template: require('../../templates/application.hbs')
});

// Access a sandbox instance from tests
App.Sandbox = require('../lib/sandbox');

// Alias all the available views
App.View = {
  View:       require('./view'),
  Hbs:        require('./hbs'),
  Notebook:   require('./notebook'),
  Inspector:  require('./inspector'),
  Cell:       require('./cells/cell'),
  CodeCell:   require('./cells/code'),
  TextCell:   require('./cells/text'),
  EditorCell: require('./cells/editor'),
  ResultCell: require('./cells/result')
};

// Alias all the available models
App.Model = {
  Entry:     require('../models/entry'),
  CodeEntry: require('../models/code-entry'),
  TextEntry: require('../models/text-entry'),
  Gist:      require('../models/gist'),
  User:      require('../models/user')
};

// Alias all the available collections
App.Collection = {
  Notebook: require('../collections/notebook')
};

App.prototype.events = {
  'click .modal-toggle':   'toggleShortcuts',
  'click .modal-backdrop': 'hideShortcuts',
  'click .execute-notes':  'runNotebook'
};

App.prototype.initialize = function (options) {
  new (Backbone.Router.extend({
    routes: {
      '':    'application',
      ':id': 'application'
    },
    application: _.bind(function (id) {
      // Remove any old notebook that might be hanging around
      this.notebook && this.notebook.remove();

      this.notebook = new App.View.Notebook({
        gistId: id,
        user:   this.user
      });

      this.notebook.render().appendTo(this.el);
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

  this.user = new App.Model.User();
  this.user.fetch();

  // If the user model changes, refresh the route
  this.listenTo(this.user, 'change', function () {
    Backbone.history.loadUrl();
  });
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

App.prototype.runNotebook = function () {
  if (this.notebook) { this.notebook.execute(); }

  return this;
};
