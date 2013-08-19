var _        = require('underscore');
var View     = require('./view');
var Backbone = require('backbone');
var domify   = require('domify');

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
  'click .preview, .arrow': function (e) {
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

InspectorView.prototype.shouldExpand = function () {
  return _.isObject(this.inspect);
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
  if (_.isObject(object)) { return this.getType(object); }
  if (_.isString(object)) { return this.stringifyString(object); }
  return '' + object;
};

InspectorView.prototype.stringifyArray = function (array) {
  return '[' + _.map(array, function (value) {
    return this.stringifyByExpansion(value);
  }, this).join(', ') + ']';
};

InspectorView.prototype.stringifyObject = function (object) {
  // Using the `keys` function to grab all the keys and then iterate, otherwise
  // when stringifying something like the window, it tries to use numeric
  // indexes like an array because of the `length` property.
  var objectString = _.map(_.keys(object), function (key) {
    var value = object[key];
    return this.stringifyString(key) + ': ' + this.stringifyByExpansion(value);
  }, this).join(', ');

  return '{' + (objectString ? ' ' + objectString + ' ' : '') + '}';
};

InspectorView.prototype.stringifyError = function (error) {
  // TIL DOMExceptions don't allow calling `toString` or string type coersion
  return Error.prototype.toString.call(error);
};

InspectorView.prototype.stringifyElement = function (element) {
  var div = document.createElement('div');
  div.appendChild(element.cloneNode(true));
  return div.innerHTML;
};

InspectorView.prototype.stringifyPreview = function () {
  return this.stringify(this.inspect);
};

InspectorView.prototype.stringify = function (object) {
  var type = this.getType(object);
  if (type === 'Error')   { return this.stringifyError(object); }
  if (type === 'Array')   { return this.stringifyArray(object); }
  if (type === 'Object')  { return this.stringifyObject(object); }
  if (type === 'String')  { return this.stringifyString(object); }
  if (type === 'Element') { return this.stringifyElement(object); }
  // Every other type can safely be typecasted to the expected output
  return '' + object;
};

InspectorView.prototype._renderChild = function (prefix, object, special) {
  var inspector = new InspectorView({
    prefix:     prefix,
    special:    special,
    parentView: this,
    inspect:    object,
    context:    this.context
  });
  this.children.push(inspector);
  inspector.render().appendTo(this.childrenEl);
  return this;
};

InspectorView.prototype.renderChildren = function () {
  this._renderChildrenEl();

  // If it should be expanded, add a class to show it can be. In no case should
  // we expand an error to show more though, since it should be displaying a
  // stack trace
  if (this.shouldExpand()) {
    this.el.classList.add('can-expand');
  }

  this.listenTo(this, 'open', this._renderChildren);

  this.listenTo(this, 'close', function (parent) {
    _.each(this.children, function (child) {
      child.remove();
    });

    this.children = [];
  });

  return this;
};

InspectorView.prototype._renderChildrenEl = function () {
  var el = this.childrenEl = domify('<div class="children"></div>');
  this.el.appendChild(el);
  this.children = [];
  return this;
};

InspectorView.prototype._renderChildren = function () {
  _.each(Object.getOwnPropertyNames(this.inspect), function (prop) {
    var descriptor = Object.getOwnPropertyDescriptor(this.inspect, prop);

    if (_.isFunction(descriptor.get) || _.isFunction(descriptor.set)) {
      if (_.isFunction(descriptor.get)) {
        this._renderChild('get ' + prop, descriptor.get, true);
      }

      if (_.isFunction(descriptor.set)) {
        this._renderChild('set ' + prop, descriptor.set, true);
      }
    } else {
      var isSpecial = !descriptor.writable || !descriptor.configurable ||
                       !descriptor.enumerable;
      this._renderChild(prop, descriptor.value, isSpecial);
    }
  }, this);

  // Hidden prototype - super handy when debugging
  var prototype = Object.getPrototypeOf(this.inspect);
  this._renderChild('[[Prototype]]', prototype, true);

  return this;
};

InspectorView.prototype.renderPreview = function () {
  var html = '';
  var type = this.getType(this.inspect);

  html += '<div class="arrow"></div>';
  html += '<div class="preview ' + type.toLowerCase() + '">';
  if (_.isString(this.prefix)) {
    html += '<span class="property' + (this.special ? ' special' : '') + '">';
    html += _.escape(this.prefix);
    html += '</span>: ';
  }
  html += '<span class="object">';
  html += _.escape(this.stringifyPreview());
  html += '</span>';
  html += '</div>';

  var el = this.previewEl = domify(html);
  this.el.appendChild(el);

  return this;
};

InspectorView.prototype.render = function (onDemand) {
  View.prototype.render.call(this);
  this.renderPreview();
  this.renderChildren();
  return this;
};
