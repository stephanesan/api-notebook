var _        = require('underscore');
var DOMBars  = require('../lib/dombars');
var Backbone = require('backbone');

var View         = require('./template');
var Sidebar      = require('./sidebar');
var Notebook     = require('./notebook');
var EditNotebook = require('./edit-notebook');
var bounce       = require('../lib/bounce');
var controls     = require('../lib/controls');
var state        = require('../state/state');
var config       = require('../state/config');
var messages     = require('../state/messages');
var middleware   = require('../state/middleware');
var persistence  = require('../state/persistence');
var domListen    = require('../lib/dom-listen');

var ENTER_KEY    = 13;
var EMBED_SCRIPT = process.env.embed.script;

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
  'click .notebook-share':  'shareNotebook',
  'click .toggle-notebook': 'toggleEdit',
  'click .notebook-new':    'newNotebook',
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

  // Set a sidebar instance to render.
  this.data.set('sidebar', new Sidebar());

  /**
   * Block attempts to close the window when the persistence state is dirty.
   */
  this.listenTo(domListen(window), 'beforeunload', function (e) {
    if (!config.get('savable') || persistence.isSaved()) { return; }

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
    var inputEl = this.el.querySelector('.notebook-title');

    titleEl.textContent = title ? title + ' • Notebook' : 'Notebook';

    // Refresh the title manually to avoid stale value attributes.
    if (inputEl) {
      inputEl.value = title;
    }
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
    var timestamp = new Date().toLocaleTimeString();

    var states = {
      1: 'Saving',
      2: 'Loading',
      3: 'Save failed',
      4: persistence.isNew() ? '' : 'Saved ' + timestamp,
      5: 'Load Failed',
      6: persistence.isNew() ? '' : 'Loaded ' + timestamp,
      7: 'Unsaved changes',
      8: 'Cloning notebook'
    };

    state.set('loading',       persistence.get('state') === 2);
    this.data.set('stateText', states[persistence.get('state')]);
  }, this));

  /**
   * Add or remove a footer class depending on visibility.
   */
  this.listenTo(config, 'change:header', bounce(function () {
    var has = config.get('header');
    this.el.classList[has ? 'add' : 'remove']('application-has-header');
  }, this));

  /**
   * Add or remove a footer class depending on visibility.
   */
  this.listenTo(config, 'change:footer', bounce(function () {
    var has = config.get('footer');
    this.el.classList[has ? 'add' : 'remove']('application-has-footer');
  }, this));

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
 * Manually create a new notebook instance. Before we discard any current
 * changes, check with the user.
 */
App.prototype.newNotebook = function () {
  var newNotebook = function (err, confirmed) {
    if (err || !confirmed) { return; }

    persistence.set('id', '');
    return persistence.load();
  };

  // If the current notebook is already saved, immediately reload.
  if (persistence.isSaved()) {
    return newNotebook(null, false);
  }

  // Confirm with the user that this is the action they want to do.
  return middleware.trigger('ui:confirm', {
    title: 'Are you sure?',
    content: 'Your changes will be lost.'
  }, newNotebook);
};

/**
 * Share the notebook inside a modal display.
 */
App.prototype.shareNotebook = function () {
  var id          = persistence.get('id');
  var shareScript = '<script src="' + EMBED_SCRIPT + '"' +
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
