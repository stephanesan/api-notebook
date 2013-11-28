var DOMBars = require('dombars/runtime');

/**
 * Check whether all values in an array are equal.
 *
 * @param  {Array}   array
 * @return {Boolean}
 */
var isEqual = function (array) {
  for (var i = 1; i < array.length; i++) {
    if (array[0] !== array[i]) {
      return false;
    }
  }

  return true;
};

/**
 * Register as the equal helper.
 *
 * @return {*}
 */
DOMBars.registerHelper('equal', function (/* ...args, options */) {
  var args    = Array.prototype.slice.call(arguments);
  var options = args.pop();

  if (!options.fn) {
    return isEqual(args);
  }

  if (isEqual(args)) {
    return options.fn(this);
  }

  return options.inverse(this);
});

/**
 * Register the opposite not equal functionality.
 *
 * @return {*}
 */
DOMBars.registerHelper('notEqual', function (/* ...args, options */) {
  var args    = Array.prototype.slice.call(arguments);
  var options = args.pop();

  if (!options.fn) {
    return !isEqual(args);
  }

  if (!isEqual(args)) {
    return options.fn(this);
  }

  return options.inverse(this);
});
