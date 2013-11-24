var _           = require('underscore');
var View        = require('./view');
var messages    = require('../state/messages');
var persistence = require('../state/persistence');

/**
 * Create a new raw notebook editor instance.
 *
 * @type {Function}
 */
var EditNotebook = module.exports = View.extend({
  className: 'notebook-edit'
});

/**
 * Render the notebook editor.
 *
 * @return {EditNotebook}
 */
EditNotebook.prototype.render = function () {
  this.editor = new CodeMirror(this.el, {
    mode:           'gfm',
    value:          persistence.get('contents'),
    tabSize:        2,
    lineNumbers:    true,
    lineWrapping:   true,
    viewportMargin: Infinity
  });

  // Update the persistence code every time we change the content.
  this.listenTo(this.editor, 'change', function (cm) {
    messages.trigger('resize');
    persistence.set('contents', cm.getValue());
  });

  this.listenTo(messages, 'refresh', _.bind(this.editor.refresh, this.editor));

  this.listenTo(persistence, 'change:contents', function () {
    if (persistence.get('contents') === this.editor.getValue()) { return; }

    this.editor.setValue(persistence.get('contents'));
  });

  return this;
};
