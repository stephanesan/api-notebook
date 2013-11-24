var View     = require('./template');
var template = require('../../templates/views/cell-buttons.hbs');

/**
 * Displays the cell controls overlay menu.
 *
 * @type {Function}
 */
var ButtonsView = module.exports = View.extend({
  className: 'cell-buttons',
  events: {
    'mouseleave':    'remove',
    'click .action': 'onClick'
  }
});

/**
 * Keep an array of controls to display.
 *
 * @type {Array}
 */
ButtonsView.controls = [];

/**
 * Require the buttons template.
 *
 * @type {Function}
 */
ButtonsView.prototype.template = template;

/**
 * Event handler for clicks on control buttons. Pass thru for clicks on the
 * parent element.
 *
 * @param {object} e The normalized event object.
 */
ButtonsView.prototype.onClick = function (e) {
  e.preventDefault();

  this.trigger('action', this, e.target.getAttribute('data-action'));
  this.remove();
};

/**
 * Push some initial controls into the view.
 */
ButtonsView.controls.push({
  label: 'Insert Text Cell',
  command: 'newText'
}, {
  label: 'Insert Code Cell',
  command: 'newCode'
});
