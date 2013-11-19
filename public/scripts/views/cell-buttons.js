var _      = require('underscore');
var domify = require('domify');
var View   = require('./view');

/**
 * Displays the cell controls overlay menu.
 *
 * @type {Function}
 */
var ButtonsView = module.exports = View.extend({
  className: 'cell-buttons',
  events: {
    'click .action': 'onClick',
    'mouseleave':    'remove'
  }
});

/**
 * Keep an array of controls to display.
 *
 * @type {Array}
 */
ButtonsView.controls = [];

/**
 * Render the controls overlay.
 *
 * @return {ButtonsView}
 */
ButtonsView.prototype.render = function () {
  View.prototype.render.call(this);

  // Transform the controls array into a DOM list and append to the view.
  var html = _.map(this.constructor.controls, function (action) {
    return [
      '<button class="action" data-action="' + action.command + '">',
      action.label,
      '</button>'
    ].join('');
  }).join('\n');
  this.el.appendChild(domify(html));

  return this;
};

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
