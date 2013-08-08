var Sandbox = module.exports = function () {
  this.createFrame();
};

Sandbox.prototype.createFrame = function () {
  this.frame = document.createElement('iframe');
  this.frame.style.display = 'none';
  document.body.appendChild(this.frame);
};

Sandbox.prototype.execute = function (code, context) {
  try {
    if (typeof context === 'object') {
      this.frame.contentWindow.console = this.frame.console || {};
      this.frame.contentWindow.console._notebookAPI = context;
      code = 'with (window.console._notebookAPI) {\n' + code + '\n}';
    }

    /* jshint evil: true */
    return this.frame.contentWindow.eval(code);
  } catch (error) {
    throw error;
  } finally {
    delete this.frame.contentWindow.console._notebookAPI;
  }
};
