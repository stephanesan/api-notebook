var Widget = require('./widget');
var Pos    = CodeMirror.Pos;

var Completion = module.exports = function (cm, autocomplete, options) {
  var that          = this;
  var closeOnCursor = true;
  var closeOnBlur;

  this.cm           = cm;
  this.options      = options;
  this.ghost        = null;
  this.widget       = null;
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
    if (data.origin && data.origin.charAt(0) !== '+') {
      return that.removeWidget();
    }

    closeOnCursor = false;
    that.showHints();
  };
  this.onCursorActivity = function (cm) {
    if (closeOnCursor || cm.somethingSelected()) {
      return that.removeWidget();
    }

    closeOnCursor = true;
  };

  this.cm.on('blur',           this.onBlur);
  this.cm.on('focus',          this.onFocus);
  this.cm.on('change',         this.onChange);
  this.cm.on('beforeSelectionChange', this.onCursorActivity);

  this.showHints();
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
  var data = this.autocomplete(this.cm, this.options);
  this.showWidget(data);
};

Completion.prototype._filter = function (string) {
  return this.options.filter.call(this.data, string);
};

Completion.prototype.showWidget = function (data) {
  this.removeWidget();
  this.data   = data;
  this.widget = new Widget(this, data);
};

Completion.prototype.removeWidget = function () {
  if (this.widget) { this.widget.remove(); }
  delete this.data;
};
