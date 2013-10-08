var _            = require('underscore');
var getToken     = require('./get-token');
var middleware   = require('../../state/middleware');
var tokenHelpers = require('./token-helpers');

/**
 * Returns the closest previous opening bracket token to the passed in token.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @return {Object}
 */
var getPrevBracket = function (cm, token) {
  do {
    // Break the loop if we have found a bracket token.
    if (token.type === null && token.string === '(') {
      return token;
    }
  } while (token = tokenHelpers.getPrevToken(cm, token));

  return token;
};

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

  var cur     = cm.getCursor();
  var bracket = getPrevBracket(cm, getToken(cm, cur));
  var before  = bracket && tokenHelpers.eatSpaceAndMove(cm, bracket);

  // No token before the bracket can be found.
  if (!before) {
    return done();
  }

  return tokenHelpers.getProperty(cm, before, options, function (err, data) {
    if (err) { return done(err); }

    // If the context is a function, let's get the data available for the
    // tooltip and return it.
    if (_.isFunction(data.context)) {
      middleware.trigger('completion:describe', data, function (err, describe) {
        console.log(err, describe);
      });
    }
  });
};
