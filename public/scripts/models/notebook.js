var Backbone = require('backbone');
var Meta     = require('./meta');

/**
 * Create a notebook constructor for handling the notebook state.
 *
 * @type {[type]}
 */
var Notebook = module.exports = Backbone.Model.extend({
  defaults: {
    id:      null,
    meta:    null,
    cells:   [],
    ownerId: null,
    content: ''
  }
});

/**
 * Fix the notebook saying it's not new when it has an empty id.
 *
 * @return {Boolean}
 */
Notebook.prototype.isNew = function () {
  return !this.get('id');
};

/**
 * Set fresh model data when initializing.
 */
Notebook.prototype.initialize = function () {
  this.set('meta', new Meta({
    title: 'Untitled Notebook'
  }));
  this.set('cells', []);
};

/**
 * Clone the notebook instance.
 *
 * @return {Notebook}
 */
Notebook.prototype.clone = function () {
  var notebook = new Notebook(this.toJSON());

  notebook.unset('id');
  notebook.set('meta', this.get('meta').clone());

  return notebook;
};
