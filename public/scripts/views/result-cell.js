var _          = require('underscore');
var domify     = require('domify');
var Cell       = require('./cell');
var middleware = require('../state/middleware');

/**
 * Return a new result cell instance.
 *
 * @type {Function}
 */
var ResultCell = module.exports = Cell.extend({
  className: 'cell cell-result cell-result-pending'
});

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

  this._resultContent.innerHTML = '';
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
    el:      this._resultContent,
    model:   this.model,
    context: context,
    inspect: data.result,
    isError: data.isError
  }, _.bind(function (err, remove) {
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
  if (this._resultLabel) {
    var index = this.model.collection.codeIndexOf(this.model);
    this._resultLabel.textContent = '$' + index + '=';
  }

  return this;
};

/**
 * Render the result cell. This is a fairly simple view since all the rendering
 * will actually occur at a later time.
 *
 * @return {ResultCell}
 */
ResultCell.prototype.render = function () {
  Cell.prototype.render.call(this);

  // Prepends a container for the result reference label.
  this.el.appendChild(this._resultLabel = domify(
    '<div class="result-label"></div>'
  ));

  // Appends a container for holding rendered result views.
  this.el.appendChild(this._resultContent = domify(
    '<div class="result-content"></div>'
  ));

  return this;
};

/**
 * Reset the result cell before removing.
 */
ResultCell.prototype.remove = function () {
  this._reset();
  return Cell.prototype.remove.call(this);
};
