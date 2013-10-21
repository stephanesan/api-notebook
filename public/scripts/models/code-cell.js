var Cell = require('./cell');

/**
 * A code cell instance used to represent code in the notebook collection.
 *
 * @type {Function}
 */
module.exports = Cell.extend({
  defaults: {
    type: 'code',
    value: ''
  }
});
