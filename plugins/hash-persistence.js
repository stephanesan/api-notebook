!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.hashPersistencePlugin=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/* global App */

/**
 * The notebook triggers a load id middleware event to get the starting id.
 *
 * @param {String}   id
 * @param {Function} next
 * @param {Function} done
 */
var configurePlugin = function (config, next) {
  if (!config.id) {
    config.id = window.location.hash.substr(1);
  }

  return next();
};

/**
 * The notebook will trigger an id sync middleware event when the id changes.
 *
 * @param {String}   id
 * @param {Function} next
 * @param {Function} done
 */
App.config.on('change:id', function (_, id) {
  id = (id == null ? '' : String(id));

  window.location.hash = id;
});

/**
 * A user can use the forward and back buttons to navigate between notebooks.
 */
window.addEventListener('hashchange', function () {
  var id  = window.location.hash.substr(1);
  var url = window.location.href;

  App.config.set('id',      id);
  App.config.set('url',     url);
  App.config.set('fullUrl', url);
});

/**
 * Export the plugin architecture for direct use.
 *
 * @type {Object}
 */
module.exports = {
  'application:config': configurePlugin
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL3B1YmxpYy9zY3JpcHRzL3BsdWdpbnMvaGFzaC1wZXJzaXN0ZW5jZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyogZ2xvYmFsIEFwcCAqL1xuXG4vKipcbiAqIFRoZSBub3RlYm9vayB0cmlnZ2VycyBhIGxvYWQgaWQgbWlkZGxld2FyZSBldmVudCB0byBnZXQgdGhlIHN0YXJ0aW5nIGlkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSAgIGlkXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBkb25lXG4gKi9cbnZhciBjb25maWd1cmVQbHVnaW4gPSBmdW5jdGlvbiAoY29uZmlnLCBuZXh0KSB7XG4gIGlmICghY29uZmlnLmlkKSB7XG4gICAgY29uZmlnLmlkID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyKDEpO1xuICB9XG5cbiAgcmV0dXJuIG5leHQoKTtcbn07XG5cbi8qKlxuICogVGhlIG5vdGVib29rIHdpbGwgdHJpZ2dlciBhbiBpZCBzeW5jIG1pZGRsZXdhcmUgZXZlbnQgd2hlbiB0aGUgaWQgY2hhbmdlcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gICBpZFxuICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZG9uZVxuICovXG5BcHAuY29uZmlnLm9uKCdjaGFuZ2U6aWQnLCBmdW5jdGlvbiAoXywgaWQpIHtcbiAgaWQgPSAoaWQgPT0gbnVsbCA/ICcnIDogU3RyaW5nKGlkKSk7XG5cbiAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSBpZDtcbn0pO1xuXG4vKipcbiAqIEEgdXNlciBjYW4gdXNlIHRoZSBmb3J3YXJkIGFuZCBiYWNrIGJ1dHRvbnMgdG8gbmF2aWdhdGUgYmV0d2VlbiBub3RlYm9va3MuXG4gKi9cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgZnVuY3Rpb24gKCkge1xuICB2YXIgaWQgID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyKDEpO1xuICB2YXIgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG5cbiAgQXBwLmNvbmZpZy5zZXQoJ2lkJywgICAgICBpZCk7XG4gIEFwcC5jb25maWcuc2V0KCd1cmwnLCAgICAgdXJsKTtcbiAgQXBwLmNvbmZpZy5zZXQoJ2Z1bGxVcmwnLCB1cmwpO1xufSk7XG5cbi8qKlxuICogRXhwb3J0IHRoZSBwbHVnaW4gYXJjaGl0ZWN0dXJlIGZvciBkaXJlY3QgdXNlLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuICAnYXBwbGljYXRpb246Y29uZmlnJzogY29uZmlndXJlUGx1Z2luXG59O1xuIl19
(1)
});
