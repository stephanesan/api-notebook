var View = require('./view');

var HbsView = module.exports = View.extend();

HbsView.prototype.render = function () {
  // Render the element contents using the model data
  this.el.innerHTML = this.template(this.model && this.model.toJSON(), {
    data: this
  });

  return this;
};
