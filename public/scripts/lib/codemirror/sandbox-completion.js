var _            = require('underscore');
var Pos          = CodeMirror.Pos;
var async        = require('async');
var middleware   = require('../../state/middleware');
var correctToken = require('./correct-token');

/**
 * Verifies whether a given token is whitespace or not.
 *
 * @param  {Object}  token
 * @return {Boolean}
 */
var isWhitespaceToken = function (token) {
  return token.type === null && /^ *$/.test(token.string);
};

/**
 * Returns the token at a given position.
 *
 * @param  {CodeMirror}     cm
 * @param  {CodeMirror.Pos} pos
 * @return {Object}
 */
var getToken = function (cm, pos) {
  return cm.getTokenAt(pos);
};

/**
 * Returns the current token, taking into account if the current token is
 * whitespace.
 *
 * @param  {Object} token
 * @return {Object}
 */
var eatSpace = function (cm, line, token) {
  if (isWhitespaceToken(token)) {
    return getToken(cm, new Pos(line, token.start));
  }

  return token;
};

/**
 * Similar to `eatSpace`, but also takes moves the current token.
 *
 * @param  {Object} token
 * @return {Object}
 */
var eatSpaceAndMove = function (cm, line, token) {
  return eatSpace(cm, line, getToken(cm, new Pos(line, token.start)));
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
 * @param  {Object}     context
 * @param  {Function}   done
 */
var completeVariable = function (cm, token, context, done) {
  // Trigger the completion middleware to run
  middleware.trigger('completion:variable', {
    token:   token,
    editor:  cm,
    context: context,
    results: {}
  }, completeResults(done));
};

/**
 * Get the full property path to a property token.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @return {Array}
 */
var getPropertyPath = function (cm, token) {
  var line    = cm.getCursor().line;
  var tprop   = token;
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
   * Eats the current token and whitespace.
   *
   * @param  {Object} token
   * @return {Object}
   */
  var eatToken = function (token) {
    return eatSpaceAndMove(cm, line, token);
  };

  /**
   * Check whether the token can be resolved in the property recursion loop.
   *
   * @param  {Object}  tprop
   * @return {Boolean}
   */
  var canResolve = function (tprop) {
    return tprop.string === '.' || canAccess(tprop);
  };

  /**
   * Check whether the token is a possible access token (can read a value).
   *
   * @param  {Object}  tprop
   * @return {Boolean}
   */
  var canAccess = function (tprop) {
    if (!_.contains([null, 'keyword', 'invalid'], tprop.type)) {
      return true;
    }

    return tprop.type === null && _.contains([')', ']'], tprop.string);
  };

  /**
   * Resolves regular property notation.
   *
   * @param  {Object} tprop
   * @return {Object}
   */
  var resolveProperty = function (tprop) {
    // Resolve function/paren syntax.
    while (tprop.string === ')') {
      var level = 1;
      var prev  = tprop;

      do {
        tprop = getToken(cm, new Pos(line, tprop.start));
        if (tprop.string === ')') {
          level++;
        } else if (tprop.string === '(') {
          level--;
        }
      // While still in parens *and not at the beginning of the line*
      } while (level > 0 && tprop.start > 0);

      // No support for resolving across multiple lines.. yet.
      if (level > 0) {
        context.push(_.extend(tprop, invalidToken));
        return tprop;
      }

      tprop = eatToken(tprop);

      // Do a simple additional check to see if we are trying to use a type
      // surrounded by parens. E.g. `(123).toString()`.
      if (tprop.type === 'variable' || tprop.type === 'property') {
        tprop.isFunction = true;
      // This case is a little tricky to work with since a function could
      // return another function that is immediately invoked.
      } else if (tprop.string === ')') {
        context.push({
          start:  tprop.end,
          end:    tprop.end,
          string: '',
          state:  tprop.state,
          type:   'immed'
        });
      // Set `tprop` to be the token inside the parens and start working from
      // that instead.
      } else {
        tprop = eatToken(prev);

        var subContext = getPropertyPath(cm, tprop);

        // The subcontext has a new keyword, but a function was not found, set
        // the last property to be a constructor and function
        if (subContext.hasNew) {
          if (tprop.type === 'variable' || tprop.type === 'property') {
            tprop.isFunction    = true;
            tprop.isConstructor = true;
          }
        }
      }
    }

    context.push(tprop);

    return eatToken(tprop);
  };

  /**
   * Resolves square bracket notation.
   *
   * @param  {Object} tprop
   * @return {Object}
   */
  var resolveDynamicProperty = function (tprop) {
    var level = 1;
    var prev  = tprop;

    do {
      tprop = getToken(cm, new Pos(line, tprop.start));
      if (tprop.string === ']') {
        level++;
      } else if (tprop.string === '[') {
        level--;
      }
    } while (level > 0 && tprop.start > 0);

    // Keep track of the open token to confirm the location in the bracket
    // resolution.
    var startToken = tprop;
    tprop = eatToken(tprop);

    // Resolve the contents of the brackets as a text string.
    var string = cm.doc.getRange({
      ch:   startToken.start,
      line: line
    }, {
      ch:   prev.end,
      line: line
    });

    // Only kick into bracket notation mode when the preceding token is a
    // property, variable, string, etc. Only things you can't use it on are
    // `undefined` and `null` (and syntax, of course).
    if (canAccess(tprop)) {
      prev = eatToken(prev);

      if (prev.string === '[') {
        return _.extend(prev, invalidToken);
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
        return _.extend(tprop, invalidToken);
      }
    } else if (tprop.type === null && tprop.string !== '.') {
      context.push({
        start:  startToken.start,
        end:    prev.end,
        string: string,
        state:  prev.state,
        type:   'array'
      });
    }

    return tprop;
  };

  while (canResolve(tprop)) {
    // Skip over period notation.
    if (tprop.string === '.') {
      tprop = eatToken(tprop);
    }

    if (tprop.string === ']') {
      tprop = resolveDynamicProperty(tprop);
    } else {
      tprop = resolveProperty(tprop);
    }
  }

  // Using the new keyword doesn't actually require parens to invoke, so we need
  // to do a quick special case check here.
  if (tprop.type === 'keyword' && tprop.string === 'new') {
    context.hasNew = true;
    // Try to set a function to be a constructor function
    _.some(context, function (tprop) {
      if (!tprop.isFunction) { return; }
      // Remove the `hasNew` flag and set the function to be a constructor
      delete context.hasNew;
      return tprop.isConstructor = true;
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

  var line  = cm.getCursor().line;
  var tprop = eatSpaceAndMove(cm, line, token);

  if (tprop.type !== null || tprop.string !== '.') {
    return [];
  }

  return getPropertyPath(cm, eatSpaceAndMove(cm, line, tprop));
};

/**
 * Resolve the property lookup tokens.
 *
 * @param {CodeMirror} cm
 * @param {Object}     token
 * @param {Object}     context
 * @param {Function}   done
 */
var getPropertyLookup = function (cm, tokens, context, done) {
  var invalid = _.some(tokens, function (token) {
    return token.type === 'invalid';
  });

  if (invalid) {
    return done(new Error('Completion is not possible'));
  }

  // Resolve dynamic and invalid properties first.
  async.map(tokens, function (token, cb) {
    // Dynamic property calculations are run inline before we resolve the whole
    // object.
    if (token.type === 'dynamic-property') {
      return getPropertyLookup(
        cm,
        token.tokens,
        context,
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
  }, function (err, tokens) {
    // Resolution is not possible.
    if (err) { return done(err); }

    // No tokens exist, which means we are doing a lookup at the global level.
    if (!tokens.length) { return done(null, context); }

    middleware.trigger('completion:context', {
      token:   tokens.pop(),
      editor:  cm,
      global:  context,
      context: context
    }, function again (err, data) {
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

        return middleware.trigger('completion:function', {
          fn:        data.context,
          name:      token.string,
          editor:    cm,
          construct: !!token.isConstructor,
          context:   context
        }, function (err, context) {
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
  });
};

/**
 * Gets the property context for completing a property by looping through each
 * of the context tokens. Provides some additional help by moving primitives to
 * their prototype objects so it can continue autocompletion.
 *
 * @param {CodeMirror} cm
 * @param {Object}     token
 * @param {Object}     context
 * @param {Function}   done
 */
var getPropertyObject = function (cm, token, context, done) {
  return getPropertyLookup(cm, getPropertyContext(cm, token), context, done);
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

var completeArguments = function (cm, token, context, done) {
  var line      = cm.getCursor().line;
  var prevToken = eatSpaceAndMove(cm, line, token);

  getPropertyObject(cm, prevToken, context, function (err, context) {
    if (!context || !_.isFunction(context[prevToken.string])) {
      return done();
    }

    middleware.trigger('completion:arguments', {
      fn:      context[prevToken.string],
      name:    prevToken.string,
      editor:  cm,
      context: context
    }, function (err, args) {
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
  var context = options.context || global;
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
    return completeArguments(cm, token, context, cb);
  }

  if (type === 'keyword' || type === 'variable') {
    return completeVariable(cm, token, context, cb);
  }

  if (type === 'property') {
    return completeProperty(cm, token, context, cb);
  }

  return done();
};
