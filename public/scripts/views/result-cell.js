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
 * Reset the result cell view to the original state.
 *
 * @param {Function} done
 */
ResultCell.prototype._reset = function () {
  // Any views must subscribe to this API style.
  if (this._remove) {
    this._remove();
    delete this._remove;
  }

  this.el.querySelector('.result-content').innerHTML = '';
  this.el.classList.remove('result-error');
  this.el.classList.add('cell-result-pending');
};

/**
 * Render the result view.
 *
 * @param {Object}   data
 * @param {Object}   context
 * @param {Function} done
 */
ResultCell.prototype.setResult = function (data, context, done) {
  this._reset();

  if (data.isError) {
    this.el.classList.add('result-error');
  }

  middleware.trigger('result:render', {
    el:      this.el.querySelector('.result-content'),
    context: context,
    inspect: data.result,
    isError: data.isError
  }, _.bind(function (err, view) {
  this._remove = remove;
  this.el.classList.remove('cell-result-pending');
    return done && done(err);
  }, this));
};

/**
 * Refreshes the result cell based on the parent cell view.
 *
 * @return {ResultCell}
 */
ResultCell.prototype.refresh = function () {
  this.data.set('index', this.model.collection.codeIndexOf(this.model));

  return this;
};

/**
 * Reset the result cell before removing.
 */
ResultCell.prototype.remove = function () {
  this._reset();
  return Cell.prototype.remove.call(this);
};
