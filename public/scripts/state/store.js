var _        = require('underscore');
var storage  = require('store');
var Backbone = require('backbone');

/**
 * The constructor function for a store instance.
 *
 * @type {Function}
 */
var Store = Backbone.Model.extend();

/**
 * Override `get` to lazy load data from localStorage.
 *
 * @param  {String} key
 * @return {*}
 */
Store.prototype.get = function (key) {
  // Lazy load attributes from storage.
  if (!(key in this.attributes) && storage.enabled) {
    return this.attributes[key] = storage.get(key);
  }

  return Backbone.Model.prototype.get.apply(this, arguments);
};

/**
 * Override `set` to also save to localStorage.
 *
 * @param {String} key
 * @param {*}      value
 */
Store.prototype.set = function (key, value) {
  if (!_.isObject(key) && storage.enabled) {
    storage.set(key, value);
  }

  return Backbone.Model.prototype.set.apply(this, arguments);
};

/**
 * Override `clear` to also empty localStorage.
 */
Store.prototype.clear = function () {
  storage.clear();

  return Backbone.Model.prototype.clear.apply(this, arguments);
};

/**
 * Override `unset` to also remove the key from localStorage.
 */
Store.prototype.unset = function (key) {
  storage.remove(key);

  return Backbone.Model.prototype.unset.apply(this, arguments);
};

/**
 * Export a static instance of the store model.
 *
 * @type {Store}
 */
module.exports = new Store();
