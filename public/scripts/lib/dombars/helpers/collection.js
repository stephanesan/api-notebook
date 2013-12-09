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
  var fragment = document.createDocumentFragment();
  var cache    = {};
  var nodes    = {};

  if (!collection || arguments.length < 2) {
    return fragment;
  }

  /**
   * Render a model using the helper function. Cache the rendered child nodes
   * and returned fragment for removal.
   *
   * @param  {Object} model
   * @return {Node}
   */
  var render = function (model) {
    var child = cache[model.cid] = options.fn(model);

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
   * Sort DOM nodes by removing from the DOM and re-adding in sorted order.
   */
  var sort = function () {
    var parent;

    _.each(nodes, function (children) {
      _.each(children, function (child) {
        if (!parent) {
          parent = child.parentNode;
        }

        return removeChild(child);
      });
    });

    collection.each(function (model) {
      var children = nodes[model.cid] || render(model);

      _.each(children, function (child) {
        parent.appendChild(child);
      });
    });
  };

  /**
   * Remove nodes from the DOM.
   *
   * @param {Object} model
   */
  var remove = function (model) {
    cache[model.cid].unsubscribe();
    _.each(nodes[model.cid], removeChild);

    delete nodes[model.cid];
    delete cache[model.cid];
  };

  /**
   * Remove all DOM nodes from the DOM.
   *
   * @return {[type]} [description]
   */
  var reset = function () {
    _.each(cache, function (node, key) {
      node.unsubscribe();
      delete cache[key];
    });

    _.each(nodes, function (children, key) {
      _.each(children, removeChild);
      delete nodes[key];
    });
  };

  DOMBars.VM.unsubscribe(function () {
    collection.off('sort',   sort);
    collection.off('reset',  reset);
    collection.off('remove', remove);
  });

  collection.each(function (model) {
    fragment.appendChild(render(model));
  });

  return fragment;
});
