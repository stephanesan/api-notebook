var _        = require('underscore');
var domify   = require('domify');
var Backbone = require('backbone');
var messages = require('../../state/messages');

/**
 * Generate the HTML for a modal popup.
 *
 * @type {Function}
 */
var template = _.template([
  '<div class="modal" tabindex="-1">',
  '<div class="modal-dialog">',
  '<div class="modal-content">',
  '<% if (title) { %>',
  '<div class="modal-header">',
  '<button class="modal-close" data-dismiss>&times;</button>',
  '<h4 class="modal-title"><%- title %></h4>',
  '</div>',
  '<% } %>',
  '<div class="modal-body">',
  '<%= content %>',
  '</div>',
  '</div>',
  '</div>',
  '</div>'
].join('\n'));

/**
 * Simple middleware handler for opening modal windows. It should proceed to
 * the next function in the execution stack when the modal window is closed.
 *
 * @param {Object}   options
 * @param {Function} next
 * @param {Function} done
 */
var modalPlugin = function (options, next, done) {
  var modal = {
    el: domify(template(options)),
    close: function (err, data) {
      if (_.isFunction(options.beforeDestroy)) {
        options.beforeDestroy(modal);
      }

      messages.off('keydown:Esc', boundClose);
      document.body.removeChild(modal.el);
      document.body.classList.remove('modal-visible');
      return done(err, data);
    }
  };

  var boundClose = _.bind(modal.close, null, null, null);

  document.body.appendChild(modal.el);
  document.body.classList.add('modal-visible');

  messages.on('keydown:Esc', boundClose);
  Backbone.$(modal.el)
    .on('click', function (e) {
      if (e.target !== modal.el) { return; }

      return boundClose();
    })
    .on('click', '[data-dismiss]', boundClose);

  // Execute the after render function which can be used to attach more
  // functionality to the modal.
  return _.isFunction(options.afterRender) && options.afterRender(modal);
};

/**
 * Attach the core UI-based middleware plugins.
 *
 * @param {Object} middleware
 */
module.exports = function (middleware) {
  middleware.core('ui:modal', modalPlugin);
};
