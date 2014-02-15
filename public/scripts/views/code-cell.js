var _          = require('underscore');
var DOMBars    = require('../lib/dombars');
var EditorCell = require('./editor-cell');
var ResultCell = require('./result-cell');
var Completion = require('../lib/completion');
var extraKeys  = require('./lib/extra-keys');
var controls   = require('../lib/controls').code;
var config     = require('../state/config');
var messages   = require('../state/messages');

/**
 * Initialize a new code cell view.
 *
 * @type {Function}
 */
var CodeCell = module.exports = EditorCell.extend({
  className: 'cell cell-code'
});

/**
 * Runs when the code cell is initialized.
 */
CodeCell.prototype.initialize = function () {
  EditorCell.prototype.initialize.apply(this, arguments);

  this.listenTo(config, 'codeReadOnly', function () {
    this.data.set('readOnly', config.get('codeReadOnly'));
    this.renderEditor();
  });

  this.listenTo(this.model, 'isError', function (isError) {
    this.el.classList[isError ? 'add' : 'remove']('cell-code-error');
  });
};

/**
 * Default cell model attributes.
 *
 * @type {Object}
 */
CodeCell.prototype.cellAttributes = {
  type: 'code'
};

/**
 * Merge the editor cell template with the code cell.
 *
 * @type {Function}
 */
CodeCell.prototype.template = DOMBars.Utils.mergeTemplates(
  EditorCell.prototype.template, require('../../templates/views/code-cell.hbs')
);

/**
 * Extend the editor cell with an event for triggering execute.
 *
 * @type {Object}
 */
CodeCell.prototype.events = _.extend({
  'click .cell-execute': function () {
    return this.execute();
  }
}, EditorCell.prototype.events);

/**
 * Extend the editor cell controls with custom controls.
 *
 * @type {Array}
 */
CodeCell.prototype.cellControls = _.extend(
  [], EditorCell.prototype.cellControls
);

// Push the execute command into the menu.
CodeCell.prototype.cellControls.push(_.find(controls, function (control) {
  return control.command === 'execute';
}));

/**
 * Sets the options to be used by the CodeMirror instance when initialized.
 *
 * @type {Object}
 */
CodeCell.prototype.editorOptions = _.extend(
  {}, EditorCell.prototype.editorOptions, {
    mode: 'javascript',
    lineNumberFormatter: function (line) {
      return String((this.view.startLine || 1) + line - 1);
    }
  }
);

/**
 * Defines extra keys to be used by the editor for code cell.
 *
 * @type {Object}
 */
CodeCell.prototype.editorOptions.extraKeys = _.extend(
  {}, EditorCell.prototype.editorOptions.extraKeys, extraKeys(controls)
);

/**
 * Attempt to save the current cell contents. However, we need to have a safe
 * guard in place in case we have browsed to another cells contents and aren't
 * editing our own model.
 *
 * @return {CodeCell}
 */
CodeCell.prototype.save = function () {
  this.model.set('value', this.editor.getValue());

  return this;
};

/**
 * Refreshes the code cell calculations. This includes things such as the length
 * of the code cell, position in the nodebook collection, etc.
 *
 * @return {CodeCell}
 */
CodeCell.prototype.refresh = function () {
  var prevCodeView = this.getPrevCodeView();
  this.startLine = _.result(prevCodeView, 'lastLine') + 1 || 1;
  this.lastLine  = this.startLine + this.editor.lastLine();

  if (this._resultCell) {
    this._resultCell.refresh();
  }

  return EditorCell.prototype.refresh.call(this);
};

/**
 * Returns the next code view in the notebook collection.
 *
 * @return {CodeCell}
 */
CodeCell.prototype.getNextCodeView = function () {
  if (this.model.collection) {
    return _.result(this.model.collection.getNextCode(this.model), 'view');
  }
};

/**
 * Returns the previous code view in the notebook collection.
 *
 * @return {CodeCell}
 */
CodeCell.prototype.getPrevCodeView = function () {
  if (this.model.collection) {
    return _.result(this.model.collection.getPrevCode(this.model), 'view');
  }
};

/**
 * Execute the code cell contents and render the result.
 *
 * @param {Function} done
 */
CodeCell.prototype.execute = function (done) {
  // Set the value as our own model for executing.
  this.model.set('value', this.editor.getValue());

  // First run previous cells if they need to be run.
  this.notebook.executePrevious(this, _.bind(function () {
    // Add a class to the cell to display execution.
    this.data.set('executing', true);

    this.notebook.sandbox.execute(this.getValue(), _.bind(function (err, data) {
      this.data.set({
        executed:  true,
        executing: false
      });

      this.model.set({
        isError: data.isError,
        result:  data.result
      });

      if (this._resultCell) {
        this._resultCell.remove();
      }

      this.renderResult();
      this.trigger('execute', this, data);
      return done && done(err, data);
    }, this));
  }, this));
};

/**
 * Render the model result.
 */
CodeCell.prototype.renderResult = function () {
  // Trigger `execute` and set the result, each of which need an additional
  // flag to indicate whether the the
  this._resultCell = new ResultCell({ model: this.model }).render();
  this._resultCell.appendTo(this.el);
  messages.trigger('resize');
};

/**
 * Create a new line in the editor.
 */
CodeCell.prototype.newLine = function () {
  this.editor.execCommand('newlineAndIndent');
};

/**
 * Set up the editor instance and bindings.
 *
 * @return {CodeCell}
 */
CodeCell.prototype.bindEditor = function () {
  EditorCell.prototype.bindEditor.call(this);

  // Set up the autocompletion widget.
  this._completion = new Completion(
    this.editor, this.notebook.completionOptions
  );

  // Listen for code cells changes and update line numbers.
  this.listenTo(this, 'change', function () {
    this.lastLine = this.startLine + this.editor.lastLine();
  }, this);

  return this;
};

/**
 * Remove all editor instance data.
 *
 * @return {CodeCell}
 */
CodeCell.prototype.unbindEditor = function () {
  this._completion.remove();
  delete this._completion;
  return EditorCell.prototype.unbindEditor.call(this);
};
