var _          = require('underscore');
var domify     = require('domify');
var Backbone   = require('backbone');
var messages   = require('../../state/messages');
var middleware = require('../../state/middleware');

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
middleware.core('ui:modal', function (options, next, done) {
  // Allow asynchronous template loads based on content and number of arguments.
  // I drew this inspiration from mocha and really love the pattern.
  var async = false;
  var templateOptions = {
    title:   options.title,
    content: options.content
  };

  // Check if content is a function. If it is, just execute it or put the modal
  // into async mode.
  if (_.isFunction(options.content)) {
    if (!options.content.length) {
      templateOptions.content = options.content();
    } else {
      async = true;
      templateOptions.content = [
        '<p class="text-center">',
        '<i class="icon-arrows-cw animate-spin"></i>',
        '</p>'
      ].join('');
    }
  }

  // Render the modal with a close function.
  var modal = {
    el: domify(template(templateOptions)),
    close: function (err) {
      messages.off('keydown:Esc', boundClose);
      document.body.removeChild(modal.el);
      document.body.classList.remove('modal-visible');
      return done(err);
    },
    closed: false
  };

  // Trigger the async function callback and render the modal body.
  if (async) {
    options.content(function (err, content) {
      if (err) {
        modal.close();
        return done(err);
      }

      modal.el.querySelector('.modal-body').innerHTML = content;
    });
  }

  var boundClose = function () {
    modal.closed = true;
    return modal.close();
  };

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
  return _.isFunction(options.show) && options.show(modal);
});

/**
 * Extends the modal middleware for providing a confirmation dialog window.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
middleware.core('ui:confirm', function (data, next, done) {

});
