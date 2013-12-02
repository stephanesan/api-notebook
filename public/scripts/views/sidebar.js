var _           = require('underscore');
var View        = require('./template');
var bounce      = require('../lib/bounce');
var config      = require('../state/config');
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

    while (!node.hasAttribute('data-load')) {
      node = node.parentNode;
    }

    this.updateId(node.getAttribute('data-load'));
  },
  'click .sidebar-toggle': function () {
    var isOpen = !this.el.classList.contains('sidebar-closed');

    this.el.classList[isOpen ? 'add' : 'remove']('sidebar-closed');
  },
  'click .persistence-authenticate':   'authenticate',
  'click .persistence-unauthenticate': 'unauthenticate',
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
 * @param {String}   id
 * @param {Function} done
 */
SidebarView.prototype.updateId = function (id) {
  config.set('id', id);
};

/**
 * Authenticate to the notebook persistence layer.
 */
SidebarView.prototype.authenticate = function () {
  return persistence.authenticate();
};

SidebarView.prototype.unauthenticate = function () {
  return persistence.unauthenticate();
};

// middleware.trigger('ui:modal', {
//   title:   'List Notebooks',
//   content: function (done) {
//     return persistence.list(function (err, list) {
//       done(null,
//         '<ul class="item-list">' +
//         _.map(list, itemTemplate).join('\n') +
//         '</ul>');
//     });
//   },
//   show: function (modal) {
//     Backbone.$(modal.el)
//       .on('click', '[data-delete]', function (e) {
//         e.preventDefault();

//         var id = this.getAttribute('data-delete');

//         middleware.trigger('ui:confirm', {
//           title: 'Delete Notebook',
//           content: 'Are you sure you want to delete this notebook?' +
//           ' Deleted notebooks cannot be restored.'
//         }, function (err, confirm) {
//           if (err || !confirm) { return; }

//           middleware.trigger('persistence:delete', {
//             id: id
//           }, function (err) {
//             if (err) { return; }

//             var listEl = e.target.parentNode.parentNode;
//             listEl.parentNode.removeChild(listEl);
//           });
//         });
//       })
//       .on('click', '[data-load]', function (e) {
//         e.preventDefault();
//         modal.close();
//         return config.set('id', this.getAttribute('data-load'));
//       });
//   }
// });
