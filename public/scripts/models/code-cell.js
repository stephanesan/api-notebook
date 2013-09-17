var Cell = require('./cell');

/**
 * A code cell instance used to represent code in the notebook collection.
 *
 * @type {Function}
 */
var CodeCell = module.exports = Cell.extend({
  defaults: {
    type: 'code',
    value: ''
  }
});
