var View        = require('./view');
var persistence = require('../state/persistence');

/**
 * Create a new raw notebook instance.
 *
 * @type {Function}
 */
var RawNotebook = module.exports = View.extend({
  className: 'notebook-raw'
});

/**
 * Render the notebook editor.
 *
 * @return {RawNotebook}
 */
RawNotebook.prototype.render = function () {
  // Uses a `pre` element to keep whitespace in the view.
  var pre = document.createElement('pre');
  pre.appendChild(document.createTextNode(persistence.get('contents')));

  this.el.appendChild(pre);

  return this;
};
