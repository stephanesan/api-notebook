var _          = require('underscore');
var EditorCell = require('./editor');
var stripInput = require('../../lib/cm-strip-input');

var TextCell = module.exports = EditorCell.extend();

TextCell.prototype.editorOptions = _.extend({}, EditorCell.prototype.editorOptions, {
  mode: 'gfm'
});

TextCell.prototype.render = function () {
  EditorCell.prototype.render.call(this);

  this.listenTo(this.editor, 'change', _.bind(function (cm, data) {
    var endCommentBlock = stripInput('*/', cm, data, this.alreadyClosed);
    // When the comment block check doesn't return false, it means we want to
    // start a new comment block
    if (endCommentBlock !== false) {
      this.alreadyClosed = true;
      this.trigger('code', this, endCommentBlock);
    }
    // Set the value to the model every time a change happens
    this.model.set('value', this.getValue());
  }, this));

  return this;
};
