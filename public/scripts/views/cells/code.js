var _          = require('underscore');
var EditorCell = require('./editor');
var ResultCell = require('./result');
var sandbox    = require('../../lib/sandbox');
var stripInput = require('../../lib/cm-strip-input');

var CodeCell = module.exports = EditorCell.extend();

CodeCell.prototype.initialize = function () {
  EditorCell.prototype.initialize.apply(this, arguments);
  // Need a way of keeping the internal editor cell reference, since we can move
  // up and down between other statements.
  this._editorCid = this.model.cid;
};

CodeCell.prototype.execute = function () {
  var err, result;

  try {
    this.result.setResult(result = sandbox.execute(this.getValue()));
  } catch (e) {
    this.result.setError(err = e);
  }

  this.save();
  this.trigger('execute', this, err, result);
};

CodeCell.prototype.editorOptions = _.extend({}, EditorCell.prototype.editorOptions, {
  mode: 'javascript'
});

CodeCell.prototype.editorOptions.extraKeys = _.extend({}, CodeCell.prototype.editorOptions.extraKeys, {
  // When we press enter, it should trigger a new computation. However, it
  // appears that `extraKeys` are shared between all instances so it's not
  // as easy as just binding `this` to the function.
  'Enter': function (cm) {
    cm.view.execute();
    cm.view.trigger('close', cm.view);
  },
  'Up': function (cm) {
    if (cm.doc.getCursor().line === 0) {
      return cm.view.browseUp();
    }
    CodeMirror.commands.goLineUp(cm);
  },
  'Down': function (cm) {
    if (cm.doc.getCursor().line === cm.doc.lastLine()) {
      return cm.view.browseDown();
    }
    CodeMirror.commands.goLineDown(cm);
  },
  // Alias shift enter to the normal enter behaviour
  'Shift-Enter': CodeMirror.keyMap.basic.Enter
});

CodeCell.prototype.save = function () {
  this._editorCid = this.model.cid;
  this.model.set('value', this.getValue());
};

CodeCell.prototype.browseUp = function () {
  if (this._editorCid === this.model.cid) { this.save(); }

  this.trigger('browseUp', this, this._editorCid);
};

CodeCell.prototype.browseDown = function () {
  if (this._editorCid === this.model.cid) { this.save(); }

  this.trigger('browseDown', this, this._editorCid);
};

CodeCell.prototype.browseCell = function (model) {
  this._editorCid = model.cid;
  this.setValue(model.get('value'));
};

CodeCell.prototype.render = function () {
  EditorCell.prototype.render.call(this);

  this.listenTo(this.editor, 'change', _.bind(function (cm, data) {
    var commentBlock = stripInput('/*', cm, data);
    // When the comment block check doesn't return false, it means we want to
    // start a new comment block
    commentBlock !== false && this.trigger('text', this, commentBlock);
  }, this));

  // Every code cell has an associated result
  this.result = new ResultCell();
  this.result.render().appendTo(this.el);

  return this;
};
