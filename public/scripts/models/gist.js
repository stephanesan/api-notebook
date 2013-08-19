var _        = require('underscore');
var Backbone = require('backbone');

var NotebookCollection = require('../collections/notebook');

var Gist = module.exports = Backbone.Model.extend({
  // Setting sane defaults
  defaults: {
    public: false
  },
  urlRoot: 'https://api.github.com/gists'
});

Gist.prototype.initialize = function (attributes, options) {
  this.user     = options && options.user;
  this.notebook = new NotebookCollection();
};

Gist.prototype.save = function (attrs, options) {
  attrs = _.pick(attrs || this.toJSON(), 'files', 'public');
  Backbone.Model.prototype.save.call(this, attrs, options);
};

Gist.prototype.url = function () {
  return this.authUrl(Backbone.Model.prototype.url.call(this));
};

Gist.prototype.authUrl = function (url) {
  var token = this.user && this.user.get('accessToken');
  // Append the Github access token to every request
  return token ? (url + '?access_token=' + encodeURIComponent(token)) : url;
};

Gist.prototype.isOwner = function () {
  if (!this.get('id')) { return true; }
  return !!this.get('user') &&
    this.get('user').id === (this.user && this.user.get('id'));
};

Gist.prototype.fork = function (cb) {
  if (!this.id) { return false; }

  var url = this.authUrl(
    _.result(this, 'urlRoot') + '/' + encodeURIComponent(this.id) + '/forks'
  );

  Backbone.$.ajax({
    url:  url,
    type: 'POST',
    success: _.bind(function (data) {
      cb(null, new Gist(JSON.parse(data), { user: this.user }));
    }, this),
    error: function (error) {
      cb(error);
    }
  })
};

Gist.prototype.setNotebook = function (notebook) {
  return this.set('files', {
    'notebook.md': {
      content: notebook
    }
  });
};

Gist.prototype.getNotebook = function () {
  return this.get('files') && this.get('files')['notebook.md'] &&
    this.get('files')['notebook.md'].content;
};
