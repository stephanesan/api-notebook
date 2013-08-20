var Backbone = require('backbone');

var Controls = module.exports = Backbone.Model.extend({
  actions: [
    {
      name: "moveUp",
      label: "Move Cell Up",
      icon: "hdd"
    },
    {
      name: "moveDown",
      label: "Move Cell Down",
      icon: "hdd"
    },
    {
      name: "switch",
      label: "Switch Mode",
      icon: "file"
    },
    {
      name: "clone",
      label: "Copy Cell",
      icon: "hdd"
    },
    {
      name: "remove",
      label: "Delete Cell",
      icon: "trash"
    },
    {
      name: "new",
      label: "Add Cell",
      icon: "plus"
    }
  ]
});
