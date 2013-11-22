var _        = require('underscore');
var Backbone = require('backbone');

var View         = require('./template');
var Notebook     = require('./notebook');
var EditNotebook = require('./edit-notebook');
var controls     = require('../lib/controls');
var config       = require('../state/config');
var messages     = require('../state/messages');
var middleware   = require('../state/middleware');
var persistence  = require('../state/persistence');

var ENTER_KEY = 13;

/**
 * Helper function for removing old application contents and resizing the
 * viewport container.
 *
 * @param  {Function} fn
 * @return {Function}
 */
var changeNotebook = function (fn) {
  return function () {
    // Remove the old application contents/notebook.
    if (this.contents) {
      this.contents.remove();
      delete this.contents;
      this.el.classList.remove('notebook-view-active', 'notebook-edit-active');
    }

    // Sets the new notebook contents.
    this.contents = fn && fn.apply(this, arguments);

    this.contents.render().appendTo(this.el.querySelector('.notebook-content'));

    // Add style classes for the view type.
    var view = this.contents instanceof Notebook ? 'view' : 'edit';
    this.el.classList.add('notebook-' + view + '-active');

    // Resize the parent frame since we have added notebook contents.
    messages.trigger('resize');
    return this;
  };
};

/**
 * Create a central application view.
 *
 * @type {Function}
 */
var App = module.exports = View.extend({
  className: 'application'
});

/**
 * Keep track of all events that can be triggered from the DOM.
 *
 * @type {Object}
 */
App.prototype.events = {
  'click .notebook-help':  'showShortcuts',
  'click .notebook-exec':  'runNotebook',
  'click .notebook-clone': 'cloneNotebook',
  'click .notebook-auth':  'authNotebook',
  'click .notebook-save':  'saveNotebook',
  'click .notebook-list':  'listNotebooks',
  'click .notebook-share': 'shareNotebook',
  // Switch between application views.
  'click .toggle-notebook-edit': 'toggleEdit',
  // Listen for `Enter` presses and blur the input.
  'keydown .notebook-title': function (e) {
    if (e.which !== ENTER_KEY) { return; }

    e.preventDefault();
    e.srcElement.blur();
  },
  // Update the notebook title when a new character is entered.
  'keyup .notebook-title': function (e) {
    persistence.get('meta').set('title', e.target.value);
  },
  // Pre-select the notebook title before input.
  'click .notebook-title': function (e) {
    e.srcElement.select();
  }
};

/**
 * Runs when we create an instance of the applications. Starts listening for
 * relevant events to respond to.
 */
App.prototype.initialize = function () {
  // Block attempts to close or refresh the window when the current persistence
  // state is dirty.
  this.listenTo(Backbone.$(window), 'beforeunload', function (e) {
    if (persistence.get('state') !== persistence.CHANGED) { return; }

    var confirmationMessage = 'Your changes will be lost.';

    (e || window.event).returnValue = confirmationMessage;
    return confirmationMessage;
  });

  // Re-render the notebook when the notebook changes.
  this.listenTo(persistence, 'changeNotebook', this.renderNotebook);

  // Update the displayed title when the title changes.
  this.listenTo(persistence.get('meta'), 'change:title', function (_, title) {
    var titleEl = document.head.querySelector('title');
    titleEl.textContent = title ? title + ' • Notebook' : 'Notebook';
  });
};

/**
 * Precompile the appliction template.
 *
 * @type {Function}
 */
App.prototype.template = require('../../templates/views/app.hbs');

/**
 * Switch between raw source edit mode and the normal notebook execution.
 *
 * @return {App}
 */
App.prototype.renderNotebook = changeNotebook(function () {
  return this.notebook = new Notebook();
});

/**
 * Toggle the view between edit and notebook view.
 *
 * @return {App}
 */
App.prototype.toggleEdit = changeNotebook(function () {
  if (this.notebook) {
    delete this.notebook;
    return new EditNotebook();
  }

  return this.notebook = new Notebook();
});

/**
 * Remove the application view from the DOM.
 *
 * @return {App}
 */
App.prototype.remove = function () {
  changeNotebook().call(this);
  return View.prototype.remove.call(this);
};

/**
 * Update all data "bound" methods.
 *
 * @return {App}
 */
App.prototype.update = function () {
  this.updateId();
  this.updateUser();
  this.updateState();

  return this;
};

/**
 * Updates the template when the user or document owner changes.
 *
 * @return {App}
 */
App.prototype.updateUser = function () {
  var isAuth  = persistence.isAuthenticated();
  var isOwner = persistence.isOwner();

  this.el.classList[isOwner  ? 'add' : 'remove']('user-is-owner');
  this.el.classList[!isOwner ? 'add' : 'remove']('user-not-owner');
  this.el.classList[isAuth   ? 'add' : 'remove']('user-is-authenticated');
  this.el.classList[!isAuth  ? 'add' : 'remove']('user-not-authenticated');

  return this;
};

/**
 * Updates the template when the persistence id changes.
 *
 * @return {App}
 */
App.prototype.updateId = function () {
  var isSaved = persistence.has('id');

  this.el.classList[isSaved  ? 'add' : 'remove']('notebook-is-saved');
  this.el.classList[!isSaved ? 'add' : 'remove']('notebook-not-saved');

  return this;
};

/**
 * Update the displayed notebook persistence state.
 *
 * @return {App}
 */
App.prototype.updateState = function () {
  var state     = persistence.get('state');
  var statusEl  = this.el.querySelector('.save-status');
  var now       = new Date();
  var hours     = now.getHours();
  var minutes   = now.getMinutes();
  var suffix    = 'AM';
  var stateText = '';

  if (hours > 11) {
    hours  = hours - 12;
    suffix = 'PM';
  }

  if (hours === 0) {
    hours = 12;
  }

  var stamp = hours + ':' + ('0' + minutes).slice(-2) + suffix;

  // Remove the content of the status display.
  statusEl.innerHTML = '';

  if (state === persistence.LOADING) {
    stateText            = 'loading';
    statusEl.textContent = 'Loading.';
  } else if (state === persistence.LOAD_FAIL) {
    stateText            = 'load-failed';
    statusEl.textContent = 'Load failed.';
  } else if (state === persistence.LOAD_DONE) {
    stateText            = 'loaded';
    statusEl.textContent = persistence.isNew() ? '' : 'Loaded ' + stamp + '.';
  } else if (state === persistence.SAVING) {
    stateText            = 'saving';
    statusEl.textContent = 'Saving.';
  } else if (state === persistence.SAVE_FAIL) {
    stateText            = 'save-failed';
    statusEl.textContent = 'Save failed.';
  } else if (state === persistence.SAVE_DONE) {
    stateText            = 'saved';
    statusEl.textContent = persistence.isNew() ? '' : 'Saved ' + stamp + '.';
  } else if (state === persistence.CHANGED) {
    stateText            = 'changed';
    statusEl.textContent = 'Unsaved changes.';
  } else if (state === persistence.CLONING) {
    stateText            = 'cloning';
    statusEl.textContent = 'Cloning notebook.';
  }

  document.body.setAttribute('data-state', stateText);

  return this;
};

/**
 * Shows the shortcut modal.
 */
App.prototype.showShortcuts = function () {
  var allControls = controls.editor.concat(controls.code).concat(controls.text);

  middleware.trigger('ui:modal', {
    title: 'Keyboard Shortcuts',
    content: [
      '<table class="controls-table">' +
        '<colgroup>' +
          '<col class="controls-col-mini">' +
          '<col class="controls-col-large">' +
        '</colgroup>' +
        '<tr>' +
          '<th>Key Combination</th>' +
          '<th>Action</th>' +
        '</tr>' +
        _.map(allControls, function (control) {
          return [
            '<tr>',
            '<td>' + (control.keyCode || control.shortcut) + '</td>',
            '<td>' + control.description + '</td>',
            '</tr>'
          ].join('\n');
        }).join('\n') +
      '</table>'
    ].join('\n')
  });
};

/**
 * Render the applications `innerHTML`.
 *
 * @return {App}
 */
App.prototype.render = function () {
  View.prototype.render.call(this);

  // Listens to different application state changes and updates accordingly.
  this.listenTo(persistence, 'changeUser',   this.updateUser);
  this.listenTo(persistence, 'change:state', this.updateState);
  this.listenTo(persistence, 'change:id',    this.updateId);

  // Trigger all the update methods.
  this.update();

  return this;
};

/**
 * Append the application view to an element.
 *
 * @return {App}
 */
App.prototype.appendTo = function () {
  View.prototype.appendTo.apply(this, arguments);
  this.renderNotebook();
  return this;
};

/**
 * Runs the entire notebook sequentially.
 */
App.prototype.runNotebook = function () {
  return this.notebook && this.notebook.execute();
};

/**
 * Authenticate with the persistence layer.
 */
App.prototype.authNotebook = function () {
  return persistence.authenticate();
};

/**
 * Clone the current notebook in-memory.
 */
App.prototype.cloneNotebook = function () {
  return persistence.clone();
};

/**
 * Manually attempt to save the notebook.
 */
App.prototype.saveNotebook = function () {
  return persistence.save();
};

/**
 * Share the notebook inside a modal display.
 */
App.prototype.shareNotebook = function () {
  var id          = persistence.get('id');
  var shareScript = '<script src="' + process.env.EMBED_SCRIPT_URL + '"' +
    (id ? ' data-id="' + id + '"' : '') + '></script>';

  middleware.trigger('ui:modal', {
    title: 'Share Notebook',
    content: '<p class="notebook-share-about">Copy this code to embed.</p>' +
      '<input class="notebook-share-input" ' +
      'value="' + _.escape(shareScript) + '" readonly>' +
      '<p class="notebook-share-about">Copy this link to share.</p>' +
      '<input class="notebook-share-input" ' +
      'value="' + config.get('url') + '" readonly>',
    show: function (modal) {
      Backbone.$(modal.el).on('click', '.notebook-share-input', function (e) {
        e.target.select();
      });
    }
  });
};

/**
 * List all notebooks in a modal and allow selection.
 */
App.prototype.listNotebooks = function () {
  var itemTemplate = _.template(
    '<li><div class="item-action">' +
    '<a href="#" class="btn btn-primary btn-small" data-load="<%- id %>">' +
    'Load</a></div>' +
    '<div class="item-description"><% print(meta.title || id) %> ' +
    '<% if (updatedAt) { %>' +
    '<span class="text-em text-small">' +
    '<% print(updatedAt.toLocaleDateString()) %>' +
    '</span>' +
    '<% } %>' +
    '<a href="#" class="item-details-link" data-delete="<%- id %>">delete</a>' +
    '</div>' +
    '</li>'
  );

  middleware.trigger('ui:modal', {
    title:   'List Notebooks',
    content: function (done) {
      return persistence.list(function (err, list) {
        done(null,
          '<ul class="item-list">' +
          _.map(list, itemTemplate).join('\n') +
          '</ul>');
      });
    },
    show: function (modal) {
      Backbone.$(modal.el)
        .on('click', '[data-delete]', function (e) {
          e.preventDefault();

          var id = this.getAttribute('data-delete');

          middleware.trigger('ui:confirm', {
            title: 'Delete Notebook',
            content: 'Are you sure you want to delete this notebook?' +
            ' Deleted notebooks cannot be restored.'
          }, function (err, confirm) {
            if (err || !confirm) { return; }

            middleware.trigger('persistence:delete', {
              id: id
            }, function (err) {
              if (err) { return; }

              var listEl = e.target.parentNode.parentNode;
              listEl.parentNode.removeChild(listEl);
            });
          });
        })
        .on('click', '[data-load]', function (e) {
          e.preventDefault();
          modal.close();
          return config.set('id', this.getAttribute('data-load'));
        });
    }
  });
};
