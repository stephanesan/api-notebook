var NOTEBOOK_URL = process.env.application.url;

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
      notebook.config('id',  window.location.hash.substr(1));
      notebook.config('url', window.location.href);
    };

    updateId();
    window.addEventListener('hashchange', updateId);

    // Update the window hash when the id changes.
    notebook.on('config:id', function (id) {
      window.location.hash = (id == null ? '' : id);
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
