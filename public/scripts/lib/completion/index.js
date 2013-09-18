var _          = require('underscore');
var Widget     = require('./widget');
var completion = require('../codemirror/sandbox-completion');

/**
 * The completion widget is a constructor function that is used with CodeMirror
 * instances.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     options
 * @return {Completion}
 */
var Completion = module.exports = function (cm, options) {
  var that          = this;
  var closeOnCursor = true;
  var closeOnBlur;

  this.cm      = cm;
  this.options = options || {};

  this.cm.state.completionActive = this;

  /**
   * Close the currently open widget when we blur the editor. However, we want
   * to allow a small grace period in case we are clicking a widget suggestion.
   */
  this.onBlur = function () {
    closeOnBlur = setTimeout(function () { that.removeWidget(); }, 20);
  };

  /**
   * On editor focus, we clear the current blur timeout.
   */
  this.onFocus = function () {
    clearTimeout(closeOnBlur);
  };

  /**
   * Change events are where all the action happens.
   * @param  {CodeMirror} cm
   * @param  {Object}     event
   */
  this.onChange = function (cm, event) {
    closeOnCursor = false;

    // Only update the display when we are inserting or deleting characters
    if (!event.origin || event.origin.charAt(0) !== '+') {
      return that.removeWidget();
    }

    var closeOn  = /[^$_a-zA-Z0-9]/;
    var remove   = event.origin === '+delete';
    var text     = event[remove ? 'removed' : 'text'].join('\n');

    // Check whether any of the character was a close character. If it was,
    // close the widget and remove from the DOM.
    if (closeOn.test(text)) {
      that.removeWidget();
      // Save some additional processing by returning if the text is not a
      // period (since we want to trigger completion here immediately).
      if (text !== '.') { return; }
    }

    var nextPos  = event.from.ch + (remove ? 0 : 1);
    var nextChar = cm.getLine(event.from.line).charAt(nextPos);

    // If completion is currently active, trigger a refresh event (filter the
    // current suggestions using updated character position information).
    // Otherwise, we need to show a fresh widget.
    if (that._completionActive) {
      that.refresh();
    } else if (!nextChar || closeOn.test(nextChar)) {
      that.showWidget();
    }
  };

  /**
   * Cursor activity should close the widget, except for when the activity is
   * actually the result of some text input.
   *
   * @param  {CodeMirror} cm
   */
  this.onCursorActivity = function (cm) {
    if (closeOnCursor) {
      return that.removeWidget();
    }

    closeOnCursor = true;
  };

  // Attaches all relevant event listeners.
  this.cm.on('blur',           this.onBlur);
  this.cm.on('focus',          this.onFocus);
  this.cm.on('change',         this.onChange);
  this.cm.on('cursorActivity', this.onCursorActivity);
};

/**
 * Remove all completion helpers.
 *
 * @return {Completion}
 */
Completion.prototype.remove = function () {
  this.removeWidget();
  delete this.cm.state.completionActive;
  this.cm.off('blur',           this.onBlur);
  this.cm.off('focus',          this.onFocus);
  this.cm.off('change',         this.onChange);
  this.cm.off('cursorActivity', this.onCursorActivity);

  return this;
};

/**
 * Refresh the current completion.
 *
 * @param  {Function} done
 */
Completion.prototype.refresh = function (done) {
  if (this.widget) {
    return this.widget.refresh(done);
  }

  return done && done();
};

/**
 * Show a scrollable completion widget.
 */
Completion.prototype.showWidget = function () {
  this.removeWidget();
  this._completionActive = true;
  completion(this.cm, this.options, _.bind(function (err, data) {
    if (this._completionActive && data) {
      this.widget = new Widget(this, data);
    } else {
      this._completionActive = false;
    }
  }, this));
};

/**
 * Removes the currently display widget.
 */
Completion.prototype.removeWidget = function () {
  this._completionActive = false;
  if (this.widget) { this.widget.remove(); }
};
