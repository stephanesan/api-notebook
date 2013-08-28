var _ = require('underscore');

/**
 * Returns whether the property should be hidden from autocompletion and the
 * object inspector.
 *
 * @param  {Object} object
 * @param  {String} property
 * @return {Boolean}
 */
module.exports = function (object, property) {
  if (property === '@return') { return true; }

  return false;
};
