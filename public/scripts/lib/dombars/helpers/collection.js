var _       = require('underscore');
var DOMBars = require('dombars/runtime');

/**
 * Render a Backbone collection inside a DOMBars views.
 *
 * @param  {Object} collection
 * @param  {Object} options
 * @return {Node}
 */
DOMBars.registerHelper('collection', function (collection, options) {
  var element = document.createElement(options.hash.tagName || 'div');
  var nodes   = {};

  if (!collection || arguments.length < 2) {
    return element;
  }

  /**
   * Render a model using the helper function. Cache the rendered child nodes
   * and returned fragment for removal.
   *
   * @param  {Object} model
   * @return {Node}
   */
  var render = function (model) {
    var child = options.fn(model);

    // TODO: Keep track of unsubscribing/removing individual renders.
    nodes[model.cid] = _.toArray(child.childNodes);

    return child;
  };

  /**
   * Remove an element from the DOM.
   *
   * @param {Node} el
   */
  var removeChild = function (el) {
    return el.parentNode && el.parentNode.removeChild(el);
  };

  /**
   * Append a new model directly to the current element.
   *
   * @param {Object} model
   */
  var add = function (model) {
    element.appendChild(render(model));
  };

  /**
   * Sort DOM nodes by removing from the DOM and re-adding in sorted order.
   */
  var sort = function () {
    _.each(nodes, function (children) {
      _.each(children, removeChild);
    });

    collection.each(function (model) {
      _.each(nodes[model.cid], element.appendChild, element);
    });
  };

  /**
   * Remove nodes from the DOM.
   *
   * @param {Object} model
   */
  var remove = function (model) {
    _.each(nodes[model.cid], removeChild);

    delete nodes[model.cid];
  };

  /**
   * Remove all DOM nodes from the DOM.
   *
   * @return {[type]} [description]
   */
  var reset = function () {
    _.each(nodes, function (children, key) {
      _.each(children, removeChild);
      delete nodes[key];
    });
  };

  DOMBars.VM.unsubscribe(function () {
    collection.off('add',    add);
    collection.off('sort',   sort);
    collection.off('reset',  reset);
    collection.off('remove', remove);
  });

  collection.on('add',    add);
  collection.on('sort',   sort);
  collection.on('reset',  reset);
  collection.on('remove', remove);

  collection.each(add);

  return element;
});
