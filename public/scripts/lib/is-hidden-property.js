var _ = require('underscore');

/**
 * Checks up the prototype chain to check if a property is enumerable.
 *
 * @param  {*}      object
 * @param  {String} property
 * @return {Boolean}
 */
var isEnumerable = function (object, property) {
  do {
    if (object.hasOwnProperty(property)) {
      return !object.propertyIsEnumerable(property);
    }
  } while (object = Object.getPrototypeOf(object));

  return false;
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

  var type = Object.prototype.toString.call(object);
  // Plain objects created by the user and functions should not display
  // any enumarable properties in autocompletion or the object inspector.
  if (type === '[object Object]' || type === '[object Function]') {
    return isEnumerable(object, property);
  }

  return false;
};
