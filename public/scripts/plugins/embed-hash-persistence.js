var NOTEBOOK_URL = process.env.application.url;
var currentId    = '';

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

      if (id !== currentId) {
        notebook.message('load', id);
      }

      currentId = id;
    };

    updateId();
    window.addEventListener('hashchange', updateId);

    // Update the window hash when the id changes.
    notebook.on('config:id', function (id) {
      id = (id == null ? '' : String(id));

      if (id === currentId) { return; }

      window.location.hash = currentId = id;
      notebook.config('fullUrl', NOTEBOOK_URL + (id ? '#' + id : ''));
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
