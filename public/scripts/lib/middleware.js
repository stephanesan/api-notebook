var _        = require('underscore');
var Backbone = require('backbone');

/**
 * An event based implementation of a namespaced middleware system. Provides a
 * method to register new plugins and a queue system to trigger plugin hooks
 * while still being capable of having a fallback function.
 *
 * @type {Object}
 */
var middleware = _.extend({}, Backbone.Events);

/**
 * The stack is an object that contains all the middleware functions to be
 * executed on an event. Similar in concept to `Backbone.Events._events`.
 * @type {Object}
 */
middleware._stack = {};

/**
 * Register a function callback for the plugin hook. This is akin to the connect
 * middleware system, albeit with some modifications to play nicely using
 * Backbone Events and a custom callback syntax since we are dealing with
 * request/response applications.
 *
 * @param  {String}   namespace
 * @param  {Function} ...
 * @return {this}
 */
middleware.use = function (name /*, ...fn */) {
  this._stack = this._stack || {};
  var stack = this._stack[name] || (this._stack[name] = []);
  _.each(_.rest(arguments, 1), function (fn) {
    stack.push(fn);
  });
  return this;
};

/**
 * Listens to any events triggered on the middleware system and runs through the
 * middleware stack based on the event name.
 *
 * @param  {String}   name Event name to listen to.
 * @param  {Object}   data Basic object with all the data to pass to a plugin.
 * @param  {Function} done A callback function to call when the stack has
 *                         finished executing.
 */
middleware.listenTo(middleware, 'all', function (name, data, done) {
  var stack = (this._stack && this._stack[name]);
  var pass  = {};
  var index = 0;
  var sent  = false;

  // Call the complete function when are done executing the stack of functions.
  // It should also be passed as a parameter of the data object to each
  // middleware operation since we could short-circuit the entire stack.
  var complete = pass.done = function (/* err, ... */) {
    sent = true;
    if (_.isFunction(done)) { done.apply(this, arguments); }
  };

  // If the stack is not an array, return early.
  if (!_.isArray(stack)) { return complete(); }

  // Extend the object to be passed to each function with the data provided.
  _.extend(pass, data);

  // Call the next function on the stack, passing errors from the previous
  // stack call so it could be handled within the stack by another middleware.
  var next = function (err) {
    var layer = stack[index++];

    if (sent || !layer) {
      if (!sent) { complete(err); }
      return;
    }

    try {
      var arity = layer.length;

      if (err) {
        if (arity === 3) {
          layer(err, pass, next);
        } else {
          next(err);
        }
      } else if (arity < 3) {
        layer(pass, next);
      } else {
        next();
      }
    } catch (e) {
      next(e);
    }
  };

  // Call next to kick off looping through the stack
  next();
});
