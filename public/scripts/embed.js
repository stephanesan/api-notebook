/**
 * Extend any object with the properties from other objects, overriding of left
 * to right.
 *
 * @param  {Object} obj Root object to copy properties to.
 * @param  {Object} ... Any number of source objects that properties will be
 *                      copied from.
 * @return {Object}
 */
var extend = function (obj /*, ...source */) {
  var args = Array.prototype.slice.call(arguments, 1);

  for (var i = 0; i < args.length; i++) {
    if (typeof args[i] === 'object') {
      for (var p in args[i]) {
        obj[p] = args[i][p];
      }
    }
  }

  return obj;
};

/**
 * Copy of all the default options for a new Notebook instance.
 *
 * @type {Object}
 */
var defaults = {
  id:        null, // Initial id to pull content from
  content:   null, // Fallback content in case of no id
  minWidth:  null, // Minimum width of the iframe
  minHeight: null  // Minimum height of the iframe
};

/**
 * Creates an embeddable version of the notebook for general consumption.
 *
 * @param  {Element|Function} el Pass an element or a function that accepts an
 *                               element as the only argument.
 * @param  {Object} options
 * @return {Notebook}
 */
var Notebook = module.exports = function (el, options) {
  if (!(this instanceof Notebook)) { return new Notebook(el, options); }

  this.options = extend({}, defaults, options);

  this.makeFrame(el);
};

/**
 * Generate an iframe to house the embeddable widget and append to the
 * designated element in the DOM.
 *
 * @param  {Element|Function} el
 * @return {Notebook}
 */
Notebook.prototype.makeFrame = function (el) {
  var frame = this.frame = document.createElement('iframe');

  if (typeof el.appendChild === 'function') {
    el.appendChild(frame);
  } else {
    el(frame);
  }

  return this;
};
