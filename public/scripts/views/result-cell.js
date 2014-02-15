var _          = require('underscore');
var View       = require('./template');
var template   = require('../../templates/views/result-cell.hbs');
var middleware = require('../state/middleware');

/**
 * Return a new result cell instance.
 *
 * @type {Function}
 */
var ResultCell = module.exports = View.extend({
  className: 'cell cell-result cell-result-pending'
});

/**
 * The result cell template.
 *
 * @type {Function}
 */
ResultCell.prototype.template = template;

/**
 * Render the result view.
 *
 * @param {Object}   data
 * @param {Object}   global
 * @param {Function} done
 */
ResultCell.prototype.render = function () {
  View.prototype.render.call(this);
  this.refresh();

  if (this.model.get('isError')) {
    this.el.classList.add('result-error');
  }

  middleware.trigger('result:render', {
    el:      this.el.querySelector('.result-content'),
    window:  this.model.view ? this.model.view.notebook.sandbox.window : window,
    inspect: this.model.get('result'),
    isError: this.model.get('isError')
  }, _.bind(function (err, remove) {
    this._remove = remove;
    this.el.classList.remove('cell-result-pending');
  }, this));

  return this;
};

/**
 * Refreshes the result cell based on the parent cell view.
 *
 * @return {ResultCell}
 */
ResultCell.prototype.refresh = function () {
  if (this.model.collection) {
    this.data.set('index', this.model.collection.codeIndexOf(this.model));
  }

  return this;
};

/**
 * Reset the result cell before removing.
 */
ResultCell.prototype.remove = function () {
  // Any views must subscribe to this API style.
  if (this._remove) {
    this._remove();
    delete this._remove;
  }

  return View.prototype.remove.call(this);
};
