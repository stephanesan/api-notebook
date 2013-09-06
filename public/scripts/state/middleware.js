var _        = require('underscore');
var Backbone = require('backbone');

/**
 * An event based implementation of a namespaced middleware system. Provides a
 * method to register new plugins and a queue system to trigger plugin hooks
 * while still being capable of having a fallback function.
 *
 * @type {Object}
 */
var middleware = module.exports = _.extend({}, Backbone.Events);

/**
 * The stack is an object that contains all the middleware functions to be
 * executed on an event. Similar in concept to `Backbone.Events._events`.
 * @type {Object}
 */
middleware.stack = {};

/**
 * Register a function callback for the plugin hook. This is akin to the connect
 * middleware system, albeit with some modifications to play nicely using
 * Backbone Events and a custom callback syntax since we aren't dealing with
 * request/response applications.
 *
 * Examples:
 *   `completion:filter`   - Filter completion suggestions from being displayed.
 *   `completion:variable` - Augment a variable name lookup with custom results.
 *   `completion:context`  - Augment a context lookup which is used for the base
 *                           object of a property lookup.
 *   `completion:property` - Augment a property name lookup with custom results.
 *   `inspector:filter` - Filter properties from displaying in the inspector.
 *   `result:render` - Render the result or error of a code cell execution.
 *   `result:empty`  - Remove the result of a code cell execution.
 *
 * @param  {String}   namespace
 * @param  {Function} ...
 * @return {this}
 */
middleware.use = function (name /*, ...fn */) {
  this.stack = this.stack || {};
  var stack = this.stack[name] || (this.stack[name] = []);
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
middleware.listenTo(middleware, 'all', function (name, data, out) {
  var stack = (this.stack && this.stack[name]);
  var index = 0;
  var sent  = false;

  // Call the final function when are done executing the stack of functions.
  // It should also be passed as a parameter of the data object to each
  // middleware operation since we could short-circuit the entire stack.
  var done = function (err) {
    if (sent) { return; }
    sent = true;
    if (_.isFunction(out)) { out(err, data); }
  };

  // If the stack is not an array, return early.
  if (!_.isArray(stack)) { return done(); }

  // Call the next function on the stack, passing errors from the previous
  // stack call so it could be handled within the stack by another middleware.
  var next = function (err) {
    var layer = stack[index++];

    if (sent || !layer) {
      if (!sent) { done(err); }
      return;
    }

    try {
      var arity = layer.length;

      if (err) {
        if (arity === 4) {
          layer(err, data, next, done);
        } else {
          next(err);
        }
      } else if (arity < 4) {
        layer(data, next, done);
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
