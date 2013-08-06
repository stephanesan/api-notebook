var View     = require('./view');
var Notebook = require('./notebook');

// Alias `App` to `window` for testing purposes
var App = module.exports = window.App = View.extend({
  className: 'application'
});

// Alias all the available views
App.View = {
  View:       require('./view'),
  Notebook:   require('./notebook'),
  Cell:       require('./cells/cell'),
  CodeCell:   require('./cells/code'),
  TextCell:   require('./cells/text'),
  EditorCell: require('./cells/editor'),
  ResultCell: require('./cells/result')
};

// Alias all the available models
App.Model = {
  Entry:     require('../models/entry'),
  CodeEntry: require('../models/code-entry'),
  TextEntry: require('../models/text-entry')
};

// Alias all the available collections
App.Collection = {
  Notebook: require('../collections/notebook')
};

App.prototype.initialize = function () {
  // Creates a new working notebook and appends it to the current application
  this.notebook = new App.View.Notebook({
    collection: new App.Collection.Notebook()
  });
};

App.prototype.render = function () {
  View.prototype.render.call(this);
  this.notebook.render();
  return this;
};

App.prototype.appendTo = function () {
  View.prototype.appendTo.apply(this, arguments);
  this.notebook.appendTo(this.el);
};
