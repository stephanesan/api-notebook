var Cell = require('./cell');

/**
 * A model used to represent a text cell in the notebook collection.
 *
 * @type {Function}
 */
var TextCell = module.exports = Cell.extend({
  defaults: {
    type: 'text',
    value: ''
  }
});
