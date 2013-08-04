var _    = require('underscore');
var Cell = require('./base');

var EditorCell = module.exports = Cell.extend();

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
    // Need to consider this shortcut (`Cmd-Alt-C`) since it's already taken for me
    'Ctrl-Alt-C': function (cm) {
      cm.view.clone();
    },
    'Cmd-Backspace': function (cm) {
      cm.view.remove();
    }
  }
};

EditorCell.prototype.remove = function () {
  // Trigger the `remove` event before actually removing the view since we may
  // need to append a new element afterward, etc. Also, after adding the `.off()`
  // fix to `view.js` - no events will work anymore after calling remove.
  this.trigger('remove', this);
  Cell.prototype.remove.call(this);
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

EditorCell.prototype.render = function () {
  // Initialize the codemirror editor
  this.editor = CodeMirror(this.el, this.editorOptions);
  // Alias the current view to the editor, since keyMaps are shared between instances
  this.editor.view = this;
  // Set the values if they already exist
  if (this.model.get('value')) {
    this.setValue(this.model.get('value'));
    this.moveCursorToEnd();
  }
  return this;
};

EditorCell.prototype.clone = function () {
  var clone = new this.constructor(_.extend({}, this.options, {
    model: this.model.clone()
  }));
  console.log(clone);
  this.trigger('clone', this, clone);
  return clone;
};

EditorCell.prototype.focus = function () {
  this.editor.focus();
  return this;
};

EditorCell.prototype.getValue = function () {
  return this.editor.getValue();
};

EditorCell.prototype.setValue = function (text) {
  this.editor.setValue((text || '').trim());
  return this;
};

EditorCell.prototype.moveCursorToEnd = function (line) {
  this.editor.setCursor(line || this.editor.doc.lastLine(), Infinity);
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
