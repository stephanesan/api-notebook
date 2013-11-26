var _        = require('underscore');
var DOMBars  = require('dombars/runtime');
var Backbone = require('backbone');

var View         = require('./template');
var Notebook     = require('./notebook');
var EditNotebook = require('./edit-notebook');
var bounce       = require('../lib/bounce');
var controls     = require('../lib/controls');
var config       = require('../state/config');
var messages     = require('../state/messages');
var middleware   = require('../state/middleware');
var persistence  = require('../state/persistence');

var ENTER_KEY = 13;

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
  'click .notebook-help':   'showShortcuts',
  'click .notebook-exec':   'runNotebook',
  'click .notebook-clone':  'cloneNotebook',
  'click .notebook-auth':   'authNotebook',
  'click .notebook-save':   'saveNotebook',
  'click .notebook-list':   'listNotebooks',
  'click .notebook-share':  'shareNotebook',
  'click .toggle-notebook': 'toggleEdit',
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
  View.prototype.initialize.apply(this, arguments);

  /**
   * Block attempts to close the window when the persistence state is dirty.
   */
  this.listenTo(Backbone.$(window), 'beforeunload', function (e) {
    if (persistence.get('state') !== persistence.CHANGED) { return; }

    return (e || window.event).returnValue = 'Your changes will be lost.';
  });

  /**
   * Re-render the notebook when the notebook changes.
   */
  this.listenTo(persistence, 'changeNotebook', this.renderNotebook);

  /**
   * Update the document title when the persistence meta data changes.
   */
  this.listenTo(persistence.get('meta'), 'change:title', bounce(function () {
    var title   = persistence.get('meta').get('title');
    var titleEl = document.head.querySelector('title');

    titleEl.textContent = title ? title + ' • Notebook' : 'Notebook';
  }, this));

  /**
   * Update user state data when the user changes.
   */
  this.listenTo(persistence, 'changeUser', bounce(function () {
    this.data.set('owner',         persistence.isOwner());
    this.data.set('authenticated', persistence.isAuthenticated());
  }, this));

  /**
   * Update the saved view state when the id changes.
   */
  this.listenTo(persistence, 'change:id', bounce(function () {
    this.data.set('saved', persistence.has('id'));
  }, this));

  /**
   * Update state variables when the persistence state changes.
   */
  this.listenTo(persistence, 'change:state', bounce(function () {
    var state     = persistence.get('state');
    var timestamp = new Date().toLocaleTimeString();

    var stateText  = '';
    var stateClass = '';

    if (state === persistence.LOADING) {
      stateText  = 'Loading';
      stateClass = 'loading';
    } else if (state === persistence.LOAD_FAIL) {
      stateText  = 'Load failed';
      stateClass = 'load-failed';
    } else if (state === persistence.LOAD_DONE) {
      stateText  = persistence.isNew() ? '' : 'Loaded ' + timestamp;
      stateClass = 'loaded';
    } else if (state === persistence.SAVING) {
      stateText  = 'Saving';
      stateClass = 'saving';
    } else if (state === persistence.SAVE_FAIL) {
      stateText  = 'Save failed';
      stateClass = 'save-failed';
    } else if (state === persistence.SAVE_DONE) {
      stateText  = persistence.isNew() ? '' : 'Saved ' + timestamp;
      stateClass = 'saved';
    } else if (state === persistence.CHANGED) {
      stateText  = 'Unsaved changes';
      stateClass = 'changed';
    } else if (state === persistence.CLONING) {
      stateText  = 'Cloning notebook';
      stateClass = 'cloning';
    }

    this.data.set('stateText', stateText);

    document.body.setAttribute('data-state', stateClass);
  }, this));

  /**
   * Trigger a resize event any time the active notebook view changes.
   */
  this.listenTo(this.data, 'change:notebook', function () {
    messages.trigger('resize');
  });

  return this;
};

/**
 * Precompile the appliction template.
 *
 * @type {Function}
 */
App.prototype.template = require('../../templates/views/app.hbs');

/**
 * Switch between raw source edit mode and the normal notebook execution.
 */
App.prototype.renderNotebook = function () {
  this.data.set('notebook', new Notebook());
  this.data.set('activeView', 'view');

  DOMBars.VM.exec(function () {
    messages.trigger('refresh');
  });
};

/**
 * Toggle the view between edit and notebook view.
 */
App.prototype.toggleEdit = function () {
  if (this.data.get('activeView') === 'edit') {
    return this.renderNotebook();
  }

  this.data.set('notebook', new EditNotebook());
  this.data.set('activeView', 'edit');

  DOMBars.VM.exec(function () {
    messages.trigger('refresh');
  });
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
  return this.data.get('notebook').execute();
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
