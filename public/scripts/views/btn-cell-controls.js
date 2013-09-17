var View = require('./view');

/**
 * Creates a button that can be used to display cell controls.
 *
 * @type {Function}
 */
var BtnCellControls = module.exports = View.extend({
  tagName:   'button',
  className: 'btn btn-show-cell-controls',
  attributes: {
    type: 'button'
  },
  events: {
    'mousedown':  'onClick',
    'touchstart': 'onClick'
  }
});

/**
 * Render the view.
 *
 * @return {BtnCellControls)
 */
BtnCellControls.prototype.render = function () {
  this.el.innerHTML = '≡'; // U+2261
  return this;
};

/**
 * Trigger a `showControls` event when we click the button.
 *
 * @param  {Object} e
 */
BtnCellControls.prototype.onClick = function (e) {
  e.preventDefault();
  e.stopPropagation();
  e.cancelBubble = true; // IE
  this.trigger('showControls', this);
};
