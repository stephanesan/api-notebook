var Backbone   = require('backbone');
var middleware = require('../../../../state/middleware');

/**
 * Keep track of open popup windows so we only have one open at a time.
 *
 * @type {Object}
 */
var openPopup, openModal;

/**
 * Closes previously opened windows and modals.
 */
var closeAll = function () {
  if (openPopup) { openPopup.close(); }
  if (openModal) { openModal.close(); }
};

/**
 * Pop open an authentication window. It adds some additional safe guards such
 * as catching blocked popup windows, listening for window closes, simplified
 * window positioning, etc.
 *
 * @return {Object} Execute `close` when the window is safe to clear.
 */
module.exports = function (url, cb) {
  var width     = Math.min(720, window.screen.availWidth);
  var height    = Math.min(480, window.screen.availHeight);
  var top       = Math.min(100, (window.screen.availHeight - height) / 2);
  var left      = (window.screen.availWidth - width) / 2;
  var completed = false;
  var closeInterval;

  // Close previously open popup windows and modals.
  closeAll();

  middleware.trigger('ui:modal', {
    title: 'Request API Permission',
    content: [
      '<p>',
      'Making API requests requires you to grant access to the application.',
      '</p>',
      '<p>',
      'You will be redirected to the API provider to approve the use of your ' +
      'credentials and then returned to this page.',
      '</p>',
      '<p>',
      'You can revoke these permissions at any time.',
      '</p>',
      '<p class="text-center">',
      '<button class="btn" data-authenticate>Authenticate</button>',
      '</p>'
    ].join('\n'),
    afterRender: function (modal) {
      openModal = modal;

      // Open a popup window when the authentication button is pressed.
      Backbone.$(modal.el).on('click', '[data-authenticate]', function () {
        openPopup = window.open(
          url, '', [
            'top=' + top, 'left=' + left, 'width=' + width, 'height=' + height
          ].join(',')
        );

        if (typeof openPopup !== 'object') {
          return cb(new Error('Popup window blocked'));
        }

        // Catch window closes before authentication is complete.
        closeInterval = window.setInterval(function () {
          if (openPopup.closed) {
            window.clearInterval(closeInterval);
            return cb(new Error('Popup window closed'));
          }
        }, 400);
      });
    }
  }, function () {
    return !completed && cb(new Error('Modal closed without authenticating'));
  });

  return {
    close: function () {
      // Set completed to true so we won't cause an error callback.
      completed = true;

      // Remove any references to open modals and windows.
      closeAll();
      openPopup = null;
      openModal = null;

      // Remove any possible reference to the open popup check interval.
      window.clearInterval(closeInterval);
    }
  };
};
