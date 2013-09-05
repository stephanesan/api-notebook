var _        = require('underscore');
var Backbone = require('backbone');

var Persistence = module.exports = Backbone.Model.extend();

Persistence.prototype.initialize = function (attributes, options) {
  this.user = options && options.user;
};
