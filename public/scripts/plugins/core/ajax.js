var _        = require('underscore');
var Backbone = require('backbone');

var AJAX_TIMEOUT = 20000;

/**
 * Ajax middleware transportation protocol. Allows third-party to hook into the
 * middleware and augment properties such as the URL or request headers.
 *
 * @param  {Object} middleware
 */
module.exports = function (middleware) {
  /**
   * Send an ajax request and return the xhr request back to the final listener.
   *
   * @param  {Object}   options
   * @param  {Function} next
   */
  middleware.core('ajax', function (options, next) {
    // Prepare the timeout amount to catch long running requests.
    var timeout = +options.timeout || AJAX_TIMEOUT;
    var ajaxTimeout;

    var request = _.extend({}, options, {
      success: function (content, status, xhr) {
        clearTimeout(ajaxTimeout);
        return next(null, xhr);
      },
      error: function (xhr) {
        clearTimeout(ajaxTimeout);
        return next(new Error(xhr.statusText || 'Ajax request aborted'), xhr);
      }
    });

    if (!('processData' in options)) {
      request.processData = (options.type === 'GET');
    }

    if (typeof options.data === 'object' && options.type === 'GET') {
      request.data = JSON.stringify(options.data);
    }

    // Using Backbone ajax functionality to submit the request.
    var xhr = options.xhr = Backbone.$.ajax(request);

    // Set a request timeout
    ajaxTimeout = setTimeout(function () {
      // Stops `Backbone.$.ajax` from also triggering an error which would
      // contain less detail.
      delete request.error;
      // Abort the current request.
      xhr.abort();
      // Call the `next` function with the timeout details.
      return next(new Error('Ajax timeout of ' + timeout + 'ms exceeded'), xhr);
    }, timeout);
  });
};
