var _ = require('underscore');

/**
 * Accepts a property descriptor object and returns whether it should be
 * displayed as a special property.
 *
 * @param  {Object} descriptor
 * @return {Boolean}
 */
module.exports = function (object, property) {
  var descriptor = Object.getOwnPropertyDescriptor(object, property);

  if (_.isUndefined(descriptor)) { return true; }

  return property === '@return' || !descriptor.writable ||
         !descriptor.configurable || !descriptor.enumerable;
};
