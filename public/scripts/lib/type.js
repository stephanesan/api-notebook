var _        = require('underscore');
var toString = _.bind(Function.prototype.call, Object.prototype.toString);

module.exports = function (object) {
  switch (toString(object)) {
  case '[object Function]':
    return 'function';
  case '[object Date]':
    return 'date';
  case '[object RegExp]':
    return 'regexp';
  case '[object Arguments]':
    return 'arguments';
  case '[object Array]':
    return 'array';
  case '[object String]':
    return 'string';
  case '[object Error]':
    return 'error';
  case '[object Number]':
    return 'number';
  }

  if (object === null)                 { return 'null'; }
  if (object === undefined)            { return 'undefined'; }
  if (object && object.nodeType === 1) { return 'element'; }
  if (object === Object(object))       { return 'object'; }

  return typeof object;
};
