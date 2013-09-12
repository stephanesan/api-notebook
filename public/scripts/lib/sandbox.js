var _          = require('underscore');
var middleware = require('../state/middleware');

var Sandbox = module.exports = function () {
  this.createFrame();
};

Sandbox.prototype.createFrame = function () {
  this.frame = document.createElement('iframe');
  this.frame.style.display = 'none';
  document.body.appendChild(this.frame);
  this.window = this.frame.contentWindow;
};

Sandbox.prototype.execute = function (code, cb) {
  var isError = false;
  var result;

  middleware.trigger('sandbox:context', {}, _.bind(function (err, context) {
    if (typeof context === 'object') {
      this.window.console = this.window.console || {};
      this.window.console._notebookApi = context;
      code = 'with (window.console._notebookApi) {\n' + code + '\n}';
    }

    // Allow middleware to hook into before execution
    middleware.trigger('sandbox:execute', this.window, _.bind(function (err) {
      // Using an asynchronous callback to clear the any possible stack trace
      // that would include implementation logic.
      process.nextTick(_.bind(function () {
        try {
          /* jshint evil: true */
          result = this.window.eval(code);
        } catch (error) {
          result  = error;
          isError = true;
        } finally {
          delete this.window.console._notebookApi;
          return cb && cb(result, isError);
        }
      }, this));
    }, this));
  }, this));
};

Sandbox.prototype.remove = function () {
  this.frame.parentNode.removeChild(this.frame);
  delete this.frame;
  delete this.window;
};
