var Backbone = require('backbone');

// This is a standard entry model for the notebook
var Entry = module.exports = Backbone.Model.extend({
  defaults: {
    type: 'code'
  }
});
