var _        = require('underscore');
var Backbone = require('backbone');

var NotebookCollection = require('../collections/notebook');

var Gist = module.exports = Backbone.Model.extend({
  urlRoot: 'https://api.github.com/gists'
});

Gist.prototype.initialize = function (attributes, options) {
  this.user     = options.user;
  this.notebook = new NotebookCollection();
  // Setting sane defaults
  this.set('public', false);
};

Gist.prototype.save = function (attrs, options) {
  attrs = _.pick(attrs || this.toJSON(), 'files', 'public');
  Backbone.Model.prototype.save.call(this, attrs, options);
};

Gist.prototype.url = function () {
  var url   = Backbone.Model.prototype.url.call(this);
  var token = this.user.get('accessToken');
  // Append the Github access token to every request
  return url + '?access_token=' + encodeURIComponent(token);
};

Gist.prototype.setNotebook = function (notebook) {
  return this.set('files', {
    'notebook.md': {
      content: notebook
    }
  });
};

Gist.prototype.getNotebook = function () {
  return this.get('files') && this.get('files')['notebook.md'].content;
};
