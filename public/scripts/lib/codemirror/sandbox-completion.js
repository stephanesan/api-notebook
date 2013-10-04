var _            = require('underscore');
var Pos          = CodeMirror.Pos;
var async        = require('async');
var middleware   = require('../../state/middleware');
var getToken     = require('./get-token');
var correctToken = require('./correct-token');

/**
 * Verifies whether a given token is whitespace or not.
 *
 * @param  {Object}  token
 * @return {Boolean}
 */
var isWhitespaceToken = function (token) {
  return token.type === null && /^\s*$/.test(token.string);
};

/**
 * Returns the previous token in the editor, taking care to take into account
 * new lines.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @return {Object}
 */
var getPrevToken = function (cm, token) {
  // Get the last token of the previous line. If we are at the beginning of the
  // editor already, return `null`.
  if (token.pos.ch === 0) {
    if (token.pos.line > 0) {
      return getToken(cm, {
        ch:   Infinity,
        line: token.pos.line - 1
      });
    } else {
      return null;
    }
  }

  return getToken(cm, token.pos);
};

/**
 * Returns the current token position, removing potential whitespace tokens.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @return {Object}
 */
var eatSpace = function (cm, token) {
  while (token && isWhitespaceToken(token)) {
    token = getPrevToken(cm, token);
  }

  return token;
};

/**
 * Similar to `eatSpace`, but also takes moves the current token position.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @return {Object}
 */
var eatSpaceAndMove = function (cm, token) {
  // No token, break.
  if (!token) { return token; }

  return eatSpace(cm, getPrevToken(cm, token));
};

/**
 * Proxy the return objects for the property and variable middleware and turn
 * it into something actionable for the widget display.
 *
 * @param  {Function} done
 * @return {Function}
 */
var completeResults = function (done) {
  return function (err, data) {
    // Sorts the keys and maps to an object that the widget can understand.
    var results = _.map(_.keys(data.results), function (key) {
      if (!_.isObject(data.results[key])) {
        return {
          name:  key,
          value: key
        };
      }

      return {
        name:    key,
        value:   data.results[key].value,
        special: data.results[key].special
      };
    }).sort(function (a, b) {
      if (a.special && b.special) {
        return a.value > b.value ? 1 : -1;
      } else if (a.special) {
        return 1;
      } else if (b.special) {
        return -1;
      }

      return a.value > b.value ? 1 : -1;
    });

    return done(err, {
      context: data.context,
      results: results
    });
  };
};

/**
 * Complete variable completion suggestions.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @param  {Object}     options
 * @param  {Function}   done
 */
var completeVariable = function (cm, token, options, done) {
  // Trigger the completion middleware to run
  middleware.trigger('completion:variable', _.extend({
    token:   token,
    editor:  cm,
    results: {}
  }, options), completeResults(done));
};

/**
 * Resolves tokens properly before use.
 *
 * @param {CodeMirror} cm
 * @param {Array}      tokens
 * @param {Object}     options
 * @param {Function}   done
 */
var resolveTokens = function (cm, tokens, options, done) {
  async.map(tokens, function (token, cb) {
    // Dynamic property calculations are run inline before we resolve the whole
    // object.
    if (token.type === 'dynamic-property') {
      return getPropertyLookup(
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
 * Get the full property path to a property token.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @return {Array}
 */
var getPropertyPath = function (cm, token) {
  var context = [];

  /**
   * Mix in to with a token indicate an invalid/unexpected token.
   *
   * @type {Object}
   */
  var invalidToken = {
    type:   'invalid',
    string: null
  };

  /**
   * Eats the current token and any whitespace.
   *
   * @param  {Object} token
   * @return {Object}
   */
  var eatToken = function (token) {
    return eatSpaceAndMove(cm, token);
  };

  /**
   * Check whether the token can be resolved in the property recursion loop.
   *
   * @param  {Object}  token
   * @return {Boolean}
   */
  var canResolve = function (token) {
    return token.string === '.' || canAccess(token);
  };

  /**
   * Check whether the token is a possible access token (can read a value).
   *
   * @param  {Object}  token
   * @return {Boolean}
   */
  var canAccess = function (token) {
    if (!_.contains([null, 'keyword', 'invalid'], token.type)) {
      return true;
    }

    return token.type === null && _.contains([')', ']'], token.string);
  };

  /**
   * Resolves regular property notation.
   *
   * @param  {Object} token
   * @return {Object}
   */
  var resolveProperty = function (token) {
    // Resolve function/paren syntax.
    while (token.string === ')') {
      var level = 1;
      var prev  = token;

      // While still in parens *and not at the beginning of the editor*
      while (token && level > 0) {
        token = getPrevToken(cm, token);
        if (token.string === ')') {
          level++;
        } else if (token.string === '(') {
          level--;
        }
      }

      // No support for resolving across multiple lines.. yet.
      if (level > 0) {
        context.push(_.extend(token, invalidToken));
        return token;
      }

      token = eatToken(token);

      // Set `token` to be the token inside the parens and start working from
      // that instead.
      if (!token || (token.type === null && token.string !== ')')) {
        token = eatToken(prev);

        var subContext = getPropertyPath(cm, token);

        // The subcontext has a new keyword, but a function was not found, set
        // the last property to be a constructor and function
        if (subContext.hasNew) {
          if (token.type === 'variable' || token.type === 'property') {
            token.isFunction    = true;
            token.isConstructor = true;
          }
        }
      // Do a simple additional check to see if we are trying to use a type
      // surrounded by parens. E.g. `(123).toString()`.
      } else if (token.type === 'variable' || token.type === 'property') {
        token.isFunction = true;
      // This case is a little tricky to work with since a function could
      // return another function that is immediately invoked.
      } else if (token.string === ')') {
        context.push({
          start:  token.end,
          end:    token.end,
          string: '',
          state:  token.state,
          type:   'immed'
        });
      }
    }

    context.push(token);

    return eatToken(token);
  };

  /**
   * Resolves square bracket notation.
   *
   * @param  {Object} token
   * @return {Object}
   */
  var resolveDynamicProperty = function (token) {
    var level = 1;
    var prev  = token;

    while (token && level > 0) {
      token = getPrevToken(cm, token);
      if (token.string === ']') {
        level++;
      } else if (token.string === '[') {
        level--;
      }
    }

    // Keep track of the open token to confirm the location in the bracket
    // resolution.
    var startToken = token;
    token = eatToken(token);

    // Resolve the contents of the brackets as a text string.
    var string = cm.doc.getRange({
      ch:   startToken.start,
      line: startToken.pos.line
    }, {
      ch:   prev.end,
      line: prev.pos.line
    });

    // Only kick into bracket notation mode when the preceding token is a
    // property, variable, string, etc. Only things you can't use it on are
    // `undefined` and `null` (and syntax, of course).
    if (token && canAccess(token)) {
      prev = eatToken(prev);

      if (prev.string === '[') {
        context.push(_.extend(prev, invalidToken));
        return token;
      }

      var subContext = getPropertyPath(cm, prev);
      var startPos   = eatToken(subContext[subContext.length - 1]).start;

      // Ensures that the only tokens being resolved can be done statically.
      if (startPos === startToken.start) {
        context.push({
          start:  subContext[subContext.length - 1].start,
          end:    subContext[0].end,
          string: string,
          tokens: subContext,
          state:  prev.state,
          type:   'dynamic-property'
        });
      } else {
        context.push(_.extend(token, invalidToken));
        return token;
      }
    } else if (!token || token.type === null) {
      context.push({
        start:  startToken.start,
        end:    prev.end,
        string: string,
        state:  prev.state,
        type:   'array'
      });
    }

    return token;
  };

  while (token && canResolve(token)) {
    // Skip over period notation.
    if (token.string === '.') {
      token = eatToken(token);
    }

    if (token.string === ']') {
      token = resolveDynamicProperty(token);
    } else {
      token = resolveProperty(token);
    }
  }

  // Using the new keyword doesn't actually require parens to invoke, so we need
  // to do a quick special case check here.
  if (token && token.type === 'keyword' && token.string === 'new') {
    context.hasNew = true;
    // Try to set a function to be a constructor function
    _.some(context, function (token) {
      if (!token.isFunction) { return; }
      // Remove the `hasNew` flag and set the function to be a constructor
      delete context.hasNew;
      return token.isConstructor = true;
    });
  }

  return context;
};

/**
 * Collects information about the current token context by traversing through
 * the CodeMirror editor. Currently it's pretty simplistic and only works over
 * a single line.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @return {Array}
 */
var getPropertyContext = function (cm, token) {
  if (token.type !== 'property') {
    return [];
  }

  token = eatSpaceAndMove(cm, token);

  if (token.type !== null || token.string !== '.') {
    return [];
  }

  return getPropertyPath(cm, eatSpaceAndMove(cm, token));
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
  middleware.trigger('completion:context', _.extend({
    token:   tokens.pop(),
    editor:  cm
  }, options), function again (err, data) {
    var token = data.token;

    // Break the context lookup.
    if (err) { return done(err, null); }

    if (token && (token.isFunction || token.type === 'immed')) {
      // Check that the property is also a function, otherwise we should
      // skip it and leave it up to the user to work out.
      if (!_.isFunction(data.context)) {
        data.token   = null;
        data.context = null;
        return again(err, data);
      }

      return middleware.trigger('completion:function', _.extend({
        fn:        data.context,
        name:      token.string,
        editor:    cm,
        construct: !!token.isConstructor
      }, options), function (err, context) {
        data.token   = tokens.pop();
        data.context = context;

        // Immediately invoked functions should skip the context processing
        // step. It's also possible that this token was the last to process.
        if (data.token && data.token.type !== 'immed') {
          return middleware.trigger('completion:context', data, again);
        }

        return again(err, data);
      });
    }

    if (tokens.length && data.context != null) {
      data.token = tokens.pop();
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
var getPropertyLookup = function (cm, tokens, options, done) {
  var invalid = _.some(tokens, function (token) {
    return token.type === 'invalid';
  });

  // If any invalid tokens exist, fail completion.
  if (invalid) { return done(new Error('Completion is not possible')); }

  // No tokens exist, which means we are doing a lookup at the global level.
  if (!tokens.length) { return done(null, options.global); }

  // Run the property lookup functionality.
  resolveTokens(cm, tokens, options, function (err, tokens) {
    if (err) { return done(err); }

    return doPropertyLookup(cm, tokens, options, done);
  });
};
/* jshint +W003 */

/**
 * Gets the property context for completing a property by looping through each
 * of the context tokens. Provides some additional help by moving primitives to
 * their prototype objects so it can continue autocompletion.
 *
 * @param {CodeMirror} cm
 * @param {Object}     token
 * @param {Object}     options
 * @param {Function}   done
 */
var getPropertyObject = function (cm, token, options, done) {
  return getPropertyLookup(cm, getPropertyContext(cm, token), options, done);
};

/**
 * Provides completion suggestions for a property.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @param  {Object}     context
 * @param  {Function}   done
 */
var completeProperty = function (cm, token, context, done) {
  getPropertyObject(cm, token, context, function (err, context) {
    middleware.trigger('completion:property', {
      token:   token,
      editor:  cm,
      context: context,
      results: {}
    }, completeResults(done));
  });
};

/**
 * Provides completion suggestions for function arguments.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @param  {Object}     context
 * @param  {Function}   done
 */
var completeArguments = function (cm, token, options, done) {
  var tokens = getPropertyPath(cm, eatSpaceAndMove(cm, token));

  resolveTokens(cm, tokens, options, function (err, tokens) {
    if (err || !tokens.length) {
      return done(err);
    }

    var lastToken = tokens.shift();

    if (lastToken.type !== 'property' && lastToken.type !== 'variable') {
      return done();
    }

    getPropertyLookup(cm, tokens, options, function (err, context) {
      if (err || !_.isFunction(context[lastToken.string])) {
        return done(err);
      }

      middleware.trigger('completion:arguments', _.extend({
        fn:     context[lastToken.string],
        editor: cm
      }, options, {
        context: context
      }), function (err, args) {
        // No arguments provided.
        if (!args.length) {
          return done();
        }

        // Sanitize the arguments for rendering as a result.
        return done(null, {
          results: [{
            display: 'Arguments',
            value:   args.join(', ') + ')',
            special: true
          }],
          context: context
        });
      });
    });
  });
};

/**
 * Trigger the completion module by passing in the current codemirror instance.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     options
 * @param  {Function}   done
 */
module.exports = function (cm, options, done) {
  var cur     = cm.getCursor();
  var token   = correctToken(cm, cur);
  var results = [];
  var type    = token.type;

  var cb = function (err, completion) {
    completion = completion || {};

    return done(err, {
      token:   token,
      context: completion.context,
      results: completion.results,
      to:      new Pos(cur.line, token.end),
      from:    new Pos(cur.line, token.start)
    });
  };

  if (type === null && token.string === '(') {
    return completeArguments(cm, token, options, cb);
  }

  if (type === 'keyword' || type === 'variable') {
    return completeVariable(cm, token, options, cb);
  }

  if (type === 'property') {
    return completeProperty(cm, token, options, cb);
  }

  return done();
};
