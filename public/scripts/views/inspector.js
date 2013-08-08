var _        = require('underscore');
var View     = require('./view');
var Backbone = require('backbone');

var getType = function (object) {
  // Typeof check catches the basics
  if (typeof object === 'string')    { return 'String'; }
  if (typeof object === 'number')    { return 'Number'; }
  if (typeof object === 'boolean')   { return 'Boolean'; }
  if (typeof object === 'function')  { return 'Function'; }
  if (typeof object === 'undefined') { return 'Undefined'; }
  // Specific object types
  if (_.isNull(object))    { return 'Null'; }
  if (_.isArray(object))   { return 'Array'; }
  if (_.isDate(object))    { return 'Date'; }
  if (_.isRegExp(object))  { return 'RegExp'; }
  if (_.isElement(object)) { return 'Element'; }
  // Finally, return as a plain object
  return 'Object';
};

var shouldExpand = function (object) {
  return {
    'String':    false,
    'Number':    false,
    'Boolean':   false,
    'Undefined': false,
    'Null':      false,
    'Array':     true,
    'Function':  true,
    'Date':      true,
    'RegExp':    true,
    'Element':   true,
    'Object':    true
  }[getType(object)];
};

var stringifyByExpansion = function (object) {
  // If the object should be expanded to be viewed, just show the type
  if (shouldExpand(object)) { return getType(object); }
  return stringify(object);
};

var stringifyString = function (string) {
  return '"' + string.replace(/"/g, '\\"') + '"';
};

var stringifyArray = function (array) {
  return '[' + _.map(array, _.bind(function (value) {
    return stringifyByExpansion(value);
  }, this)).join(', ') + ']';
};

var stringifyObject = function (object) {
  return '{ ' + _.map(object, function (value, key) {
    return stringifyString(key) + ': ' + stringifyByExpansion(value);
  }).join(', ') + ' }';
};

var stringifyElement = function (element) {
  var div = document.createElement('div');
  div.appendChild(element.cloneNode(true));
  return div.innerHTML;
};

var renderPreview = function (prefix, inspect) {
  var html = '';
  html += '<div class="preview">';
  if (prefix) {
    html += '<span class="prefix">' + _.escape(prefix) + '</span>: ';
  }
  html += _.escape(stringify(inspect));
  html += '</div>';

  return Backbone.$(html)[0];
};

var stringify = function (object) {
  var type = getType(object);
  // These types will need custom stringification
  if (type === 'Array')   { return stringifyArray(object); }
  if (type === 'Object')  { return stringifyObject(object); }
  if (type === 'String')  { return stringifyString(object); }
  if (type === 'Element') { return stringifyElement(object); }
  // Every other type can safely be typecasted to the expected output
  return '' + object;
};

var InspectorView = module.exports = View.extend({
  className: 'inspector'
});

InspectorView.prototype.initialize = function (options) {
  this.prefix  = options.prefix;
  this.inspect = options.inspect;
  // Keep a copy of the recursion chain
  this.chain   = _.isArray(options.chain)   ? options.chain.slice()   : [];
  this.parents = _.isArray(options.parents) ? options.parents.slice() : [];
  this.parent  = this.parents[this.parents.length - 1];
  // Check if this is a recursive view
  var indexOf = this.chain.indexOf(this.inspect);
  this.recursive = indexOf > -1;
  // If it is, set a cloned cell property to use
  if (this.recursive) { this.duplicate = this.parents[indexOf]; }
  // Push this into the chain
  this.chain.push(this.inspect);
  this.parents.push(this);
};

InspectorView.prototype.events = {
  'click .preview': function (e) {
    e.stopPropagation();
    this.toggleDisplay();
  }
};

InspectorView.prototype.clone = function () {
  return new this.constructor(this.options);
};

InspectorView.prototype.toggleDisplay = function () {
  if (this.el.classList.contains('open')) {
    this.el.classList.remove('open');
    this.trigger('close', this);
  } else {
    this.el.classList.add('open');
    this.trigger('open', this);
  }
};

InspectorView.prototype.renderChild = function (prefix, object, onDemand) {
  var inspector = new InspectorView({
    prefix:  prefix,
    inspect: object,
    chain:   this.chain,
    parents: this.parents
  });
  this.children.push(inspector);
  inspector.render(onDemand).appendTo(this.childrenEl);
  return this;
};

InspectorView.prototype.renderOnDemand = function () {
  if (!this.parent) { return this; }

  this.listenTo(this.parent, 'open', function (parent) {
    this.renderPreview();
    this.renderChildren();
  });

  this.listenTo(this.parent, 'close', function (parent) {
    this.el.innerHTML = '';
  });

  return this;
};

InspectorView.prototype.renderChildren = function () {
  if (!shouldExpand(this.inspect)) { return this; }

  var el = this.childrenEl = Backbone.$('<div class="children"></div>')[0];
  this.el.appendChild(el);
  this.el.classList.add('can-expand');

  this.children = [];

  // Replace `Object.getOwnPropertyNames` for cross-browser support
  _.each(Object.getOwnPropertyNames(this.inspect), function (prop) {
    this.renderChild(stringifyString(prop), this.inspect[prop]);
  }, this);

  // Hidden prototype - super handy when debugging
  var __proto__ = Object.getPrototypeOf(this.inspect);
  this.renderChild('[[Prototype]]', __proto__, true);

  return this;
};

InspectorView.prototype.renderPreview = function () {
  var el = this.previewEl = renderPreview(this.prefix, this.inspect);
  this.el.appendChild(el);

  return this;
};

InspectorView.prototype.render = function (onDemand) {
  View.prototype.render.call(this);
  if (onDemand || this.recursive) {
    this.renderOnDemand();
  } else {
    this.renderPreview();
    this.renderChildren();
  }
  return this;
};
