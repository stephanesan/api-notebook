var _          = require('underscore');
var async      = require('async');
var middleware = require('../../../state/middleware');

/**
 * Resolves tokens properly before use.
 *
 * @param {CodeMirror} cm
 * @param {Array}      tokens
 * @param {Object}     options
 * @param {Function}   done
 */
exports.resolveTokens = function (cm, tokens, options, done) {
  async.map(tokens, function (token, cb) {
    // Dynamic property calculations are run inline before we resolve the whole
    // object.
    if (token.type === 'dynamic-property') {
      return exports.propertyLookup(
        cm,
        token.tokens,
        options,
        function (err, context) {
          if (err) {  return cb(err); }

          var string;

          try {
            string = '' + context;
          } catch (e) {
            return cb(new Error('Property resolution is impossible'));
          }

          // Remove the tokens lookup array.
          delete token.tokens;

          // Returns a valid token for the rest of the resolution.
          return cb(err, _.extend(token, {
            type:   'property',
            string: string
          }));
        }
      );
    }

    return cb(null, token);
  }, done);
};

/**
 * Run property lookup middleware. *Please note: This assumes resolved tokens.*
 *
 * @param {CodeMirror} cm
 * @param {Array}      tokens
 * @param {Object}     options
 * @param {Function}   done
 */
var doPropertyLookup = function (cm, tokens, options, done) {
  var prevContext = options.context;

  middleware.trigger('completion:context', _.extend({
    token:   tokens.pop(),
    editor:  cm
  }, options), function again (err, data) {
    var token = data.token;

    // Break the context lookup.
    if (err) { return done(err, null); }

    // Update the parent context property.
    data.parent = prevContext;

    // Function context lookups occur after the property lookup.
    if (token && token.isFunction) {
      // Check that the property is also a function, otherwise we should
      // skip it and leave it up to the user to work out.
      if (!_.isFunction(data.context)) {
        data.token   = null;
        data.context = null;
        return again(err, data);
      }

      return middleware.trigger('completion:function', _.extend({
        name:          token.string,
        isConstructor: !!token.isConstructor
      }, data), function (err, context) {
        data.token   = tokens.pop();
        data.context = prevContext = context;

        // Immediately invoked functions should skip the context processing
        // step. It's also possible that this token was the last to process.
        if (data.token && data.token.type !== 'immed') {
          return middleware.trigger('completion:context', data, again);
        }

        return again(err, data);
      });
    }

    if (tokens.length && data.context != null) {
      data.token  = tokens.pop();
      prevContext = data.context;
      return middleware.trigger('completion:context', data, again);
    }

    return done(null, data.context);
  });
};

/**
 * Resolve the property lookup tokens.
 *
 * @param {CodeMirror} cm
 * @param {Array}      tokens
 * @param {Object}     options
 * @param {Function}   done
 */

// Property lookup is used within the token resolution function. This option is
// set to stop JSHint nagging me about it.

/* jshint -W003 */
exports.propertyLookup = function (cm, tokens, options, done) {
  var invalid = _.some(tokens, function (token) {
    return token.type === 'invalid';
  });

  // If any invalid tokens exist, fail completion.
  if (invalid) { return done(new Error('Completion is not possible')); }

  // No tokens exist, which means we are doing a lookup at the global level.
  if (!tokens.length) { return done(null, options.global); }

  // Run the property lookup functionality.
  exports.resolveTokens(cm, tokens, options, function (err, tokens) {
    if (err) { return done(err); }

    return doPropertyLookup(cm, tokens, options, done);
  });
};
/* jshint +W003 */
