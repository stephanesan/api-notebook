var Backbone = require('backbone');

var View = module.exports = Backbone.View.extend();

View.prototype.render = function () {
  this.el.innerHTML = '';
  return this;
};

View.prototype.remove = function () {
  this.off(); // Remove every currently registered event
  Backbone.View.prototype.remove.call(this);
};

View.prototype.appendTo = function (el) {
  if (typeof el === 'function') {
    el.call(this, this.el);
  } else {
    el.appendChild(this.el);
  }

  return this;
};
