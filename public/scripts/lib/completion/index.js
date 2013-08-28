var Widget = require('./widget');
var Pos    = CodeMirror.Pos;

var Completion = module.exports = function (cm, autocomplete, options) {
  var that          = this;
  var closeOnCursor = true;
  var closeOnBlur;

  this.cm           = cm;
  this.options      = options;
  this.autocomplete = autocomplete;

  // Add a filter function
  if (typeof this.options.filter !== 'function') {
    this.options.filter = function (string) {
      return string.substr(0, this.token.string.length) === this.token.string;
    };
  }

  this.onBlur = function () {
    closeOnBlur = setTimeout(function () { that.removeWidget(); }, 100);
  };
  this.onFocus = function () {
    clearTimeout(closeOnBlur);
  };
  this.onChange = function (cm, data) {
    // Only update the display when we are inserting or deleting characters
    if (!data.origin || data.origin.charAt(0) !== '+') {
      return that.removeWidget();
    }

    that.showHints();
    closeOnCursor = false;
  };
  this.onCursorActivity = function (cm) {
    var close = closeOnCursor;
    closeOnCursor = true;

    if (close || cm.somethingSelected()) {
      return that.removeWidget();
    }
  };

  this.cm.on('blur',           this.onBlur);
  this.cm.on('focus',          this.onFocus);
  this.cm.on('change',         this.onChange);
  this.cm.on('cursorActivity', this.onCursorActivity);
};

Completion.prototype.remove = function () {
  this.removeWidget();
  this.cm.off('blur',           this.onBlur);
  this.cm.off('focus',          this.onFocus);
  this.cm.off('change',         this.onChange);
  this.cm.off('cursorActivity', this.onCursorActivity);
};

Completion.prototype.refresh = function () {
  if (this.widget) { this.widget.refresh(); }
};

Completion.prototype.showHints = function () {
  this.showWidget(this.autocomplete(this.cm, this.options));
};

Completion.prototype.showWidget = function (data) {
  this.removeWidget();
  this.widget = new Widget(this, data);
};

Completion.prototype.removeWidget = function () {
  if (this.widget) { this.widget.remove(); }
};
