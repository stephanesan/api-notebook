var _      = require('underscore');
var Ghost  = require('./ghost');
var Widget = require('./widget');
var Pos    = CodeMirror.Pos;

var Completion = module.exports = function (cm, autocomplete, options) {
  var that = this;
  var closeOnBlur;

  this.cm           = cm;
  this.options      = options;
  this.ghost        = null;
  this.widget       = null;
  this._token       = null;
  this.autocomplete = autocomplete;

  // Add a filter function
  if (typeof this.options.filter !== 'function') {
    this.options.filter = function (string) {
      return string.substr(0, this.token.string.length) === this.token.string;
    };
  }

  this.onBlur = function () {
    closeOnBlur = setTimeout(function () { that.removeDisplay(); }, 100);
  };
  this.onFocus = function () {
    clearTimeout(closeOnBlur);
  };
  this.onChange = function (cm, data) {
    // Only update the display when we are inserting or deleting characters
    if (data.origin && data.origin.charAt(0) !== '+') {
      return that.removeDisplay();
    }

    that.showHints();
  };
  this.onCursorActivity = function (cm) {
    if (cm.somethingSelected()) { return that.removeDisplay(); }

    // console.log(cm);
  };

  this.cm.addKeyMap(this.keyMap = {
    Esc:   function () { that.removeDisplay(); },
    Tab:   function () { that.accept(); },
    Right: function () { that.accept(); }
  });

  this.cm.on('blur',           this.onBlur);
  this.cm.on('focus',          this.onFocus);
  this.cm.on('change',         this.onChange);
  this.cm.on('cursorActivity', this.onCursorActivity);

  this.showHints();
};

Completion.prototype.remove = function () {
  this.cm.off('blur',           this.onBlur);
  this.cm.off('focus',          this.onFocus);
  this.cm.off('change',         this.onChange);
  this.cm.off('cursorActivity', this.onCursorActivity);

  this.removeDisplay();
  this.cm.removeKeyMap(this.keyMap);
};

Completion.prototype.accept = function () {
  if (this.ghost) { this.ghost.accept(); }
};

Completion.prototype.filterHints = function () {
  var data = _.extend({}, this.data, {
    list: _.filter(this.data.list, this.options.filter, this.data)
  });

  this.showDisplay(data);
};

Completion.prototype.showHints = function () {
  this.data = this.autocomplete(this.cm, this.options);
  this.filterHints();
};

Completion.prototype.showDisplay = function (data) {
  if (data.list.length) {
    this.showGhost(data);
  } else {
    return this.removeDisplay();
  }

  if (data.list.length > 1) {
    this.showWidget(data);
  } else {
    this.removeWidget();
  }
};

Completion.prototype.removeDisplay = function () {
  this.removeGhost();
  this.removeWidget();
};

Completion.prototype.showGhost = function (data) {
  this.removeGhost();
  this.ghost = new Ghost(this, data, data.list[0]);
};

Completion.prototype.removeGhost = function () {
  if (this.ghost) { this.ghost.remove(); }
};

Completion.prototype.showWidget = function (data) {
  this.removeWidget();
  this.widget = new Widget(this, data);
};

Completion.prototype.removeWidget = function () {
  if (this.widget) { this.widget.remove(); }
};
