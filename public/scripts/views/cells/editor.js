var _    = require('underscore');
var Cell = require('./cell');

var EditorCell = module.exports = Cell.extend();

EditorCell.prototype.events = {
  'keydown': function (e) { e.stopPropagation(); }
};

EditorCell.prototype.initialize = function () {
  // Every editor cell needs a model to function
  this.model = this.model || new this.EditorModel();
};

EditorCell.prototype.EditorModel = require('../../models/entry');

EditorCell.prototype.editorOptions = {
  tabSize:        2,
  lineNumbers:    true,
  lineWrapping:   true,
  viewportMargin: Infinity,
  extraKeys: {
    'Alt-Up': function (cm) {
      cm.view.navigateUp();
    },
    'Alt-Down': function (cm) {
      cm.view.navigateDown();
    },
    // These need to be adjusted for windows with `Ctrl`
    'Cmd-Alt-Up': function (cm) {
      cm.view.moveUp();
    },
    'Cmd-Alt-Down': function (cm) {
      cm.view.moveDown();
    },
    // Need to consider `Cmd-Alt-C` since it's already taken for me
    'Ctrl-Alt-C': function (cm) {
      cm.view.clone();
    },
    'Cmd-Backspace': function (cm) {
      cm.view.remove();
    },
    'Cmd-Alt-B': function (cm) {
      cm.view.switch();
    }
  }
};

EditorCell.prototype.moveUp = function () {
  this.trigger('moveUp', this);
};

EditorCell.prototype.moveDown = function () {
  this.trigger('moveDown', this);
};

EditorCell.prototype.navigateUp = function () {
  this.trigger('navigateUp', this);
};

EditorCell.prototype.navigateDown = function () {
  this.trigger('navigateDown', this);
};

EditorCell.prototype.clone = function () {
  var clone = new this.constructor(_.extend({}, this.options, {
    model: this.model.clone()
  }));
  this.trigger('clone', this, clone);
  return clone;
};

EditorCell.prototype.switch = function () {
  this.trigger('switch', this);
};

EditorCell.prototype.focus = function () {
  this.editor.focus();
  return this;
};

EditorCell.prototype.save = function () {
  this.model.set('value', this.getValue());
  return this;
};

EditorCell.prototype.bindEditor = function () {
  this.listenTo(this.editor, 'focus', _.bind(function () {
    this.el.classList.add('active');
  }, this));

  this.listenTo(this.editor, 'blur', _.bind(function () {
    this.el.classList.remove('active');
  }, this));

  // Set the value of the model every time a change happens
  this.listenTo(this.editor, 'change', _.bind(this.save, this));

  return this;
};

EditorCell.prototype.unbindEditor = function () {
  this.stopListening(this.editor);
  return this;
};

EditorCell.prototype.renderEditor = function () {
  var doc, editorEl;
  // If an editor already exists, rerender the editor keeping the same options
  if (this.editor) {
    this.unbindEditor();
    doc      = this.editor.doc.copy(true);
    // Remove the old CodeMirror instance from the DOM
    editorEl = this.editor.getWrapperElement();
    editorEl.parentNode.removeChild(editorEl);
  }
  // Initialize the codemirror editor
  this.editor = new CodeMirror(_.bind(function (el) {
    this.el.insertBefore(el, this.el.firstChild);
  }, this), _.extend({}, this.editorOptions, {
    // Set to readonly if there is a notebook and we aren't the notebook owner
    readOnly: !this.notebook || this.notebook.isOwner() ? false : 'nocursor'
  }));
  // Move the state of the editor
  if (doc) { this.editor.swapDoc(doc); }
  this.bindEditor();
  // Alias the current view to the editor, since keyMaps are shared between
  // all instances of CodeMirror
  this.editor.view = this;
  return this;
};

EditorCell.prototype.render = function () {
  this.renderEditor();

  // Set the editor value if it already exists
  if (this.model.get('value')) {
    this.setValue(this.model.get('value'));
    this.moveCursorToEnd();
  }

  return this;
};

EditorCell.prototype.getValue = function () {
  return this.editor.getValue();
};

EditorCell.prototype.setValue = function (value) {
  if (_.isString(value)) {
    this.editor.setValue(value);
  }
  return this;
};

EditorCell.prototype.moveCursorToEnd = function (line) {
  this.editor.setCursor(
    isNaN(line) ? this.editor.doc.lastLine() : line,
    Infinity
  );
  return this;
};

EditorCell.prototype.appendTo = function (el) {
  Cell.prototype.appendTo.call(this, el);
  // Since the `render` method is called before being appended to the DOM, we
  // need to refresh the CodeMirror UI so it becomes visible
  this.editor.refresh();
  this.editor.focus();
  return this;
};
