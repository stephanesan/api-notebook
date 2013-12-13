var _           = require('underscore');
var View        = require('./template');
var bounce      = require('../lib/bounce');
var config      = require('../state/config');
var middleware  = require('../state/middleware');
var persistence = require('../state/persistence');

/**
 * Create a new sidebar view class.
 *
 * @type {Function}
 */
var SidebarView = module.exports = View.extend({
  className: 'notebook-sidebar'
});

/**
 * An object of all events that trigger on the sidebar view.
 *
 * @type {Object}
 */
SidebarView.prototype.events = {
  'click [data-load]': function (e) {
    var node = e.target;

    // Don't propagate the delete button clicks.
    if (node.hasAttribute('data-delete')) { return; }

    // Recurse up the parents until we have the correct node reference.
    while (!node.hasAttribute('data-load')) {
      node = node.parentNode;
    }

    var id = node.getAttribute('data-load');

    // If the current notebook has not been saved yet, prompt the user.
    if (!persistence.isSaved()) {
      return middleware.trigger('ui:confirm', {
        title: 'You have unsaved changes. Abandon changes?',
        content: '<p>' +
          'Save your work by pressing \'Cancel\' and ' +
          'then clicking the save icon in the toolbar or using ' +
          'the keystroke CMD + S (or CTRL + S).' +
          '</p>' +
          '<p>' +
          'Press \'OK\' to abandon this notebook. ' +
          'Your changes will be lost.' +
          '</p>'
      }, _.bind(function (err, confirmed) {
        if (err || !confirmed) { return; }

        return this.updateId(id);
      }, this));
    }

    return this.updateId(id);
  },
  'click .sidebar-toggle': function () {
    var isOpen = !this.el.classList.contains('sidebar-closed');

    this.el.classList[isOpen ? 'add' : 'remove']('sidebar-closed');
  },
  'click .persistence-authenticate':   'authenticate',
  'click .persistence-unauthenticate': 'unauthenticate',
  'click [data-delete]': function (e) {
    this.deleteId(e.target.getAttribute('data-delete'));
  },
  'click .sidebar-authenticate': function (e) {
    e.preventDefault();
  }
};

/**
 * Require the sidebar template.
 *
 * @type {Function}
 */
SidebarView.prototype.template = require('../../templates/views/sidebar.hbs');

/**
 * Reload the persistent notebooks list.
 */
SidebarView.prototype.updateList = function () {
  this.data.set('updating', true);

  persistence.list(_.bind(function (err, list) {
    this.data.set('updating', false);

    return this.data.set('list', list);
  }, this));
};

/**
 * Add some sidebar helpers.
 *
 * @type {Object}
 */
SidebarView.prototype.templateHelpers = {
  dateFormat: function (date) {
    return date.toLocaleTimeString() + ' ' + date.toLocaleDateString();
  }
};

/**
 * Override the render function to load the initial notebook list.
 */
SidebarView.prototype.render = function () {
  this.listenTo(persistence, 'changeUser', bounce(this.updateList, this));

  return View.prototype.render.call(this);
};

/**
 * Load an id into the persistence layer.
 *
 * @param {String} id
 */
SidebarView.prototype.updateId = function (id) {
  config.set('id', id);
  return persistence.load();
};

/**
 * Delete an id using the persistence layer.
 *
 * @param {String} id
 */
SidebarView.prototype.deleteId = function (id) {
  middleware.trigger('ui:confirm', {
    title: 'Delete Notebook',
    content: 'Are you sure you want to delete this notebook?' +
    ' Deleted notebooks cannot be restored.'
  }, _.bind(function (err, confirmed) {
    return confirmed && persistence.delete(id, _.bind(function (err) {
      if (err) {
        return window.alert(
          'Couldn\'t delete the Notebook. Refresh and try again.'
        );
      }

      if (persistence.get('id') === id) {
        this.updateId('');
      }

      var listItemEl = this.el.querySelector('[data-load="' + id + '"]');
      return listItemEl && listItemEl.parentNode.removeChild(listItemEl);
    }, this));
  }, this));
};

/**
 * Authenticate to the notebook persistence layer.
 */
SidebarView.prototype.authenticate = function () {
  return persistence.authenticate();
};

/**
 * Unauthenticate from the notebook.
 */
SidebarView.prototype.unauthenticate = function () {
  return persistence.unauthenticate();
};
