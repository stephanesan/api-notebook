var _      = require('underscore');
var Events = require('backbone').Events;

/**
 * Set up a communication protocol with an external frame.
 *
 * @param  {Object} frame
 * @return {Messages}
 */
var Messages = module.exports = function (frame) {
  this.frame = frame;

  global.addEventListener('message', _.bind(function (e) {
    if (e.source !== frame) { return; }
    // Messages being passed by the parent window should always be in an array
    this.origin      = e.origin;
    this._frameEvent = e;
    this.trigger.apply(this, e.data);
  }, this), false);
};

_.extend(Messages.prototype, Events);

Messages.prototype.trigger = function (name /*, ...args */) {
  if (this._frameEvent) {
    delete this._frameEvent;
    return Events.trigger.apply(this, arguments);
  }

  this.frame.postMessage(
    Array.prototype.slice.call(arguments, 0),
    this.origin || '*'
  );

  return this;
};
