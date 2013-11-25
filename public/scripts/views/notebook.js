var _    = require('underscore');
var View = require('./view');

var CodeView           = require('./code-cell');
var TextView           = require('./text-cell');
var EditorView         = require('./editor-cell');
var NotebookCollection = require('../collections/notebook');

var Sandbox     = require('../lib/sandbox');
var insertAfter = require('../lib/browser/insert-after');
var middleware  = require('../state/middleware');
var persistence = require('../state/persistence');

var completionMiddleware = require('../lib/sandbox-completion');

/**
 * Generates a generic function for appending new view instances.
 *
 * @param  {Backbone.View} View
 * @return {Function}
 */
var appendNewView = function (View) {
  return function (el, value) {
    var view = new View();
    this.appendView(view, el);
    view.setValue(value || '').moveCursorToEnd();
    this.refreshFromView(view);

    return view;
  };
};

var prependNewView = function (View) {
  return function (el, value) {
    return appendNewView(View).call(this, function (viewEl) {
      el.parentNode.insertBefore(viewEl, el);
    }, value);
  };
};

/**
 * Create a new notebook instance.
 *
 * @type {Function}
 */
var Notebook = module.exports = View.extend({
  className: 'notebook-view'
});

/**
 * Runs when a new notebook instance is created.
 *
 * @param  {Object} options
 */
Notebook.prototype.initialize = function () {
  this.sandbox    = new Sandbox();
  this.collection = new NotebookCollection();

  // Register a middleware hook for augmenting the sandbox context.
  this._middleware = {
    'sandbox:context': _.bind(function (context, next) {
      _.each(this.collection.filter(function (model) {
        return model.get('type') === 'code';
      }), function (model, index) {
        context['$' + index] = model.get('result');
      });

      return next();
    }, this)
  };

  // The completion options object is shared between code views and used by
  // the completion widget.
  this.completionOptions = {
    global: this.sandbox.window
  };

  _.extend(this._middleware, completionMiddleware(this.sandbox.window));
  middleware.register(this._middleware);
};

/**
 * Removes the notebook from the DOM.
 *
 * @return {Notebook}
 */
Notebook.prototype.remove = function () {
  if (this.sandbox) {
    this.sandbox.remove();
  }

  middleware.deregister(this._middleware);

  // Remove references
  delete this.sandbox;
  delete this.collection;
  delete this._middleware;

  return View.prototype.remove.call(this);
};

/**
 * Update the notebook contents and save to the persistence layer.
 *
 * @param {Function} done
 */
Notebook.prototype.update = function () {
  persistence.set('notebook', this.collection.toJSON());
};

/**
 * Refresh the completion context object, used by the completion helper in code
 * cells to get completion results.
 *
 * @return {Notebook}
 */
Notebook.prototype.refreshCompletion = function () {
  // Extends the context with additional inline completion results. Requires
  // using `Object.create` since you can't extend an object with every property
  // of the global object.
  var context = Object.create(this.sandbox.window);

  middleware.trigger('sandbox:context', context, _.bind(function (err, data) {
    this.completionOptions.context = data;
  }, this));

  return this;
};

/**
 * Render the notebook view.
 *
 * @return {Notebook}
 */
Notebook.prototype.render = function () {
  View.prototype.render.call(this);
  this.collection = new NotebookCollection();

  // Empty all the current content to reset with new contents
  _.each(persistence.get('notebook'), function (cell) {
    var appendView = 'appendCodeView';

    if (cell.type === 'text') {
      appendView = 'appendTextView';
    }

    this[appendView](null, cell.value);
  }, this);

  if (!this.collection.length) {
    this.appendCodeView();
  }

  // Start listening for changes again.
  this.listenTo(this.collection, 'remove sort',        this.refreshCompletion);
  this.listenTo(this.collection, 'remove sort change', this.update);

  this.refreshCompletion();

  return this;
};

/**
 * Execute the entire notebook sequentially.
 *
 * @param  {Function} done
 */
Notebook.prototype.execute = function (done) {
  if (this._execution) {
    return done && done(new Error('Already executing notebook'));
  }

  var that = this;
  this._execution = true;

  // This chaining is a little awkward, but it allows the execution to work with
  // asynchronous callbacks.
  (function execution (view) {
    // If no view is passed through, we must have hit the last view.
    if (!view) {
      that._execution = false;
      return done && done();
    }

    // Only execute code cells, skips other cell types.
    if (view.model.get('type') === 'code') {
      view.focus().moveCursorToEnd();

      view.execute(function () {
        execution(that.getNextView(view));
      });
    } else {
      execution(that.getNextView(view));
    }
  })(this.collection.at(0).view);
};

/**
 * Returns the next view in the notebook.
 *
 * @param  {Object} view
 * @return {Object}
 */
Notebook.prototype.getNextView = function (view) {
  var model = this.collection.getNext(view.model);
  return model && model.view;
};

/**
 * Returns the previous view in the notebook.
 *
 * @param  {Object} view
 * @return {Object}
 */
Notebook.prototype.getPrevView = function (view) {
  var model = this.collection.getPrev(view.model);
  return model && model.view;
};

/**
 * Refresh all notebook cells from the current view instance.
 *
 * @param  {Object}   view
 * @return {Notebook}
 */
Notebook.prototype.refreshFromView = function (view) {
  do {
    view.refresh();
  } while (view = this.getNextView(view));

  return this;
};

/**
 * Append and prepend new cell view instances.
 */
Notebook.prototype.appendCodeView  = appendNewView(CodeView);
Notebook.prototype.appendTextView  = appendNewView(TextView);
Notebook.prototype.prependCodeView = prependNewView(CodeView);
Notebook.prototype.prependTextView = prependNewView(TextView);

/**
 * Append any view to the notebook. Sets up a few listeners on every view
 * instance and manages interactions between cells.
 *
 * @param  {Object}   view
 * @param  {Node}     before
 * @return {Notebook}
 */
Notebook.prototype.appendView = function (view, before) {
  if (view instanceof EditorView) {
    this.listenTo(view, 'navigateUp', function (view) {
      var prevView = this.getPrevView(view);
      if (prevView) { prevView.focus().moveCursorToEnd(); }
    });

    this.listenTo(view, 'navigateDown', function (view) {
      var nextView = this.getNextView(view);
      if (nextView) { nextView.focus().moveCursorToEnd(0); }
    });

    this.listenTo(view, 'moveUp', function (view) {
      if (!view.el.previousSibling) { return; }

      view.el.parentNode.insertBefore(view.el, view.el.previousSibling);
      view.focus();
      this.collection.sort();
      this.refreshFromView(view);
    });

    this.listenTo(view, 'moveDown', function (view) {
      if (!view.el.nextSibling) { return; }

      insertAfter(view.el, view.el.nextSibling);
      view.focus();
      this.collection.sort();
      this.refreshFromView(this.getPrevView(view));
    });

    this.listenTo(view, 'newTextAbove', function (view) {
      this.prependTextView(view.el).focus();
    });

    this.listenTo(view, 'newCodeAbove', function (view) {
      this.prependCodeView(view.el).focus();
    });

    this.listenTo(view, 'newTextBelow', function (view) {
      this.appendTextView(view.el).focus();
    });

    this.listenTo(view, 'newCodeBelow', function (view) {
      this.appendCodeView(view.el).focus();
    });

    // Listen to clone events and append the new views after the current view
    this.listenTo(view, 'clone', function (view, clone) {
      this.appendView(clone, view.el);
      // Need to work around the editor being removed and added with text cells
      var cursor = view.editor && view.editor.getCursor();
      clone.focus().editor.setCursor(cursor);
      this.refreshFromView(clone);
    });

    this.listenTo(view, 'remove', function (view) {
      // If it's the last node in the document, append a new code cell
      if (this.el.childNodes.length < 2) { this.appendCodeView(view.el); }

      // Focus in on the next/previous cell
      var newView = this.getNextView(view) || this.getPrevView(view);
      newView.focus().moveCursorToEnd();

      // Need to remove the model from the collection
      this.collection.remove(view.model);
      this.refreshFromView(newView);
    });

    // Listen for switch events, which isn't a real switch but recreates the
    // view using the data it has available. This results in some issues, but
    // avoids a whole different set of issues that would arrise trying to change
    // everything on the fly.
    this.listenTo(view, 'switch', function (view) {
      var newView;
      if (view instanceof TextView) {
        newView = this.appendCodeView(view.el, view.getValue());
      } else {
        newView = this.appendTextView(view.el, view.getValue());
      }

      var cursor = view.editor && view.editor.getCursor();
      view.remove();
      newView.focus();
      if (cursor) { newView.editor.setCursor(cursor); }
    });
  }

  // Listening to different events for `text` cells
  if (view instanceof TextView) {
    this.listenTo(view, 'blur', function (view) {
      if (this.el.lastChild === view.el) {
        this.appendCodeView().focus();
      }
    });
  }

  // Listening to another set of events for `code` cells
  if (view instanceof CodeView) {
    // Listen to execution events from the child views, which may or may not
    // require new working cells to be appended to the notebook.
    this.listenTo(view, 'execute', function (view) {
      // Refresh all completion data when a cell is executed.
      this.refreshCompletion();

      // Need a flag here so we don't cause an infinite loop when executing the
      // notebook contents. (E.g. Hitting the last cell and adding a new cell).
      if (this._execution) { return; }

      if (this.el.lastChild === view.el) {
        this.appendCodeView().focus();
      } else {
        this.getNextView(view).moveCursorToEnd().focus();
      }
    });

    this.listenTo(view, 'browseUp', function (view, currentCid) {
      var model = this.collection.getPrevCode(this.collection.get(currentCid));

      if (model) {
        view.browseToCell(model);
        view.moveCursorToEnd();
      }
    });

    this.listenTo(view, 'browseDown', function (view, currentCid) {
      var model = this.collection.getNextCode(this.collection.get(currentCid));

      if (model) {
        view.browseToCell(model);
        view.moveCursorToEnd(0);
      }
    });

    this.listenTo(view, 'linesChanged', this.refreshFromView);
  }

  view.notebook = this;
  this.collection.push(view.model);

  // Append the view to the end of the console
  view.render().appendTo(_.bind(function (el) {
    if (_.isFunction(before)) {
      return before(el);
    }

    return before ? insertAfter(el, before) : this.el.appendChild(el);
  }, this));

  // Sort the collection every time a node is added in a different position to
  // just being appended at the end
  if (before) { this.collection.sort(); }

  return this;
};
