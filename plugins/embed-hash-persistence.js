!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.embedHashPersistencePlugin=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var NOTEBOOK_URL = {"url":"https://mulesoft.github.io/api-notebook/","title":"API Notebook","oauthCallback":"/authenticate/oauth.html"}.url;

/**
 * Export the attaching functionality.
 *
 * @param {Function} Notebook
 */
module.exports = function (Notebook) {
  /**
   * Subscribe to a single notebook for hash changes.
   *
   * @param {Object} notebook
   */
  Notebook.subscribe(function (notebook) {
    // Update the id and url when the hash of the window changes.
    var updateId = function () {
      var id  = window.location.hash.substr(1);
      var url = window.location.href;

      notebook.config('id',  id);
      notebook.config('url', url);
    };

    updateId();
    window.addEventListener('hashchange', updateId);

    // Update the window hash when the id changes.
    notebook.on('config:id', function (id) {
      id = (id == null ? '' : String(id));

      // Update the hash url if it changed.
      if (window.location.hash.substr(1) !== id) {
        window.location.hash = id;
        notebook.config('fullUrl', NOTEBOOK_URL + (id ? '#' + id : ''));
      }
    });

    /**
     * Unsubscribe to a single notebook from hash changes.
     *
     * @param {Object} notebook
     */
    Notebook.unsubscribe(function () {
      window.removeEventListener('hashchange', updateId);
    });
  });
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL3B1YmxpYy9zY3JpcHRzL3BsdWdpbnMvZW1iZWQtaGFzaC1wZXJzaXN0ZW5jZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIE5PVEVCT09LX1VSTCA9IHtcInVybFwiOlwiaHR0cHM6Ly9tdWxlc29mdC5naXRodWIuaW8vYXBpLW5vdGVib29rL1wiLFwidGl0bGVcIjpcIkFQSSBOb3RlYm9va1wiLFwib2F1dGhDYWxsYmFja1wiOlwiL2F1dGhlbnRpY2F0ZS9vYXV0aC5odG1sXCJ9LnVybDtcblxuLyoqXG4gKiBFeHBvcnQgdGhlIGF0dGFjaGluZyBmdW5jdGlvbmFsaXR5LlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IE5vdGVib29rXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKE5vdGVib29rKSB7XG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgdG8gYSBzaW5nbGUgbm90ZWJvb2sgZm9yIGhhc2ggY2hhbmdlcy5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IG5vdGVib29rXG4gICAqL1xuICBOb3RlYm9vay5zdWJzY3JpYmUoZnVuY3Rpb24gKG5vdGVib29rKSB7XG4gICAgLy8gVXBkYXRlIHRoZSBpZCBhbmQgdXJsIHdoZW4gdGhlIGhhc2ggb2YgdGhlIHdpbmRvdyBjaGFuZ2VzLlxuICAgIHZhciB1cGRhdGVJZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBpZCAgPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHIoMSk7XG4gICAgICB2YXIgdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWY7XG5cbiAgICAgIG5vdGVib29rLmNvbmZpZygnaWQnLCAgaWQpO1xuICAgICAgbm90ZWJvb2suY29uZmlnKCd1cmwnLCB1cmwpO1xuICAgIH07XG5cbiAgICB1cGRhdGVJZCgpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgdXBkYXRlSWQpO1xuXG4gICAgLy8gVXBkYXRlIHRoZSB3aW5kb3cgaGFzaCB3aGVuIHRoZSBpZCBjaGFuZ2VzLlxuICAgIG5vdGVib29rLm9uKCdjb25maWc6aWQnLCBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIGlkID0gKGlkID09IG51bGwgPyAnJyA6IFN0cmluZyhpZCkpO1xuXG4gICAgICAvLyBVcGRhdGUgdGhlIGhhc2ggdXJsIGlmIGl0IGNoYW5nZWQuXG4gICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyKDEpICE9PSBpZCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9IGlkO1xuICAgICAgICBub3RlYm9vay5jb25maWcoJ2Z1bGxVcmwnLCBOT1RFQk9PS19VUkwgKyAoaWQgPyAnIycgKyBpZCA6ICcnKSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvKipcbiAgICAgKiBVbnN1YnNjcmliZSB0byBhIHNpbmdsZSBub3RlYm9vayBmcm9tIGhhc2ggY2hhbmdlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBub3RlYm9va1xuICAgICAqL1xuICAgIE5vdGVib29rLnVuc3Vic2NyaWJlKGZ1bmN0aW9uICgpIHtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdoYXNoY2hhbmdlJywgdXBkYXRlSWQpO1xuICAgIH0pO1xuICB9KTtcbn07XG4iXX0=
(1)
});
