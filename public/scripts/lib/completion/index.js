var Widget = require('./widget');
var Pos    = CodeMirror.Pos;

var Completion = module.exports = function (cm, autocomplete, options) {
  var that          = this;
  var closeOnCursor = true;
  var closeOnBlur;

  this.cm           = cm;
  this.options      = options;
  this.autocomplete = autocomplete;

  // Default options
  this.options.closeOn = this.options.closeOn || /[^$_a-zA-Z0-9]/;

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

    var closeOn = that.options.closeOn;
    // Upon text insertion, check against the data given to use to decide if we
    // need to create a new autocompletion widget.
    if (data.origin !== '+delete' && closeOn.test(data.text.join('\n'))) {
      that.removeWidget();
    }
    // Any deletions should check against the removed text to see if we need to
    // start a new autocompletion widget.
    if (data.origin === '+delete' && closeOn.test(data.removed.join('\n'))) {
      that.removeWidget();
    }
    // If the previous token is whitespace, trigger a new autocompletion widget.
    if (/ */.test(cm.getTokenAt(data.from).string)) {
      that.removeWidget();
    }

    if (that.widget) {
      that.widget.refresh();
    } else {
      that.showHints();
    }

    closeOnCursor = false;
  };
  this.onCursorActivity = function (cm) {
    if (closeOnCursor) { that.removeWidget(); }

    closeOnCursor = true;
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
