var _           = require('underscore');
var marked      = require('marked');
var domify      = require('domify');
var Backbone    = require('backbone');
var EditorCell  = require('./editor');
var stripInput  = require('../../lib/cm-strip-input');
var insertAfter = require('../../lib/insert-after');

var TextCell = module.exports = EditorCell.extend({
  className: 'cell cell-text'
});

TextCell.prototype.EditorModel = require('../../models/text-entry');

TextCell.prototype.editorOptions = _.extend(
  {},
  EditorCell.prototype.editorOptions,
  {
    mode: 'gfm',
    theme: 'text-cell'
  }
);

TextCell.prototype.closeCell = function (code) {
  this.alreadyClosed = true;
  this.trigger('code', this, code);
  this.el.classList.add('text-closed');
};

TextCell.prototype.bindEditor = function () {
  var markdownElement = this.el.insertBefore(
    domify('<div class="markdown"></div>'), this.el.firstChild
  );

  EditorCell.prototype.bindEditor.call(this);

  this.listenTo(this.editor, 'change', _.bind(function (cm, data) {
    var endCommentBlock = stripInput('*/', cm, data);
    // When we detect the closing comment block, set `this.alreadyClosed`
    // since it doesn't make sense to be able to close it more than once
    if (endCommentBlock !== false) { this.closeCell(endCommentBlock); }
  }, this));

  // This whole functionality needs a rewrite once we merge with the server-side
  // code since I imagine there won't be any need for an editor if we don't own
  // the notebook and can't edit it.
  this.listenTo(this.editor, 'blur', _.bind(function () {
    var editorElement    = this.editor.getWrapperElement();
    var $markdownElement = Backbone.$(markdownElement);
    var commentElements  = this.el.getElementsByClassName('comment');

    markdownElement.innerHTML = '';

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
      editorElement.style.display = 'none';
      _.each(commentElements, function (el) { el.style.display = 'none'; });
      markdownElement.appendChild(domify(html));
    }, this));

    // Any clicks on the markdown element should refocus the text editor
    this.listenTo($markdownElement, 'click', _.bind(function (e) {
      markdownElement.innerHTML = '';
      this.stopListening($markdownElement);

      // TODO: Improve interactions here, should calculate where exactly I
      // clicked and put the cursor in the same position in the editor.
      editorElement.style.display = 'block';
      _.each(commentElements, function (el) { el.style.display = 'block'; });
      this.focus();
    }, this));
  }, this));

  return this;
};

TextCell.prototype.render = function () {
  EditorCell.prototype.render.call(this);

  this.el.appendChild(domify('<div class="comment comment-open">/*</div>'));
  this.el.appendChild(domify('<div class="comment comment-close">*/</div>'));

  return this;
};
