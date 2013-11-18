var _            = require('underscore');
var marked       = require('marked');
var domify       = require('domify');
var EditorCell   = require('./editor-cell');
var messages     = require('../state/messages');
var ownerProtect = require('./lib/owner-protect');

/**
 * Create a new text cell instance.
 *
 * @type {Function}
 */
var TextCell = module.exports = EditorCell.extend({
  className: 'cell cell-text'
});

/**
 * Listen for events on text cell instances.
 *
 * @type {Object}
 */
TextCell.prototype.events = _.extend({
  /**
   * When we click anywhere in the cell, trigger focus and editing mode. We
   * should ignore any clicks on links, etc.
   *
   * @param {Object} e
   */
  'click': function (e) {
    if (this.hasFocus() || e.target.tagName === 'A') {
      return;
    }

    return this.focus();
  }
}, EditorCell.prototype.events);

/**
 * The fallback model instance.
 *
 * @type {Function}
 */
TextCell.prototype.EditorModel = require('../models/text-cell');

/**
 * Options that will be passed to the CodeMirror instance.
 *
 * @type {Object}
 */
TextCell.prototype.editorOptions = _.extend(
  {},
  EditorCell.prototype.editorOptions,
  {
    mode: 'gfm',
    theme: 'text-cell'
  }
);

/**
 * Binds the CodeMirror instance with any listeners.
 *
 * @return {TextCell}
 */
TextCell.prototype.bindEditor = function () {
  EditorCell.prototype.bindEditor.call(this);

  // Listen to itself since editor cells have a built in protection here.
  this.listenTo(this, 'blur', function () {
    delete this._hasFocus;
    this.renderEditor();
  });

  return this;
};

/**
 * Refresh the text cell instance.
 *
 * @return {TextCell}
 */
TextCell.prototype.refresh = function () {
  if (this.editor) {
    EditorCell.prototype.refresh.call(this);
  }

  return this;
};

/**
 * Focus the text cell instance. If the CodeMirror editor is not currently
 * rendered, it will be rendered.
 *
 * @return {TextCell}
 */
TextCell.prototype.focus = ownerProtect(function () {
  this._hasFocus = true;
  this.renderEditor();
  return EditorCell.prototype.focus.call(this);
});

/**
 * Set the value of the text cell. Switches between updating the CodeMirror view
 * and the Markdown rendered preview.
 *
 * @param  {String}   value
 * @return {TextCell}
 */
TextCell.prototype.setValue = function (value) {
  if (this.editor) {
    return EditorCell.prototype.setValue.apply(this, arguments);
  }

  // Rerender markdown cell
  this.model.set('value', value);
  return this.renderMarkdown();
};

/**
 * Render the value as markdown.
 *
 * @return {TextCell}
 */
TextCell.prototype.renderMarkdown = function () {
  this.removeMarkdown();

  this.markdownElement = this.el.insertBefore(
    domify('<div class="markdown"></div>'), this.el.firstChild
  );

  marked(this.getValue(), {
    gfm: true,
    // highlight: function () {},
    tables: true,
    breaks: true,
    pedantic: false,
    sanitize: true,
    smartLists: true,
    smartypants: false,
    langPrefix: 'lang-'
  }, _.bind(function (err, html) {
    try {
      html = domify(html);
    } catch (e) {
      html = document.createTextNode(html);
    }

    this.markdownElement.appendChild(html);
  }, this));

  return this;
};

/**
 * Remove the rendered Markdown cell.
 *
 * @return {TextCell}
 */
TextCell.prototype.removeMarkdown = function () {
  if (this.markdownElement) {
    this.markdownElement.parentNode.removeChild(this.markdownElement);
    delete this.markdownElement;
  }

  return this;
};

/**
 * Switches between rendering the regular CodeMirror editor and a Markdown
 * preview based on whether we are trying to focus the cell.
 *
 * @return {TextCell}
 */
TextCell.prototype.renderEditor = function () {
  if (this._hasFocus) {
    this.removeMarkdown();
    EditorCell.prototype.renderEditor.call(this);
  } else {
    this.removeEditor();
    this.renderMarkdown();
  }

  process.nextTick(function () {
    messages.trigger('state:resize');
  }, 0);

  return this;
};
