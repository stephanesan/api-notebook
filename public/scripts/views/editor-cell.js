var _            = require('underscore');
var View         = require('./template');
var template     = require('../../templates/views/editor-cell.hbs');
var extraKeys    = require('./lib/extra-keys');
var controls     = require('../lib/controls').editor;
var messages     = require('../state/messages');
var domListen    = require('../lib/dom-listen');
var CellButtons  = require('./cell-buttons');
var CellControls = require('./cell-controls');
var embedProtect = require('./lib/embed-protect');
var cellControls = new CellControls();

var triggerSelf = function (obj, method) {
  obj[method] = embedProtect(function () {
    this.trigger(method, this);
  });
};

/**
 * Create a generic editor cell instance view.
 *
 * @type {Function}
 */
var EditorCell = module.exports = View.extend({
  className: 'cell cell-editor'
});

/**
 * Embed the editor cell template.
 *
 * @type {Function}
 */
EditorCell.prototype.template = template;

/**
 * Runs when we initialize the editor cell.
 */
EditorCell.prototype.initialize = function () {
  View.prototype.initialize.apply(this, arguments);
  this.model      = this.model || new this.EditorModel();
  this.model.view = this;
};

/**
 * Sets a fallback model to initialize.
 *
 * @type {Function}
 */
EditorCell.prototype.EditorModel = require('../models/cell');

/**
 * Event listeners for all editor cells in the notebook.
 *
 * @type {Object}
 */
EditorCell.prototype.events = {
  'mousedown .cell-menu-toggle':  'showControls',
  'touchstart .cell-menu-toggle': 'showControls'
};

/**
 * Set the base editor options used in CodeMirror.
 *
 * @type {Object}
 */
EditorCell.prototype.editorOptions = {
  tabSize:        2,
  lineNumbers:    true,
  lineWrapping:   true,
  viewportMargin: Infinity,
  extraKeys:      extraKeys(controls)
};

/**
 * Remove the editor cell.
 *
 * @return {EditorCell}
 */
EditorCell.prototype.remove = embedProtect(function () {
  View.prototype.remove.call(this);
  messages.trigger('resize');

  return this;
});

/**
 * Clones the editor cell and triggers a clone event with the cloned view.
 *
 * @return {EditorCell} Cloned view.
 */
EditorCell.prototype.clone = embedProtect(function () {
  var clone = new this.constructor(_.extend({}, {
    model: this.model.clone()
  }));
  this.trigger('clone', this, clone);
  return clone;
});

/**
 * Inserts a new line directly below the current line. Keeps previous cursor
 * history so undo puts the cursor back to the same position.
 */
EditorCell.prototype.newLineBelow = function () {
  var line = this.editor.getCursor().line;

  this.editor.doc.replaceRange('\n', {
    ch:   Infinity,
    line: line++
  });
  this.editor.indentLine(line, null, true);
  this.editor.doc.setCursor({
    cm:   Infinity,
    line: line
  });
};

/**
 * Toggle comments in the current editor instance.
 */
EditorCell.prototype.toggleComment = function () {
  this.editor.execCommand('toggleComment');
};

/**
 * Focus the editor cell.
 *
 * @return {EditorCell}
 */
EditorCell.prototype.focus = function () {
  // Set a hidden focus flag so we can use it to check in tests
  this._hasFocus = true;

  // Make focusing the editor async since it triggers other events such as
  // scrolling into view which interferes with iframe resizing events.
  process.nextTick(_.bind(this.editor.focus, this.editor));
  return this;
};

/**
 * Check whether the current cell has focus.
 *
 * @return {Boolean}
 */
EditorCell.prototype.hasFocus = function () {
  return this._hasFocus || (!!this.editor && this.editor.hasFocus());
};

/**
 * Attempt to save the editor contents.
 *
 * @return {EditorCell}
 */
EditorCell.prototype.save = function () {
  if (this.editor) {
    this.model.set('value', this.editor.getValue());
  }

  return this;
};

/**
 * Refresh the editor instance.
 *
 * @return {EditorCell}
 */
EditorCell.prototype.refresh = function () {
  if (this.editor) {
    this.editor.refresh();
  }

  return this;
};

/**
 * Set up bindings with the CodeMirror instance.
 *
 * @return {EditorCell}
 */
EditorCell.prototype.bindEditor = function () {
  this.listenTo(this.editor, 'focus', _.bind(function () {
    delete this._hasFocus;

    if (this._triggerBlur) {
      window.clearTimeout(this._triggerBlur);
      return this._triggerBlur = null;
    }

    this.trigger('focus', this);
    this.el.classList.add('active');
  }, this));

  this.listenTo(this.editor, 'blur', _.bind(function () {
    this._triggerBlur = window.setTimeout(_.bind(function () {
      this.el.classList.remove('active');
      this.trigger('blur', this);
    }, this), 20);
  }, this));

  // Save the value of the model every time a change happens
  this.listenTo(this.editor, 'change', _.bind(function (cm, data) {
    this.save();
    messages.trigger('resize');

    // When the presented data looks line a new line has been added, emit an
    // event the notebook can listen to.
    if (data.text.length > 1 || data.from.line !== data.to.line) {
      this.trigger('linesChanged', this);
    }

    this.trigger('change', this, data);
  }, this));

  return this;
};

/**
 * Remove all bindings set up with the CodeMirror instance.
 *
 * @return {EditorCell}
 */
EditorCell.prototype.unbindEditor = function () {
  this.stopListening(this.editor);
  window.clearTimeout(this._triggerBlur);
  this._triggerBlur = null;
  return this;
};

/**
 * Remove the CodeMirror view from the DOM.
 *
 * @return {EditorCell}
 */
EditorCell.prototype.removeEditor = function () {
  if (!this.editor) { return this; }

  // Cache history for cell re-renders.
  this._history = this.editor.doc.getHistory();
  this.unbindEditor();

  // Remove the old CodeMirror instance from the DOM.
  var editorEl = this.editor.getWrapperElement();
  if (editorEl && editorEl.parentNode) {
    editorEl.parentNode.removeChild(editorEl);
  }

  // Delete any reference to the CodeMirror instance.
  delete this.editor;

  return this;
};

/**
 * Set the controls to display in the cell menu.
 *
 * @type {Array}
 */
EditorCell.prototype.cellControls = _.filter(controls, function (control) {
  return {
    moveUp:    true,
    moveDown:  true,
    switch:    true,
    clone:     true,
    remove:    true,
    appendNew: true
  }[control.command];
});

/**
 * Render a CodeMirror instance inside the view.
 *
 * @return {EditorCell}
 */
EditorCell.prototype.renderEditor = function () {
  // Remove the currently rendered editor from all references.
  this.removeEditor();

  // If an editor already exists, rerender the editor keeping the same options
  // Initialize the codemirror editor.
  this.editor = new CodeMirror(_.bind(function (el) {
    this.el.insertBefore(el, this.el.firstChild);
  }, this), _.extend({
    view:     this,
    readOnly: this.isReadOnly()
  }, this.editorOptions));

  // Add an extra css class for helping with styling read-only editors.
  if (this.editor.getOption('readOnly')) {
    this.editor.getWrapperElement().className += ' CodeMirror-readOnly';
  }

  // Alias the current view to the editor, since keyMaps are shared between
  // all instances of CodeMirror.
  this.editor.view = this;

  // Set the editor value if it already exists.
  if (this.getValue()) {
    this.editor.setValue(this.getValue());
    this.moveCursorToEnd();
  }

  // Bind the editor events at the end in case of any focus issues when
  // changing docs, etc.
  this.bindEditor();

  // Swap the previous history in place. Otherwise, assume this is a brand new
  // editor instance and clear all history.
  if (this._history) {
    this.editor.doc.setHistory(this._history);
    delete this._history;
  } else {
    this.editor.doc.clearHistory();
  }

  return this;
};

/**
 * Render the editor cell and attach the controls.
 *
 * @return {EditorCell}
 */
EditorCell.prototype.render = function () {
  View.prototype.render.call(this);
  this.renderEditor();

  // Refresh the editor cells when refresh is triggered through messages.
  this.listenTo(messages, 'refresh', this.refresh);

  var timeout       = 200; // ms
  var aboveListener = domListen(this.el.querySelector('.cell-border-above'));
  var belowListener = domListen(this.el.querySelector('.cell-border-below'));

  var showAboveTimeout;
  var showBelowTimeout;

  this.listenTo(aboveListener, 'mouseenter', function () {
    showAboveTimeout = setTimeout(_.bind(this.showButtonsAbove, this), timeout);
  });

  this.listenTo(belowListener, 'mouseenter', function () {
    showBelowTimeout = setTimeout(_.bind(this.showButtonsBelow, this), timeout);
  });

  this.listenTo(aboveListener, 'mouseleave', function () {
    window.clearTimeout(showAboveTimeout);
  });

  this.listenTo(belowListener, 'mouseleave', function () {
    window.clearTimeout(showBelowTimeout);
  });

  return this;
};

/**
 * Create a cell controls instance and append to the editor cell.
 *
 * @param  {Object}       e
 * @return {CellControls}
 */
EditorCell.prototype.showControls = function (e) {
  e.stopPropagation();

  // Alias the displayed controls.
  cellControls.controls = this.cellControls;

  var controls = cellControls.render().appendTo(this.el);

  this.listenTo(controls, 'remove', this.stopListening);
  this.listenTo(controls, 'action', function (_, action) {
    return this[action]();
  });

  return controls;
};

/**
 * Create a cell buttons instance and show it above the notebook cell.
 *
 * @return {CellButtons}
 */
EditorCell.prototype.showButtonsAbove = function () {
  var buttons = new CellButtons();
  this.data.set('cellButtonsAbove', buttons);

  this.listenTo(buttons, 'remove', function (view) {
    this.stopListening(view);
    this.data.unset('cellButtonsAbove');
  });

  this.listenTo(buttons, 'action', function (_, action) {
    return this[action + 'Above']();
  });

  return buttons;
};

/**
 * Create a cell buttons instance and show it below the notebook cell.
 *
 * @return {CellButtons}
 */
EditorCell.prototype.showButtonsBelow = function () {
  var buttons = new CellButtons();
  this.data.set('cellButtonsBelow', buttons);

  this.listenTo(buttons, 'remove', function (view) {
    this.stopListening(view);
    this.data.unset('cellButtonsBelow');
  });

  this.listenTo(buttons, 'action', function (_, action) {
    return this[action + 'Below']();
  });

  return buttons;
};

/**
 * Get the current value of the cell.
 *
 * @return {String}
 */
EditorCell.prototype.getValue = function () {
  return this.model.get('value');
};

/**
 * Sets the value of the current editor instance.
 *
 * @param  {String}     value
 * @return {EditorCell}
 */
EditorCell.prototype.setValue = function (value) {
  if (_.isString(value)) {
    if (this.editor) {
      this.editor.setValue(value);
    } else {
      this.model.set('value', value);
    }
  }

  return this;
};

/**
 * Moves the CodeMirror cursor to the end of document, or end of the line.
 *
 * @param  {Number}     line
 * @return {EditorCell}
 */
EditorCell.prototype.moveCursorToEnd = function (line) {
  if (!this.editor) { return this; }

  this.editor.setCursor(
    isNaN(line) ? this.editor.doc.lastLine() : line,
    Infinity
  );

  return this;
};

/**
 * Appends the editor cell to an element.
 *
 * @param  {Node}       el
 * @return {EditorCell}
 */
EditorCell.prototype.appendTo = function (el) {
  View.prototype.appendTo.call(this, el);

  // Since the `render` method is called before being appended to the DOM, we
  // need to refresh the CodeMirror UI so it becomes visible
  if (this.editor) {
    this.refresh();

    // Since the CodeMirror refresh appears to be async, push the resize event
    // into the following event loop.
    process.nextTick(function () {
      messages.trigger('resize');
    });
  }

  return this;
};

/**
 * Checks whether the current user is the current owner of the cell and able to
 * edit it.
 *
 * @return {Boolean}
 */
EditorCell.prototype.isReadOnly = function () {
  return this.data.get('readOnly');
};

/**
 * Add a few simple binding for just proxying events.
 */
triggerSelf(EditorCell.prototype, 'switch');
triggerSelf(EditorCell.prototype, 'moveUp');
triggerSelf(EditorCell.prototype, 'moveDown');
triggerSelf(EditorCell.prototype, 'navigateUp');
triggerSelf(EditorCell.prototype, 'navigateDown');
triggerSelf(EditorCell.prototype, 'newTextAbove');
triggerSelf(EditorCell.prototype, 'newCodeAbove');
triggerSelf(EditorCell.prototype, 'newTextBelow');
triggerSelf(EditorCell.prototype, 'newCodeBelow');

/**
 * Alias the append new cell below function to creating a new code cell.
 *
 * @type {Function}
 */
EditorCell.prototype.appendNew = EditorCell.prototype.newCodeBelow;
