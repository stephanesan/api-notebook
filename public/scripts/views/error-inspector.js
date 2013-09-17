var _          = require('underscore');
var trim       = require('trim');
var domify     = require('domify');
var Inspector  = require('./inspector');
var stackTrace = require('stacktrace-js');

/**
 * Create an instance of the inspector suited for rendering errors.
 *
 * @type {Function}
 */
var ErrorInspector = module.exports = Inspector.extend();

/**
 * Runs when a new error inspector instance is created.
 */
ErrorInspector.prototype.initialize = function () {
  Inspector.prototype.initialize.apply(this, arguments);

  this.stackTrace = _.map(stackTrace({ e: this.inspect }), trim.left);
  this._preview   = this.stackTrace.shift();
  // May as well delete the reference to the error, avoiding any potential
  // memory leaks. Once rendered, we shouldn't need to use it again anyway.
  delete this.inspect;
};

/**
 * Returns whether the inspector should be expandable.
 *
 * @return {Boolean}
 */
ErrorInspector.prototype.isExpandable = function () {
  return !!this.stackTrace.length;
};

/**
 * Returns the stringified preview. In this case, it will be the error message.
 *
 * @return {String}
 */
ErrorInspector.prototype.stringifyPreview = function () {
  return this._preview;
};

/**
 * Render all child nodes.
 *
 * @return {ErrorInspector}
 */
ErrorInspector.prototype.renderChildren = function () {
  if (!this.isExpandable()) { return this; }

  this._renderChildrenEl();

  this.el.classList.add('can-expand');

  _.each(this.stackTrace, function (trace) {
    this.childrenEl.appendChild(
      domify('<div class="trace">' + _.escape(trace) + '</div>')
    );
  }, this);

  return this;
};
