var _            = require('underscore');
var getToken     = require('./get-token');
var middleware   = require('../../state/middleware');
var tokenHelpers = require('./token-helpers');

/**
 * Collect data for displaying a tooltip. Passes an falsy value to the callback
 * to represent no data available to display.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     options
 * @param  {Function}   done
 */
module.exports = function (cm, options, done) {
  // Don't show the tooltip when we have have data selected.
  if (cm.doc.somethingSelected()) {
    return done();
  }

  var cur      = cm.getCursor();
  var bracket  = tokenHelpers.getPrevBracket(cm, getToken(cm, cur));
  var previous = bracket && tokenHelpers.eatEmptyAndMove(cm, bracket);

  if (!previous) {
    return done();
  }

  return tokenHelpers.getProperty(cm, previous, options, function (err, data) {
    if (err || !_.isFunction(data.context)) {
      return done(err);
    }

    // When the context is a function, retrieve the relevant documentation.
    middleware.trigger('completion:describe', data, function (err, describe) {
      return done(err, _.extend(data, {
        description: describe,
        to:          cur,
        token:       bracket,
        from:        bracket.pos
      }));
    }, true);
  });
};
