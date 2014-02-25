var _          = require('underscore');
var ecma5      = require('./ecma5.json');
var browser    = require('./browser.json');
var fromPath   = require('../from-path');
var middleware = require('../../state/middleware');
var isInScope  = require('../codemirror/is-in-scope');

/**
 * Recurse through the description structure and attach descriptions to nodes
 * using a `Map` interface.
 *
 * @param  {Map}    map
 * @param  {Object} describe
 * @param  {Object} global
 * @return {Map}
 */
var attachDescriptions = function (map, describe, global) {
  (function recurse (description, context) {
    // Break recursion on a non-Object.
    if (!_.isObject(context)) { return; }

    // Set the map object reference to point to the description.
    map.set(context, description);

    if (_.isObject(description)) {
      // Iterate over the description object and attach more definitions.
      _.each(description, function (describe, key) {
        // Tern.js definitions prepend an exclamation mark to definition types.
        if (key.charAt(0) === '!') { return; }

        var descriptor = Object.getOwnPropertyDescriptor(context, key);

        // We need to use property descriptors here since Firefox throws errors
        // with getters on some prototype properties.
        return descriptor && recurse(describe, descriptor.value);
      });
    }
  })(describe, global);

  return map;
};

/**
 * Accepts a window object and returns an object for use with middleware.
 *
 * @param  {Object} sandbox
 * @return {Object}
 */
module.exports = function (global) {
  var map     = new Map();
  var plugins = {};

  // Attach pre-defined global description objects.
  attachDescriptions(map, ecma5,   global);
  attachDescriptions(map, browser, global);

  /**
   * Middleware plugin for describing native types.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  plugins['completion:describe'] = function (data, next, done) {
    var token = data.token;
    var description;

    // Avoiding describing function arguments and variables.
    if (token.type === 'variable' && isInScope(token, token.string)) {
      return next();
    }

    if (_.isObject(data.context)) {
      description = map.get(data.context);
    } else {
      // TODO: Improve resolution of instances to their prototypes, etc.
      description = map.get(data.parent)[token.string];
    }

    // If we didn't retrieve a description, allow the next function to run.
    if (description == null) {
      return next();
    }

    return done(null, description);
  };

  /**
   * Middleware for looking up function return types for native functions.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  plugins['completion:function'] = function (data, next, done) {
    var constructors = [
      data.window.Array,
      data.window.String,
      data.window.Boolean
    ];

    // Constructor functions are relatively easy to handle.
    if (data.isConstructor || _.contains(constructors, data.context)) {
      return done(null, data.context.prototype);
    }

    // This may be a little dodgy, but as long as someone hasn't extended the
    // native prototype object with something that has side-effects, we'll be
    // fine.
    if (!_.isObject(data.parent)) {
      return done(null, data.context.call(data.parent));
    }

    // Use the documentation to detect the return types.
    middleware.trigger('completion:describe', data, function (err, describe) {
      if (err || !_.isObject(describe) || !/^fn\(/.test(describe['!type'])) {
        return next(err);
      }

      // Split the documentation type and get the return type.
      var returnType = describe['!type'].split(' -> ');

      // Update the return type string.
      returnType = returnType.length > 1 ? returnType.pop() : null;

      if (returnType === 'string') {
        return done(null, data.window.String());
      }

      if (returnType === 'number') {
        return done(null, data.window.Number());
      }

      if (returnType === 'bool') {
        return done(null, data.window.Boolean());
      }

      if (/\[.*\]/.test(returnType)) {
        return done(null, data.window.Array());
      }

      if (returnType === 'fn()') {
        return done(null, data.window.Function());
      }

      // Returns its own instance.
      if (returnType === '!this') {
        return done(null, data.parent);
      }

      // Instance type return.
      if (_.isString(returnType) && returnType.charAt(0) === '+') {
        var path        = returnType.substr(1).split('.');
        var constructor = fromPath(data.window, path);

        if (_.isFunction(constructor)) {
          return done(null, constructor.prototype);
        }
      }

      return next();
    });
  };

  return plugins;
};
