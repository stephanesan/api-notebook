var _      = require('underscore');
var typeOf = require('./type');

// Keep a reference to all the keys defined on the root object prototype.
var objectPrototypeKeys = Object.getOwnPropertyNames(Object.prototype);

// Keep a reference to all the keys on a function created by the function.
var functionPropertyKeys = Object.getOwnPropertyNames(function () {});

/**
 * Check if the property of the object was inherited from `Object.prototype`.
 * Please note: We can't just compare to `Object.prototype` since objects in an
 * iFrame will have inherited from a different prototype.
 *
 * @param  {Object} object
 * @param  {String} property
 * @return {Boolean}
 */
var isObjectProperty = function (object, property) {
  var obj = object;

  do {
    // Use `hasOwnProperty` from the Object's prototype since the object might
    // not have a property on it called
    if (Object.prototype.hasOwnProperty.call(object, property)) {
      // Do a quick check to see if we are at the end of the prototype chain. If
      // we are, we need to compare the current object properties with
      // `Object.prototype` since we could just be at the end of a chain started
      // with `Object.create(null)`.
      if (Object.getPrototypeOf(object)) { return false; }
      // Don't check for an exact match of keys since if the prototype is from
      // an iFrame, it could have been modified by one of those irritating JS
      // developers that mess with prototypes directly.
      return _.every(objectPrototypeKeys, function (property) {
        return Object.prototype.hasOwnProperty.call(object, property);
      });
    }
  } while (object = Object.getPrototypeOf(object));

  return false
};

/**
 * Check if the property of a function was inherited by the creation of the
 * function.
 *
 * @param  {Function} fn
 * @param  {String}   property
 * @return {Boolean}
 */
var isFunctionProperty = function (fn, property) {
  if (_.contains(functionPropertyKeys, property)) { return true; }

  return !fn.hasOwnProperty(property);
};

/**
 * Returns whether the property should be hidden from autocompletion and the
 * object inspector.
 *
 * @param  {Object} object
 * @param  {String} property
 * @return {Boolean}
 */
module.exports = function (object, property) {
  if (typeof object === 'function' && property === '@return') { return true; }

  if (typeof object === 'object') {
    return isObjectProperty(object, property);
  }

  if (typeof object === 'function') {
    return isFunctionProperty(object, property);
  }

  return false;
};
