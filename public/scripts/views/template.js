var _       = require('underscore');
var View    = require('./view');
var DOMBars = require('../lib/dombars');

// State modules should be provided as data with every view.
var state       = require('../state/state');
var config      = require('../state/config');
var persistence = require('../state/persistence');

/**
 * Create a new view instance that uses the DOMBars templating engine.
 *
 * @type {Function}
 */
var TemplateView = module.exports = View.extend();

/**
 * The template property should be set on any extending views, and is executed
 * on render.
 *
 * @type {Function}
 */
TemplateView.prototype.template = function () {};

/**
 * Allow custom template data to be passed into the template.
 *
 * @type {Object}
 */
TemplateView.prototype.templateData = {};

/**
 * Render the template using the element using the template function.
 *
 * @return {this}
 */
TemplateView.prototype.render = function () {
  View.prototype.render.call(this);

  this._el = this.template.call(DOMBars, this.model, {
    data: _.extend({
      view:        this,
      data:        this.data,
      state:       state,
      config:      config,
      persistence: persistence,
    }, this.templateData)
  });

  if (this._el) {
    this.el.appendChild(this._el);
  }

  return this;
};

/**
 * Unsubscribe the template listeners before removal.
 */
TemplateView.prototype.remove = function () {
  if (this._el) {
    this._el.unsubscribe();
    delete this._el;
  }

  return View.prototype.remove.call(this);
};
