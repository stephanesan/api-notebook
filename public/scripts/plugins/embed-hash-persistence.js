var notebooks  = [];

window.addEventListener('hashchange', function () {
  for (var i = 0; i < notebooks.length; i++) {
    notebooks[i].config('id', window.location.hash.substr(1));
    notebooks[i].config('url', window.location.href);
  }
});

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
    notebook.config('id', window.location.hash.substr(1));

    notebook.on('config:id', function (id) {
      window.location.hash = id;
    });

    notebooks.push(notebook);
  });

  /**
   * Unsubscribe to a single notebook from hash changes.
   *
   * @param {Object} notebook
   */
  Notebook.unsubscribe(function (notebook) {
    for (var i = 0; i < notebooks.length; i++) {
      if (notebook === notebooks[i]) {
        i--;
        notebooks.pop();
      }
    }
  });
};
