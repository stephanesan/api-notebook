var _          = require('underscore');
var trim       = require('trim');
var domify     = require('domify');
var Inspector  = require('./inspector');
var stackTrace = require('stacktrace-js');

var ErrorInspector = module.exports = Inspector.extend();

ErrorInspector.prototype.initialize = function () {
  Inspector.prototype.initialize.apply(this, arguments);

  this.stackTrace = _.map(stackTrace({ e: this.inspect }), trim.left);
  this._preview   = this.stackTrace.shift();
  // May as well delete the reference to the error, avoiding any potential
  // memory leaks. Once rendered, we shouldn't need to use it again anyway.
  delete this.inspect;
};

ErrorInspector.prototype.stringifyPreview = function () {
  return this._preview;
};

ErrorInspector.prototype.renderChildren = function () {
  this._renderChildrenEl();

  // If we have a stack trace, allow the children to be expanded
  if (this.stackTrace.length) {
    this.el.classList.add('can-expand');
  }

  _.each(this.stackTrace, function (trace) {
    this.childrenEl.appendChild(
      domify('<div class="trace">' + _.escape(trace) + '</div>')
    );
  }, this);

  return this;
};
