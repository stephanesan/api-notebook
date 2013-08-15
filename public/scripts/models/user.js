var Backbone = require('backbone');

var User = module.exports = Backbone.Model.extend({
  url: '/user'
});

User.prototype.initialize = function () {
  this._prevUserId = this.id;

  this.listenTo(this, 'change', function () {
    if (this.id === this._prevUserId) { return; }

    this.trigger('changeUser', this);
  });
};

User.prototype.sync = function (method) {
  // Disables syncing since its not required
  if (method !== 'read') { return; }

  return Backbone.Model.prototype.sync.apply(this, arguments);
};
