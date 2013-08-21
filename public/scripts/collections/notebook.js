var _        = require('underscore');
var Backbone = require('backbone');

var Notebook = module.exports = Backbone.Collection.extend({
  model: require('../models/entry'),
  comparator: function (model) {
    // Sorting the collection based on positions in the DOM
    return _.indexOf(model.view.el.parentNode.childNodes, model.view.el);
  }
});

Notebook.prototype.getNext = function (model) {
  var index = this.indexOf(model);
  return index < this.length - 1 ? this.at(index + 1) : undefined;
};

Notebook.prototype.getPrev = function (model) {
  var index = this.indexOf(model);
  return index > 0 ? this.at(index - 1) : undefined;
};

/**
 * This method is used only for serializing the notebook for evaluation with the
 * eval function in the iframe context. It allows us to easier lookup any
 * previous results using a specific syntax
 *
 * @return {Object}
 */
Notebook.prototype.serializeForEval = function () {
  var object = {};
  this.each(function (model) {
    if (_.isUndefined(model._uniqueCellId)) { return; }
    object['$' + model._uniqueCellId] = model.get('result');
  });
  return object;
};

Notebook.prototype.serializeForGist = function () {
  return this.map(function (model) {
    if (model.get('type') === 'text') { return model.get('value'); }
    // Indent any code cells using a single tab
    return '\t' + (model.get('value') || '').split('\n').join('\n\t');
  }).join('\n\n');
};

Notebook.prototype.deserializeFromGist = function (gist) {
  var collection = [];

  // Split either the gist or a single tab character to force a starting code
  // cell.
  _.each((gist || '\t').split('\n\n'), function (section) {
    // When we encounter a tab character, switch modes to `code`.
    if (section.charAt(0) === '\t') {
      return collection.push({
        type: 'code',
        value: _.map(section.split('\n'), function (line) {
          return line.substr(1);
        }).join('\n')
      });
    }

    // If we hit anything else, it must be a text cell. However, text cells
    // could be contain multiple line returns anywhere within the contents.
    var prevModel = collection[collection.length - 1];

    if (prevModel && prevModel.type === 'text') {
      return prevModel.value += '\n\n' + section;
    }

    return collection.push({
      type: 'text',
      value: section
    });
  }, []);

  return collection;
};
