var Backbone = require('backbone');

var Controls = module.exports = Backbone.Model.extend({
  actions: [{
      name: "toggle-mode",
      label: "Switch Mode",
      icon: "file"
    }, {
      name: "add-cell",
      label: "Add Cell",
      icon: "plus"
    }, {
      name: "copy-cell",
      label: "Copy Cell",
      icon: "hdd"
    }, {
      name: "delete-cell",
      label: "Delete Cell",
      icon: "trash"
    }]
  }
);
