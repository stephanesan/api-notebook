var _ = require('underscore');

/**
 * Resolve functions on the prototype. Implements an O(n) lookup time.
 *
 * @param  {Object} options
 * @param  {Object} prototype
 * @return {*}
 */
var prototypeResolve = function (options, prototype) {
  if (_.isFunction(prototype[options.name])) {
    return prototype[options.name].call(options.context);
  }

  return null;
};

/**
 * Resolves native function return values. Accepts a data object from the
 * `completion:function` middleware.
 *
 * @param  {Object} options
 * @return {*}
 */
module.exports = function (options) {
  var fn     = options.fn;
  var global = options.global;

  if (!options.construct) {
    if (_.isNumber(options.context)) {
      return prototypeResolve(options, Number.prototype);
    }

    if (_.isString(options.context)) {
      return prototypeResolve(options, String.prototype);
    }

    if (_.isBoolean(options.context)) {
      return prototypeResolve(options, Boolean.prototype);
    }

    /**
     * Functions below this point require arguments to be 100% useful, but for
     * the most part it won't hurt to display basic suggestions.
     */

    /**
     * Functions that return arrays.
     *
     * @type {Array}
     */
    var arrayTypes = [
      // Arrays.
      global.Array,
      global.Array.prototype.map,
      global.Array.prototype.sort,
      global.Array.prototype.slice,
      global.Array.prototype.splice,
      global.Array.prototype.concat,
      global.Array.prototype.filter,
      global.Array.prototype.reverse,
      // Regular Expressions.
      global.RegExp.prototype.exec,
      // Objects.
      global.Object.keys,
      global.Object.getOwnPropertyNames
    ];

    /**
     * Functions that return strings.
     *
     * @type {Array}
     */
    var stringTypes = [
      // Built-in functions.
      global.String,
      global.escape,
      global.unescape,
      global.encodeURI,
      global.decodeURI,
      global.encodeURIComponent,
      global.decodeURIComponent,
      // Arrays.
      global.Array.prototype.join,
      // Built-in `toString` methods.
      global.Array.prototype.toString,
      global.Error.prototype.toString,
      global.RegExp.prototype.toString,
      global.Object.prototype.toString
    ];

    /**
     * Functions that return numbers.
     *
     * @type {Array}
     */
    var numberTypes = [
      // Built-in functions.
      global.Number,
      global.parseInt,
      global.parseFloat,
      // Arrays.
      global.Array.prototype.push,
      global.Array.prototype.indexOf,
      global.Array.prototype.unshift,
      global.Array.prototype.lastIndexOf,
      // Math object.
      global.Math.abs,
      global.Math.cos,
      global.Math.exp,
      global.Math.log,
      global.Math.max,
      global.Math.min,
      global.Math.sin,
      global.Math.pow,
      global.Math.tan,
      global.Math.sqrt,
      global.Math.acos,
      global.Math.asin,
      global.Math.atan,
      global.Math.ceil,
      global.Math.imul,
      global.Math.atan2,
      global.Math.floor,
      global.Math.round,
      global.Math.random
    ];

    /**
     * Functions that return boolean values.
     *
     * @type {Array}
     */
    var booleanTypes = [
      // Built-in functions.
      global.Boolean,
      // Arrays.
      global.Array.isArray,
      global.Array.prototype.some,
      global.Array.prototype.every,
      // Regular Expressions.
      global.RegExp.prototype.test,
      // Objects.
      global.Object.is,
      global.Object.isSealed,
      global.Object.isFrozen,
      global.Object.isExtensible,
      global.Object.prototype.isPrototypeOf,
      global.Object.prototype.hasOwnProperty,
      global.Object.prototype.propertyIsEnumerable
    ];

    /**
     * Functions that return object values.
     *
     * @type {Array}
     */
    var objectTypes = [
      // Objects.
      global.Object.seal,
      global.Object.create,
      global.Object.freeze,
      global.Object.getPrototypeOf,
      global.Object.preventExtensions,
      global.Object.prototype.valueOf,
      global.Object.getOwnPropertyDescriptor
    ];

    if (_.contains(arrayTypes, fn)) {
      return [];
    }

    if (_.contains(stringTypes, options.fn)) {
      return '';
    }

    if (_.contains(numberTypes, options.fn)) {
      return 0;
    }

    if (_.contains(booleanTypes, options.fn)) {
      return false;
    }

    if (_.contains(objectTypes, options.fn)) {
      return {};
    }
  }

  // If the variable/property is a constructor function, we can provide
  // some additional context by looking at the `prototype` property. This will
  // only run when all other completion options have failed.
  if (options.construct) {
    return options.fn.prototype;
  }

  return null;
};
