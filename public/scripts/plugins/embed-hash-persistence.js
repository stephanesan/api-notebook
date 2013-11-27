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
    // Update the window hash when the id changes.
    notebook.on('config:id', function (id) {
      window.location.hash = id;
    });

    // Update the id and url when the hash of the window changes.
    var updateId = function () {
      notebook.config('id',  window.location.hash.substr(1));
      notebook.config('url', window.location.href);
    };

    updateId();
    window.addEventListener('hashchange', updateId);

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
