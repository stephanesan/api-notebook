var _ = require('underscore');

/**
 * Resolve functions on the prototype. Implements an O(1) lookup time.
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
 * An object of all date prototype properties that can be used with no side
 * effects.
 *
 * @type {Array}
 */
var dateProperties = [
  'toString',
  'toDateString',
  'toTimeString',
  'toLocaleString',
  'toLocaleDateString',
  'toLocaleTimeString',
  'valueOf',
  'getTime',
  'getFullYear',
  'getUTCFullYear',
  'getMonth',
  'getUTCMonth',
  'getDate',
  'getUTCDate',
  'getDay',
  'getUTCDay',
  'getHours',
  'getUTCHours',
  'getMinutes',
  'getUTCMinutes',
  'getSeconds',
  'getUTCSeconds',
  'getMilliseconds',
  'getUTCMilliseconds',
  'getTimezoneOffset',
  'toGMTString',
  'toUTCString',
  'getYear',
  'toISOString',
  'toJSON'
];

/**
 * Resolves native function return values. Accepts a data object from the
 * `completion:function` middleware.
 *
 * @param  {Object} options
 * @return {*}
 */
module.exports = function (options) {
  var global = options.global;

  if (!options.isConstructor) {
    if (_.isNumber(options.context)) {
      return prototypeResolve(options, Number.prototype);
    }

    if (_.isString(options.context)) {
      return prototypeResolve(options, String.prototype);
    }

    if (_.isBoolean(options.context)) {
      return prototypeResolve(options, Boolean.prototype);
    }

    if (_.isDate(options.context)) {
      return prototypeResolve(options, _.pick(Date.prototype, dateProperties));
    }

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
      // Array functions.
      global.Array.prototype.join,
      // Built-in `toString` methods.
      global.Array.prototype.toString,
      global.Error.prototype.toString,
      global.RegExp.prototype.toString,
      global.Object.prototype.toString,
      global.Object.prototype.toLocaleString,
      // Element functions.
      global.Element.prototype.getAttribute,

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
      global.setTimeout,
      global.setInterval,
      // Array functions.
      global.Array.prototype.push,
      global.Array.prototype.indexOf,
      global.Array.prototype.unshift,
      global.Array.prototype.lastIndexOf,
      // Math object functions.
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
      global.Math.random,
      // Date functions.
      global.Date.now,
      global.Date.UTC,
      global.Date.parse,
      // Document functions.
      global.Node.prototype.compareDocumentPosition
    ];

    /**
     * Functions that return boolean values.
     *
     * @type {Array}
     */
    var booleanTypes = [
      // Built-in functions.
      global.isNaN,
      global.Boolean,
      global.isFinite,
      // Array functions.
      global.Array.isArray,
      global.Array.prototype.some,
      global.Array.prototype.every,
      // Regular Expression functions.
      global.RegExp.prototype.test,
      // Object functions.
      global.Object.is,
      global.Object.isSealed,
      global.Object.isFrozen,
      global.Object.isExtensible,
      global.Object.prototype.isPrototypeOf,
      global.Object.prototype.hasOwnProperty,
      global.Object.prototype.propertyIsEnumerable,
      // Document functions.
      global.HTMLDocument.prototype.hasFocus,
      // DOM node functions.
      global.Node.prototype.contains,
      global.Node.prototype.isSameNode,
      global.Node.prototype.isEqualNode,
      global.Node.prototype.isSupported,
      global.Node.prototype.hasChildNodes,
      global.Node.prototype.isDefaultNamespace,
      // Element functions.
      global.Element.prototype.hasAttribute,
      global.Element.prototype.hasAttributes
    ];

    /**
     * Functions that return arrays.
     *
     * @type {Array}
     */
    var arrayTypes = [
      // Array functions.
      global.Array,
      global.Array.prototype.map,
      global.Array.prototype.sort,
      global.Array.prototype.slice,
      global.Array.prototype.splice,
      global.Array.prototype.concat,
      global.Array.prototype.filter,
      global.Array.prototype.reverse,
      // Regular Expression functions.
      global.RegExp.prototype.exec,
      // Object functions.
      global.Object.keys,
      global.Object.getOwnPropertyNames
    ];

    /**
     * Functions that return object values.
     *
     * @type {Array}
     */
    var objectTypes = [
      // Object functions.
      global.Object.seal,
      global.Object.create,
      global.Object.freeze,
      global.Object.getPrototypeOf,
      global.Object.preventExtensions,
      global.Object.prototype.valueOf,
      global.Object.getOwnPropertyDescriptor,
      // Document functions.
      global.Document.prototype.getSelection,
      global.Document.prototype.caretRangeFromPoint,
      // Element functions.
      global.Element.prototype.getClientRects,
      global.Element.prototype.getBoundingClientRect
    ];

    /**
     * Functions that return a NodeList instance.
     *
     * @type {Array}
     */
    var nodeListTypes = [
      // Document functions.
      global.Document.prototype.querySelectorAll,
      global.Document.prototype.getElementsByName,
      global.Document.prototype.getElementsByTagName,
      global.Document.prototype.getElementsByTagNameNS,
      global.Document.prototype.getElementsByClassName,
      // Element functions.
      global.Element.prototype.querySelectorAll,
      global.Element.prototype.getElementsByTagName,
      global.Element.prototype.getElementsByTagNameNS,
      global.Element.prototype.getElementsByClassName
    ];

    /**
     * Functions that return a Node instance.
     *
     * @type {Array}
     */
    var nodeTypes = [
      // Node functions.
      global.Node.prototype.cloneNode,
      global.Node.prototype.appendChild,
      global.Node.prototype.removeChild,
      global.Node.prototype.replaceChild,
      global.Node.prototype.insertBefore,
    ];

    if (_.contains(stringTypes, options.fn)) {
      return '';
    }

    if (_.contains(numberTypes, options.fn)) {
      return 0;
    }

    if (_.contains(booleanTypes, options.fn)) {
      return false;
    }

    if (_.contains(arrayTypes, options.fn)) {
      return new options.global.Array();
    }

    if (_.contains(objectTypes, options.fn)) {
      return new options.global.Object();
    }

    if (_.contains(nodeTypes, options.fn)) {
      return global.Node.prototype;
    }

    if (_.contains(nodeListTypes, options.fn)) {
      return global.NodeList.prototype;
    }

    /**
     * DOM node creation functions.
     */

    if (options.fn === global.Document.prototype.createAttribute) {
      return global.Attr.prototype;
    }

    if (options.fn === global.Document.prototype.createTextNode) {
      return global.Text.prototype;
    }

    if (options.fn === global.Document.prototype.createComment) {
      return global.Comment.prototype;
    }

    if (options.fn === global.Document.prototype.createDocumentFragment) {
      return global.DocumentFragment.prototype;
    }

    if (options.fn === global.Document.prototype.createElement) {
      return global.Element.prototype;
    }

    if (options.fn === global.Document.prototype.createExpression) {
      return global.XPathExpression.prototype;
    }

    if (options.fn === global.Document.prototype.createRange) {
      return global.Range.prototype;
    }

    if (options.fn === global.Document.prototype.createNSResolver) {
      return global.XPathNSResolver.prototype;
    }

    return null;
  }

  // If the variable/property is a constructor function, we can provide
  // some additional context by looking at the `prototype` property. This will
  // only run when all other completion options have failed.
  return options.fn.prototype;
};
