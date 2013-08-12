var _        = require('underscore');
var View     = require('./view');
var Backbone = require('backbone');

var InspectorView = module.exports = View.extend({
  className: 'inspector'
});

InspectorView.prototype.initialize = function (options) {
  _.extend(this, _.pick(
    options, ['prefix', 'parentView', 'inspect', 'special', 'context']
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

InspectorView.prototype.shouldExpand = function (object) {
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
    'Object':    true,
    'Error':     true
  }[this.getType(object)];
};

InspectorView.prototype.getType = function (object) {
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
  // Need to check certain properties against the sandbox window
  if (object instanceof this.context.Error) { return 'Error'; }
  // Finally, return as a plain object
  return 'Object';
};

InspectorView.prototype.stringifyString = function (string) {
  return '"' + string.replace(/"/g, '\\"') + '"';
};

InspectorView.prototype.stringifyByExpansion = function (object) {
  // If the object should be expanded to be viewed, just show the type
  if (this.shouldExpand(object)) { return this.getType(object); }
  if (_.isString(object))   { return this.stringifyString(object); }
  return '' + object;
};

InspectorView.prototype.stringifyArray = function (array) {
  return '[' + _.map(array, function (value) {
    return this.stringifyByExpansion(value);
  }, this).join(', ') + ']';
};

InspectorView.prototype.stringifyObject = function (object) {
  var objectString = _.map(object, function (value, key) {
    return this.stringifyString(key) + ': ' + this.stringifyByExpansion(value);
  }, this).join(', ');

  return '{' + (objectString ? ' ' + objectString + ' ' : '') + '}';
};

InspectorView.prototype.stringifyElement = function (element) {
  var div = document.createElement('div');
  div.appendChild(element.cloneNode(true));
  return div.innerHTML;
};

InspectorView.prototype.stringify = function (object) {
  var type = this.getType(object);
  // TIL that DOMExceptions don't allow calling `toString`
  if (type === 'Error')   { return Error.prototype.toString.call(object); }
  if (type === 'Array')   { return this.stringifyArray(object); }
  if (type === 'Object')  { return this.stringifyObject(object); }
  if (type === 'String')  { return this.stringifyString(object); }
  if (type === 'Element') { return this.stringifyElement(object); }
  // Every other type can safely be typecasted to the expected output
  return '' + object;
};

InspectorView.prototype.renderChild = function (prefix, object, special) {
  var inspector = new InspectorView({
    prefix:     prefix,
    special:    special,
    parentView: this,
    inspect:    object,
    context:    this.context
  });
  this.children.push(inspector);
  inspector.render('parentView' in this).appendTo(this.childrenEl);
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
  if (!this.shouldExpand(this.inspect)) { return this; }

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
  html += _.escape(this.stringify(this.inspect));
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
