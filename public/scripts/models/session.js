var Backbone = require('backbone');

var Session = module.exports = Backbone.Model.extend({
  url: '/session'
});

Session.prototype.initialize = function () {
  this._prevSessionId = this.id;

  this.listenTo(this, 'change', function () {
    if (this.id === this._prevSessionId) { return; }

    this.trigger('changeUser', this);
  });
};

Session.prototype.sync = function (method) {
  // Disables syncing since its not required
  if (method !== 'read') { return; }

  return Backbone.Model.prototype.sync.apply(this, arguments);
};
