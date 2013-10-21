var Cell = require('./cell');

/**
 * A model used to represent a text cell in the notebook collection.
 *
 * @type {Function}
 */
module.exports = Cell.extend({
  defaults: {
    type: 'text',
    value: ''
  }
});
