var _         = require('underscore');
var View      = require('./view');
var Backbone  = require('backbone');
var type      = require('../lib/type');
var domify    = require('domify');
var stringify = require('../lib/stringify');
var state     = require('../lib/state');
var messages  = require('../lib/messages');
var isSpecial = require('../lib/is-special-property');

var InspectorView = module.exports = View.extend({
  className: 'inspector'
});

InspectorView.prototype.initialize = function (options) {
  _.extend(this, _.pick(options, ['prefix', 'parent', 'inspect', 'special']));

  if (this.parent) {
    this.listenTo(this.parent, 'close', this.close);
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
  messages.trigger('resize');
};

InspectorView.prototype.close = function () {
  this.trigger('close', this);
  this.el.classList.remove('open');
  messages.trigger('resize');
};

InspectorView.prototype.toggle = function () {
  this[this.el.classList.contains('open') ? 'close' : 'open']();
};

InspectorView.prototype.shouldExpand = function () {
  return _.isObject(this.inspect);
};

InspectorView.prototype.stringifyPreview = function () {
  return stringify(this.inspect);
};

InspectorView.prototype._renderChild = function (prefix, object, special) {
  var inspector = new InspectorView({
    parent:  this,
    prefix:  prefix,
    inspect: object,
    special: special
  });
  this.children.push(inspector);
  inspector.render().appendTo(this.childrenEl);
  return this;
};

InspectorView.prototype.renderChildren = function () {
  if (!this.shouldExpand(this.inspect)) { return this; }

  this._renderChildrenEl();

  // If it should be expanded, add a class to show it can be. In no case should
  // we expand an error to show more though, since it should be displaying a
  // stack trace
  this.el.classList.add('can-expand');

  this.listenTo(this, 'open', this._renderChildren);

  this.listenTo(this, 'close', function () {
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
      this._renderChild(prop, descriptor.value, isSpecial(descriptor));
    }
  }, this);

  // Hidden prototype - super handy when debugging
  var prototype = Object.getPrototypeOf(this.inspect);
  this._renderChild('[[Prototype]]', prototype, true);

  return this;
};

InspectorView.prototype.renderPreview = function () {
  var html    = '';
  var special = this.special;

  html += '<div class="arrow"></div>';
  html += '<div class="preview ' + type(this.inspect) + '">';
  if (_.isString(this.prefix)) {
    html += '<span class="property' + (special ? ' is-special' : '') + '">';
    html += _.escape(this.prefix);
    html += '</span>: ';
  }
  html += '<span class="inspect">';
  html += _.escape(this.stringifyPreview());
  html += '</span>';
  html += '</div>';

  var el = this.previewEl = domify(html);
  this.el.appendChild(el);

  var toggleExtra = _.bind(function (toggle) {
    this.el.classList[toggle ? 'remove' : 'add']('hide');
  }, this);

  if (this.special) {
    // Listen for state  changes to show extra properties/information
    toggleExtra(state.get('showExtra'));
    this.listenTo(state, 'change:showExtra', function (_, toggle) {
      toggleExtra(toggle);
    });
  }

  return this;
};

InspectorView.prototype.render = function (onDemand) {
  View.prototype.render.call(this);
  this.renderPreview();
  this.renderChildren();
  return this;
};
