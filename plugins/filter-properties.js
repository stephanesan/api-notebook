!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.filterPropertiesPlugin=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],2:[function(_dereq_,module,exports){
var each = _dereq_('foreach');

/**
 * Simple function to transform an array into an object. This is useful for
 * certain types of data and where it would be unreasonable to loop constantly
 * though an array we can do constant time lookups on an object.
 *
 * @param  {Array|String|Object} array
 * @return {Object}
 */
module.exports = function (array) {
  var obj = {};

  each(array, function (value) {
    obj[value] = true;
  });

  return obj;
};

},{"foreach":1}],3:[function(_dereq_,module,exports){
var toObj = _dereq_('../lib/objectify');

// Keep a reference to all the keys defined on the root object prototype.
var objectPrototypeKeys = toObj(Object.getOwnPropertyNames(Object.prototype));

// Keep a reference to all the keys on a function created by the function.
var functionPropertyKeys = toObj(Object.getOwnPropertyNames(function () {}));

/**
 * Check if the object has a direct property on it. Uses
 * `Object.prototype.hasOwnProperty` since the object we check against could
 * have been created using `Object.create(null)` which means it wouldn't have
 * `hasOwnProperty` on its prototype.
 *
 * @param  {Object}  object
 * @param  {String}  property
 * @return {Boolean}
 */
var _hasOwnProperty = function (object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
};

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
  /**
   * Check whether the object has own property.
   *
   * @param  {String}  property
   * @return {Boolean}
   */
  var objectHasOwnProperty = function (property) {
    return _hasOwnProperty(object, property);
  };

  do {
    // Use `hasOwnProperty` from the Object's prototype since the object might
    // not have a property on it called
    if (objectHasOwnProperty(property)) {
      // Do a quick check to see if we are at the end of the prototype chain. If
      // we are, we need to compare the current object properties with
      // `Object.prototype` since we could just be at the end of a chain started
      // with `Object.create(null)`.
      if (Object.getPrototypeOf(object)) { return false; }
      // Don't check for an exact match of keys since if the prototype is from
      // an iFrame, it could have been modified by one of those irritating JS
      // developers that mess with prototypes directly.
      for (var key in objectPrototypeKeys) {
        if (_hasOwnProperty(objectPrototypeKeys, key)) {
          if (!objectHasOwnProperty(key)) {
            return false;
          }
        }
      }
      return true;
    }
  } while (object = Object.getPrototypeOf(object));

  return false;
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
  if (_hasOwnProperty(functionPropertyKeys, property)) { return true; }

  return !_hasOwnProperty(fn, property);
};

/**
 * Sets whether the property should be filter from autocompletion suggestions.
 *
 * @param  {Object}   data
 * @param  {Function} next
 */
var completionFilterPlugin = function (data, next, done) {
  var value   = data.result.value;
  var context = Object(data.context);

  if (typeof context === 'object' && isObjectProperty(context, value)) {
    return done(null, false);
  }

  if (typeof context === 'function' && isFunctionProperty(context, value)) {
    return done(null, false);
  }

  return next();
};

/**
 * Filters properties from being shown in the inspector.
 *
 * @param  {Object}   data
 * @param  {Function} next
 */
var inspectorFilterPlugin = function (data, next, done) {
  if (data.internal === '[[Prototype]]') {
    return done(null, false);
  }

  return next();
};

/**
 * A { key: function } map of all middleware used in the plugin.
 *
 * @type {Object}
 */
module.exports = {
  'inspector:filter':  inspectorFilterPlugin,
  'completion:filter': completionFilterPlugin
};

},{"../lib/objectify":2}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL25vZGVfbW9kdWxlcy9mb3JlYWNoL2luZGV4LmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2FwaS1ub3RlYm9vay9wdWJsaWMvc2NyaXB0cy9saWIvb2JqZWN0aWZ5LmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2FwaS1ub3RlYm9vay9wdWJsaWMvc2NyaXB0cy9wbHVnaW5zL2ZpbHRlci1wcm9wZXJ0aWVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZvckVhY2ggKG9iaiwgZm4sIGN0eCkge1xuICAgIGlmICh0b1N0cmluZy5jYWxsKGZuKSAhPT0gJ1tvYmplY3QgRnVuY3Rpb25dJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdpdGVyYXRvciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICB9XG4gICAgdmFyIGwgPSBvYmoubGVuZ3RoO1xuICAgIGlmIChsID09PSArbCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgICAgICAgZm4uY2FsbChjdHgsIG9ialtpXSwgaSwgb2JqKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAodmFyIGsgaW4gb2JqKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBrKSkge1xuICAgICAgICAgICAgICAgIGZuLmNhbGwoY3R4LCBvYmpba10sIGssIG9iaik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4iLCJ2YXIgZWFjaCA9IHJlcXVpcmUoJ2ZvcmVhY2gnKTtcblxuLyoqXG4gKiBTaW1wbGUgZnVuY3Rpb24gdG8gdHJhbnNmb3JtIGFuIGFycmF5IGludG8gYW4gb2JqZWN0LiBUaGlzIGlzIHVzZWZ1bCBmb3JcbiAqIGNlcnRhaW4gdHlwZXMgb2YgZGF0YSBhbmQgd2hlcmUgaXQgd291bGQgYmUgdW5yZWFzb25hYmxlIHRvIGxvb3AgY29uc3RhbnRseVxuICogdGhvdWdoIGFuIGFycmF5IHdlIGNhbiBkbyBjb25zdGFudCB0aW1lIGxvb2t1cHMgb24gYW4gb2JqZWN0LlxuICpcbiAqIEBwYXJhbSAge0FycmF5fFN0cmluZ3xPYmplY3R9IGFycmF5XG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFycmF5KSB7XG4gIHZhciBvYmogPSB7fTtcblxuICBlYWNoKGFycmF5LCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBvYmpbdmFsdWVdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIG9iajtcbn07XG4iLCJ2YXIgdG9PYmogPSByZXF1aXJlKCcuLi9saWIvb2JqZWN0aWZ5Jyk7XG5cbi8vIEtlZXAgYSByZWZlcmVuY2UgdG8gYWxsIHRoZSBrZXlzIGRlZmluZWQgb24gdGhlIHJvb3Qgb2JqZWN0IHByb3RvdHlwZS5cbnZhciBvYmplY3RQcm90b3R5cGVLZXlzID0gdG9PYmooT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoT2JqZWN0LnByb3RvdHlwZSkpO1xuXG4vLyBLZWVwIGEgcmVmZXJlbmNlIHRvIGFsbCB0aGUga2V5cyBvbiBhIGZ1bmN0aW9uIGNyZWF0ZWQgYnkgdGhlIGZ1bmN0aW9uLlxudmFyIGZ1bmN0aW9uUHJvcGVydHlLZXlzID0gdG9PYmooT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoZnVuY3Rpb24gKCkge30pKTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGUgb2JqZWN0IGhhcyBhIGRpcmVjdCBwcm9wZXJ0eSBvbiBpdC4gVXNlc1xuICogYE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlgIHNpbmNlIHRoZSBvYmplY3Qgd2UgY2hlY2sgYWdhaW5zdCBjb3VsZFxuICogaGF2ZSBiZWVuIGNyZWF0ZWQgdXNpbmcgYE9iamVjdC5jcmVhdGUobnVsbClgIHdoaWNoIG1lYW5zIGl0IHdvdWxkbid0IGhhdmVcbiAqIGBoYXNPd25Qcm9wZXJ0eWAgb24gaXRzIHByb3RvdHlwZS5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICBvYmplY3RcbiAqIEBwYXJhbSAge1N0cmluZ30gIHByb3BlcnR5XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG52YXIgX2hhc093blByb3BlcnR5ID0gZnVuY3Rpb24gKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhlIHByb3BlcnR5IG9mIHRoZSBvYmplY3Qgd2FzIGluaGVyaXRlZCBmcm9tIGBPYmplY3QucHJvdG90eXBlYC5cbiAqIFBsZWFzZSBub3RlOiBXZSBjYW4ndCBqdXN0IGNvbXBhcmUgdG8gYE9iamVjdC5wcm90b3R5cGVgIHNpbmNlIG9iamVjdHMgaW4gYW5cbiAqIGlGcmFtZSB3aWxsIGhhdmUgaW5oZXJpdGVkIGZyb20gYSBkaWZmZXJlbnQgcHJvdG90eXBlLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqZWN0XG4gKiBAcGFyYW0gIHtTdHJpbmd9IHByb3BlcnR5XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG52YXIgaXNPYmplY3RQcm9wZXJ0eSA9IGZ1bmN0aW9uIChvYmplY3QsIHByb3BlcnR5KSB7XG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSBvYmplY3QgaGFzIG93biBwcm9wZXJ0eS5cbiAgICpcbiAgICogQHBhcmFtICB7U3RyaW5nfSAgcHJvcGVydHlcbiAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICovXG4gIHZhciBvYmplY3RIYXNPd25Qcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgIHJldHVybiBfaGFzT3duUHJvcGVydHkob2JqZWN0LCBwcm9wZXJ0eSk7XG4gIH07XG5cbiAgZG8ge1xuICAgIC8vIFVzZSBgaGFzT3duUHJvcGVydHlgIGZyb20gdGhlIE9iamVjdCdzIHByb3RvdHlwZSBzaW5jZSB0aGUgb2JqZWN0IG1pZ2h0XG4gICAgLy8gbm90IGhhdmUgYSBwcm9wZXJ0eSBvbiBpdCBjYWxsZWRcbiAgICBpZiAob2JqZWN0SGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAvLyBEbyBhIHF1aWNrIGNoZWNrIHRvIHNlZSBpZiB3ZSBhcmUgYXQgdGhlIGVuZCBvZiB0aGUgcHJvdG90eXBlIGNoYWluLiBJZlxuICAgICAgLy8gd2UgYXJlLCB3ZSBuZWVkIHRvIGNvbXBhcmUgdGhlIGN1cnJlbnQgb2JqZWN0IHByb3BlcnRpZXMgd2l0aFxuICAgICAgLy8gYE9iamVjdC5wcm90b3R5cGVgIHNpbmNlIHdlIGNvdWxkIGp1c3QgYmUgYXQgdGhlIGVuZCBvZiBhIGNoYWluIHN0YXJ0ZWRcbiAgICAgIC8vIHdpdGggYE9iamVjdC5jcmVhdGUobnVsbClgLlxuICAgICAgaWYgKE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpKSB7IHJldHVybiBmYWxzZTsgfVxuICAgICAgLy8gRG9uJ3QgY2hlY2sgZm9yIGFuIGV4YWN0IG1hdGNoIG9mIGtleXMgc2luY2UgaWYgdGhlIHByb3RvdHlwZSBpcyBmcm9tXG4gICAgICAvLyBhbiBpRnJhbWUsIGl0IGNvdWxkIGhhdmUgYmVlbiBtb2RpZmllZCBieSBvbmUgb2YgdGhvc2UgaXJyaXRhdGluZyBKU1xuICAgICAgLy8gZGV2ZWxvcGVycyB0aGF0IG1lc3Mgd2l0aCBwcm90b3R5cGVzIGRpcmVjdGx5LlxuICAgICAgZm9yICh2YXIga2V5IGluIG9iamVjdFByb3RvdHlwZUtleXMpIHtcbiAgICAgICAgaWYgKF9oYXNPd25Qcm9wZXJ0eShvYmplY3RQcm90b3R5cGVLZXlzLCBrZXkpKSB7XG4gICAgICAgICAgaWYgKCFvYmplY3RIYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gd2hpbGUgKG9iamVjdCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZihvYmplY3QpKTtcblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoZSBwcm9wZXJ0eSBvZiBhIGZ1bmN0aW9uIHdhcyBpbmhlcml0ZWQgYnkgdGhlIGNyZWF0aW9uIG9mIHRoZVxuICogZnVuY3Rpb24uXG4gKlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgcHJvcGVydHlcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKi9cbnZhciBpc0Z1bmN0aW9uUHJvcGVydHkgPSBmdW5jdGlvbiAoZm4sIHByb3BlcnR5KSB7XG4gIGlmIChfaGFzT3duUHJvcGVydHkoZnVuY3Rpb25Qcm9wZXJ0eUtleXMsIHByb3BlcnR5KSkgeyByZXR1cm4gdHJ1ZTsgfVxuXG4gIHJldHVybiAhX2hhc093blByb3BlcnR5KGZuLCBwcm9wZXJ0eSk7XG59O1xuXG4vKipcbiAqIFNldHMgd2hldGhlciB0aGUgcHJvcGVydHkgc2hvdWxkIGJlIGZpbHRlciBmcm9tIGF1dG9jb21wbGV0aW9uIHN1Z2dlc3Rpb25zLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gICBkYXRhXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gbmV4dFxuICovXG52YXIgY29tcGxldGlvbkZpbHRlclBsdWdpbiA9IGZ1bmN0aW9uIChkYXRhLCBuZXh0LCBkb25lKSB7XG4gIHZhciB2YWx1ZSAgID0gZGF0YS5yZXN1bHQudmFsdWU7XG4gIHZhciBjb250ZXh0ID0gT2JqZWN0KGRhdGEuY29udGV4dCk7XG5cbiAgaWYgKHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0JyAmJiBpc09iamVjdFByb3BlcnR5KGNvbnRleHQsIHZhbHVlKSkge1xuICAgIHJldHVybiBkb25lKG51bGwsIGZhbHNlKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgY29udGV4dCA9PT0gJ2Z1bmN0aW9uJyAmJiBpc0Z1bmN0aW9uUHJvcGVydHkoY29udGV4dCwgdmFsdWUpKSB7XG4gICAgcmV0dXJuIGRvbmUobnVsbCwgZmFsc2UpO1xuICB9XG5cbiAgcmV0dXJuIG5leHQoKTtcbn07XG5cbi8qKlxuICogRmlsdGVycyBwcm9wZXJ0aWVzIGZyb20gYmVpbmcgc2hvd24gaW4gdGhlIGluc3BlY3Rvci5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgZGF0YVxuICogQHBhcmFtICB7RnVuY3Rpb259IG5leHRcbiAqL1xudmFyIGluc3BlY3RvckZpbHRlclBsdWdpbiA9IGZ1bmN0aW9uIChkYXRhLCBuZXh0LCBkb25lKSB7XG4gIGlmIChkYXRhLmludGVybmFsID09PSAnW1tQcm90b3R5cGVdXScpIHtcbiAgICByZXR1cm4gZG9uZShudWxsLCBmYWxzZSk7XG4gIH1cblxuICByZXR1cm4gbmV4dCgpO1xufTtcblxuLyoqXG4gKiBBIHsga2V5OiBmdW5jdGlvbiB9IG1hcCBvZiBhbGwgbWlkZGxld2FyZSB1c2VkIGluIHRoZSBwbHVnaW4uXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICdpbnNwZWN0b3I6ZmlsdGVyJzogIGluc3BlY3RvckZpbHRlclBsdWdpbixcbiAgJ2NvbXBsZXRpb246ZmlsdGVyJzogY29tcGxldGlvbkZpbHRlclBsdWdpblxufTtcbiJdfQ==
(3)
});
