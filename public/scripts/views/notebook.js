var _    = require('underscore');
var View = require('./view');

var CodeView = require('./cells/code');
var TextView = require('./cells/text');

var EntryModel = require('../models/entry');

var NotebookCollection = require('../collections/notebook');

var insertAfter = require('../lib/insert-after');

var Notebook = module.exports = View.extend({
  className: 'notebook'
});

Notebook.prototype.initialize = function () {
  this.collection = window.collection = new NotebookCollection();
};

Notebook.prototype.getNext = function (model) {
  var index = this.collection.indexOf(model);
  return ~index ? this.collection.at(index + 1) : undefined;
};

Notebook.prototype.getPrev = function (model) {
  var index = this.collection.indexOf(model);
  return ~index ? this.collection.at(index - 1) : undefined;
};

Notebook.prototype.getNextView = function (view) {
  var model = this.getNext(view.model);
  return model && model.view;
};

Notebook.prototype.getPrevView = function (view) {
  var model = this.getPrev(view.model);
  return model && model.view;
};

Notebook.prototype.newCodeView = function (el, options) {
  var view = new CodeView(_.extend({}, {
    model: new EntryModel({
      type: 'code'
    })
  }, options));
  this.appendView(view, el);
  return view;
};

Notebook.prototype.newTextView = function (el, options) {
  var view = new TextView(_.extend({}, {
    model: new EntryModel({
      type: 'text'
    })
  }, options));
  this.appendView(view, el);
  return view;
};

Notebook.prototype.appendView = function (view, before) {
  // Listen to execution events from the child views, which may or may not
  // require new working cells to be appended to the console
  this.listenTo(view, 'close', function (view) {
    if (this.el.lastChild === view.el) {
      this.newCodeView();
    } else {
      this.getNextView(view).focus().moveCursorToEnd(0);
    }
  });
  // Listen to any attempts at navigating up cells
  this.listenTo(view, 'navigateUp', function (view) {
    var view = this.getPrevView(view);
    view && view.focus().moveCursorToEnd();
  });
  // Listen to any attempts at navigating down cells
  this.listenTo(view, 'navigateDown', function (view) {
    var view = this.getNextView(view);
    view && view.focus().moveCursorToEnd(0);
  });
  // Listen to any attempts at moving cells up
  this.listenTo(view, 'moveUp', function (view) {
    if (!view.el.previousSibling) { return; }

    view.el.parentNode.insertBefore(view.el, view.el.previousSibling);
    view.focus();
    this.collection.sort();
  });
  // Listen to any attempts at moving cells down
  this.listenTo(view, 'moveDown', function (view) {
    if (!view.el.nextSibling) { return; }

    insertAfter(view.el, view.el.nextSibling);
    view.focus();
    this.collection.sort();
  });
  // Listen to clone events and append the new views after the current view
  this.listenTo(view, 'clone', function (view, clone) {
    this.appendView(clone, view.el);
    this.collection.sort();
  });
  // Listen to removals from the document
  this.listenTo(view, 'remove', function (view) {
    // If it's the last node in the document, append a new code cell to work with
    if (this.el.childNodes.length < 2) { this.newCodeView(view.el); }
    // Focus in on the next/previous cell
    var newView = this.getNextView(view) || this.getPrevView(view);
    newView && newView.focus().moveCursorToEnd();
    // Need to remove the model from the collection, otherwise we'll have problems
    this.collection.remove(view.model);
  });

  // Listening to different events for `text` cells
  if (view instanceof TextView) {
    // Listen to a code event which tells us to make a new code cell
    this.listenTo(view, 'code', function (view, code) {
      var codeView = this.newCodeView(view.el, {
        model: new EntryModel({
          type: 'code',
          value: code
        })
      });

      view.getValue() || view.remove();
    });
  }

  // Listening to another set of events for `code` cells
  if (view instanceof CodeView) {
    this.listenTo(view, 'text', function (view, text) {
      var textView = this.newTextView(view.el, {
        model: new EntryModel({
          type: 'text',
          value: text
        })
      });

      view.getValue() || view.remove();
    });

    this.listenTo(view, 'browseUp', function (view, currentCid) {
      var model = this.collection.get(currentCid);

      while (model = this.getPrev(model)) {
        if (model.get('type') === 'code') {
          view.browseCell(model);
          view.moveCursorToEnd();
          break;
        }
      }
    });

    this.listenTo(view, 'browseDown', function (view, currentCid) {
      var model = this.collection.get(currentCid);

      while (model = this.getNext(model)) {
        if (model.get('type') === 'code') {
          view.browseCell(model);
          view.moveCursorToEnd(0);
          break;
        }
      }
    });
  }

  // Append the view to the end of the console
  view.render().appendTo(_.bind(function (el) {
    return before ? insertAfter(el, before) : this.el.appendChild(el);
  }, this));
  // Set a reference to the original notebook
  view.notebook = this;
  // Alias a reference to the view from the model. This will be needed for
  // ordering the collection and insert before/after other input cells
  view.model.view = view;
  // Add the model to the collection
  this.collection.push(view.model);

  return this;
};

Notebook.prototype.appendTo = function (el) {
  View.prototype.appendTo.call(this, el);
  // Append an initial starting view
  this.newCodeView();
  return this;
};
