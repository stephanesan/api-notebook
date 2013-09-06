var _        = require('underscore');
var domify   = require('domify');
var Backbone = require('backbone');

var View     = require('./view');
var Notebook = require('./notebook');
var controls = require('../lib/controls');

var state       = require('../state/state');
var messages    = require('../state/messages');
var persistence = require('../state/persistence');

var App = module.exports = View.extend({
  className: 'application'
});

App.prototype.events = {
  'click .modal-toggle':   'toggleShortcuts',
  'click .modal-backdrop': 'hideShortcuts',
  'click .notebook-exec':  'runNotebook',
  'click .notebook-fork':  'forkNotebook',
  'click .notebook-auth':  'authNotebook'
};

App.prototype.initialize = function (options) {
  messages.trigger('ready');

  Backbone.history.start({
    pushState: true
  });

  this.listenTo(persistence, 'changeUser',      this.updateUser,      this);
  this.listenTo(messages,    'keydown:Esc',     this.hideShortcuts,   this);
  this.listenTo(messages,    'keydown:Shift-/', this.toggleShortcuts, this);
};

App.prototype.remove = function () {
  Backbone.history.stop();
  View.prototype.remove.call(this);
};

App.prototype.updateUser = function () {
  var isAuth  = persistence.isAuthenticated();
  var isOwner = persistence.isOwner();

  this.el.classList[isOwner  ? 'add' : 'remove']('user-is-owner');
  this.el.classList[!isOwner ? 'add' : 'remove']('user-not-owner');
  this.el.classList[isAuth   ? 'add' : 'remove']('user-not-authenticated');
  this.el.classList[!isAuth  ? 'add' : 'remove']('user-is-authenticated');

  // Adding and removing some of these classes cause the container to resize.
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

App.prototype.render = function () {
  View.prototype.render.call(this);

  this.el.appendChild(domify(
    '<header class="notebook-header clearfix">' +
      '<div class="notebook-header-primary">' +
        '<h1>JSNotebook</h1>' +
      '</div>' +

      '<div class="notebook-header-secondary">' +
        '<button class="btn-text notebook-fork">Make my own copy</button>' +
        '<button class="btn-text notebook-auth">' +
          'Authenticate using Github' +
        '</button>' +
        '<button class="notebook-exec">Run All</button>' +
        '<button class="ir modal-toggle">Keyboard Shortcuts</button>' +
      '</div>' +
    '</header>' +

    '<div class="banner notebook-auth">' +
      '<p>Please sign in with Github to save the notebook.</p>' +
    '</div>' +

    '<div class="modal-backdrop"></div>'
  ));

  var allControls = controls.editor.concat(controls.code).concat(controls.text);

  var controlMap = _.map(allControls, function (control) {
    return '<tr>' +
      '<td>' + (control.keyCode || control.shortcut) + '</td>' +
      '<td>' + control.description + '</td>' +
    '</tr>';
  });

  this.el.appendChild(domify(
    '<div class="modal">' +
      '<header class="modal-header">' +
        '<h3>Keyboard Shortcuts</h3>' +
      '</header>' +

      '<div class="modal-body">' +
        '<table>' +
          '<colgroup>' +
            '<col class="col-mini">' +
            '<col class="col-large">' +
          '</colgroup>' +
          '<tr>' +
            '<th>Key Combination</th>' +
            '<th>Action</th>' +
          '</tr>' +
          controlMap.join('') +
        '</table>' +
      '</div>' +
    '</div>'
  ));

  return this;
};

App.prototype.appendTo = function () {
  View.prototype.appendTo.apply(this, arguments);
  messages.trigger('resize');
};

App.prototype.runNotebook = function (done) {
  this.notebook.execute(done);
};

App.prototype.authNotebook = function (done) {
  // Authentication
};

App.prototype.forkNotebook = function (done) {
  persistence.duplicate(done);
};
