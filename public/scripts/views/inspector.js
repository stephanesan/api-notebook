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

var stringifyString = function (string) {
  return '"' + string.replace(/"/g, '\\"') + '"';
};

var stringifyByExpansion = function (object) {
  // If the object should be expanded to be viewed, just show the type
  if (shouldExpand(object)) { return getType(object); }
  if (_.isString(object))   { return stringifyString(object); }
  return '' + object;
};

var stringifyArray = function (array) {
  return '[' + _.map(array, _.bind(function (value) {
    return stringifyByExpansion(value);
  }, this)).join(', ') + ']';
};

var stringifyObject = function (object) {
  var objectString = _.map(object, function (value, key) {
    return stringifyString(key) + ': ' + stringifyByExpansion(value);
  }).join(', ');

  return '{' + (objectString ? ' ' + objectString + ' ' : '') + '}';
};

var stringifyElement = function (element) {
  var div = document.createElement('div');
  div.appendChild(element.cloneNode(true));
  return div.innerHTML;
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
  _.extend(this, _.pick(
    options, ['prefix', 'parent', 'parentView', 'inspect', 'special']
  ));

  if (this.parentView) {
    this.listenTo(this.parentView, 'close', this.close);
  }
};

InspectorView.prototype.events = {
  'click .preview': function (e) {
    e.stopPropagation();
    this.toggle();
  }
};

InspectorView.prototype.clone = function () {
  return new this.constructor(this.options);
};

InspectorView.prototype.open = function () {
  this.trigger('open', this);
  this.el.classList.add('open');
};

InspectorView.prototype.close = function () {
  this.trigger('close', this);
  this.el.classList.remove('open');
};

InspectorView.prototype.toggle = function () {
  this[this.el.classList.contains('open') ? 'close' : 'open']();
};

InspectorView.prototype.renderChild = function (prefix, object, special) {
  var inspector = new InspectorView({
    // Don't want to escape the `[[Prototype]]` property
    prefix:     prefix,
    parent:     this.inspect,
    special:    special,
    parentView: this,
    inspect:    object
  });
  this.children.push(inspector);
  inspector.render('parent' in this).appendTo(this.childrenEl);
  return this;
};

InspectorView.prototype.renderOnDemand = function () {
  if (!this.parentView) { return this; }

  this.listenTo(this.parentView, 'open', function (parent) {
    this.renderPreview();
    this.renderChildren();
  });

  this.listenTo(this.parentView, 'close', function (parent) {
    this.children     = [];
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
    var descriptor = Object.getOwnPropertyDescriptor(this.inspect, prop);

    if (_.isFunction(descriptor.get) || _.isFunction(descriptor.set)) {
      if (_.isFunction(descriptor.get)) {
        this.renderChild('get ' + prop, descriptor.get, true);
      }

      if (_.isFunction(descriptor.set)) {
        this.renderChild('set ' + prop, descriptor.set, true);
      }
    } else {
      var isSpecial = !descriptor.writable || !descriptor.configurable ||
                       !descriptor.enumerable;
      this.renderChild(prop, descriptor.value, isSpecial);
    }
  }, this);

  // Hidden prototype - super handy when debugging
  var prototype = Object.getPrototypeOf(this.inspect);
  this.renderChild('[[Prototype]]', prototype, true);

  return this;
};

InspectorView.prototype.renderPreview = function () {
  var html = '';

  html += '<div class="preview">';
  if (_.isString(this.prefix)) {
    html += '<span class="property' + (this.special ? ' special' : '') + '">';
    html += _.escape(this.prefix);
    html += '</span>: ';
  }
  html += '<span class="object">';
  html += _.escape(stringify(this.inspect));
  html += '</span>';
  html += '</div>';

  var el = this.previewEl = Backbone.$(html)[0];
  this.el.appendChild(el);

  return this;
};

InspectorView.prototype.render = function (onDemand) {
  View.prototype.render.call(this);
  if (onDemand) {
    this.renderOnDemand();
  } else {
    this.renderPreview();
    this.renderChildren();
  }
  return this;
};
