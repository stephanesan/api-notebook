!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.functionPropertyFilterPlugin=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var RETURN_PROP      = '!return';
var DESCRIPTION_PROP = '!description';

/**
 * Filters `@return` from showing up in the inspector view.
 *
 * @param {Object}   data
 * @param {Function} next
 */
exports['inspector:filter'] = function (data, next, done) {
  if (data.property === DESCRIPTION_PROP) {
    return done(null, false);
  }

  if (typeof data.parent === 'function' && data.property === RETURN_PROP) {
    return done(null, false);
  }

  return next();
};

/**
 * Augments the completion context to take into account the return property.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
exports['completion:function'] = function (data, next, done) {
  // Completes the using return property on functions, when available.
  if (RETURN_PROP in data.context) {
    return done(null, data.context[RETURN_PROP]);
  }

  return next();
};

/**
 * Provide a hook for completing descriptions from the description property.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
exports['completion:describe'] = function (data, next, done) {
  if (DESCRIPTION_PROP in data.context) {
    return done(null, data.context[DESCRIPTION_PROP]);
  }

  return next();
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL3B1YmxpYy9zY3JpcHRzL3BsdWdpbnMvZnVuY3Rpb24tcHJvcGVydHktZmlsdGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBSRVRVUk5fUFJPUCAgICAgID0gJyFyZXR1cm4nO1xudmFyIERFU0NSSVBUSU9OX1BST1AgPSAnIWRlc2NyaXB0aW9uJztcblxuLyoqXG4gKiBGaWx0ZXJzIGBAcmV0dXJuYCBmcm9tIHNob3dpbmcgdXAgaW4gdGhlIGluc3BlY3RvciB2aWV3LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGRhdGFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHRcbiAqL1xuZXhwb3J0c1snaW5zcGVjdG9yOmZpbHRlciddID0gZnVuY3Rpb24gKGRhdGEsIG5leHQsIGRvbmUpIHtcbiAgaWYgKGRhdGEucHJvcGVydHkgPT09IERFU0NSSVBUSU9OX1BST1ApIHtcbiAgICByZXR1cm4gZG9uZShudWxsLCBmYWxzZSk7XG4gIH1cblxuICBpZiAodHlwZW9mIGRhdGEucGFyZW50ID09PSAnZnVuY3Rpb24nICYmIGRhdGEucHJvcGVydHkgPT09IFJFVFVSTl9QUk9QKSB7XG4gICAgcmV0dXJuIGRvbmUobnVsbCwgZmFsc2UpO1xuICB9XG5cbiAgcmV0dXJuIG5leHQoKTtcbn07XG5cbi8qKlxuICogQXVnbWVudHMgdGhlIGNvbXBsZXRpb24gY29udGV4dCB0byB0YWtlIGludG8gYWNjb3VudCB0aGUgcmV0dXJuIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGRhdGFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGRvbmVcbiAqL1xuZXhwb3J0c1snY29tcGxldGlvbjpmdW5jdGlvbiddID0gZnVuY3Rpb24gKGRhdGEsIG5leHQsIGRvbmUpIHtcbiAgLy8gQ29tcGxldGVzIHRoZSB1c2luZyByZXR1cm4gcHJvcGVydHkgb24gZnVuY3Rpb25zLCB3aGVuIGF2YWlsYWJsZS5cbiAgaWYgKFJFVFVSTl9QUk9QIGluIGRhdGEuY29udGV4dCkge1xuICAgIHJldHVybiBkb25lKG51bGwsIGRhdGEuY29udGV4dFtSRVRVUk5fUFJPUF0pO1xuICB9XG5cbiAgcmV0dXJuIG5leHQoKTtcbn07XG5cbi8qKlxuICogUHJvdmlkZSBhIGhvb2sgZm9yIGNvbXBsZXRpbmcgZGVzY3JpcHRpb25zIGZyb20gdGhlIGRlc2NyaXB0aW9uIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGRhdGFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGRvbmVcbiAqL1xuZXhwb3J0c1snY29tcGxldGlvbjpkZXNjcmliZSddID0gZnVuY3Rpb24gKGRhdGEsIG5leHQsIGRvbmUpIHtcbiAgaWYgKERFU0NSSVBUSU9OX1BST1AgaW4gZGF0YS5jb250ZXh0KSB7XG4gICAgcmV0dXJuIGRvbmUobnVsbCwgZGF0YS5jb250ZXh0W0RFU0NSSVBUSU9OX1BST1BdKTtcbiAgfVxuXG4gIHJldHVybiBuZXh0KCk7XG59O1xuIl19
(1)
});
