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
 * @param  {CodeMirror.Pos} cur
 * @return {Object}
 */
var getToken = function (cm, cur) {
  return cm.getTokenAt(cur);
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
 * Checks whether the tokens can be statically resolved accurately.
 *
 * @param  {Array}   tokens
 * @return {Boolean}
 */
var allowResolve = function (tokens) {
  return _.every(tokens, function (token) {
    return !token.isFunction;
  });
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
  // Since JavaScript allows any number of spaces between properties and
  // parens, we will need to eat the additional spaces.
  var eatSpace = function (token) {
    if (token.type === null && /^ +$/.test(token.string)) {
      return getToken(cm, new Pos(cur.line, token.start));
    }

    return token;
  };

  // Like `eatSpace`, but also moves to the previous token at the same time.
  var eatSpaceAndMove = function (token) {
    return eatSpace(getToken(cm, new Pos(cur.line, token.start)));
  };

  var cur     = cm.getCursor();
  var tprop   = eatSpace(token);
  var context = [];
  var level, prev, subContext;

  while (tprop.type === 'property') {
    tprop = eatSpaceAndMove(tprop);
    if (tprop.string !== '.') { return []; }
    tprop = eatSpaceAndMove(tprop);

    while (tprop.string === ']') {
      level = 1;
      prev  = tprop;

      do {
        tprop = getToken(cm, new Pos(cur.line, tprop.start));
        if (tprop.string === ']') {
          level++;
        } else if (tprop.string === '[') {
          level--;
        }
      } while (level > 0 && tprop.start > 0);

      // Keep track of the open token to confirm the location in the bracket
      // resolution.
      var startToken = tprop;
      tprop = eatSpaceAndMove(tprop);

      // Only kick into bracket notation mode when the preceding token is a
      // property, variable, string, etc. Only things you can't use it on are
      // `undefined` and `null` (and syntax, of course).
      if (tprop.type !== null && tprop.type !== 'atom') {
        prev       = eatSpaceAndMove(prev);
        subContext = getPropertyContext(cm, prev);
        subContext.unshift(prev);

        var startPos = eatSpaceAndMove(subContext[subContext.length - 1]).start;

        // Ensures that the only tokens being resolved can be done statically.
        if (startPos === startToken.start && allowResolve(subContext)) {
          context.push({
            start:  subContext[subContext.length - 1].start,
            end:    subContext[0].end,
            tokens: subContext,
            state:  prev.state,
            type:   'dynamic-property'
          });
        } else {
          return [];
        }
      }
    }

    while (tprop.string === ')') {
      level = 1;
      prev  = tprop; // Keep track in case this isn't a function after all

      do {
        tprop = getToken(cm, new Pos(cur.line, tprop.start));
        if (tprop.string === ')') {
          level++;
        } else if (tprop.string === '(') {
          level--;
        }
      // While still in parens *and not at the beginning of the line*
      } while (level > 0 && tprop.start > 0);

      tprop = eatSpaceAndMove(tprop);
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
      // that instead. If the last token is a space though, we need to move
      // back a little further.
      } else {
        tprop      = eatSpaceAndMove(prev);
        subContext = getPropertyContext(cm, tprop);
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
  }

  // Using the new keyword doesn't actually require parens to invoke, so we need
  // to do a quick special case check here
  if (tprop.type === 'variable') {
    prev = eatSpaceAndMove(tprop);

    // Sets whether the variable is actually a constructor function
    if (prev.type === 'keyword' && prev.string === 'new') {
      context.hasNew = true;
      // Try to set a function to be a constructor function
      _.some(context, function (tprop) {
        if (!tprop.isFunction) { return; }
        // Remove the `hasNew` flag and set the function to be a constructor
        delete context.hasNew;
        return tprop.isConstructor = true;
      });
    }
  }

  return context;
};

/**
 * Gets the property context for completing a property by looping through each
 * of the context tokens. Provides some additional help by moving primitives to
 * their prototype objects so it can continue autocompletion.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     token
 * @param  {Object}     context
 * @param  {Function}   done
 */
var getPropertyObject = function (cm, token, context, done) {
  // Resolve all dynamic properties first.
  var tokens = async.map(getPropertyContext(cm, token), function (token, cb) {
    // Dynamic property calculations are run inline before we resolve the whole
    // object.
    if (token.type === 'dynamic-property') {
      var line  = cm.getCursor().line;
      var tprop = getToken(cm, new Pos(line, token.end));

      // Properties and variables need to be resolved using the property lookup
      // algorithm.
      if (tprop.type === 'property' || tprop.type === 'variable') {
        return getPropertyObject(cm, tprop, context, function (err, context) {
          var string;

          try {
            string = '' + context[tprop.string];
          } catch (e) {
            return cb(new Error('Resolution impossible'));
          }

          // Returns a valid token for the rest of the resolution.
          return cb(err, _.extend(token, {
            type:   'property',
            string: string
          }));
        });
      }

      if (tprop.type === 'string') {
        token.string = tprop.string.slice(1, -1);
      } else {
        token.string = tprop.string;
      }

      return cb(null, _.extend(token, {
        type: 'property'
      }));
    }

    return cb(null, token);
  }, function (err, tokens) {
    // Resolution is not possible.
    if (err) {
      return done(null, null);
    }

    // No tokens exist, which means we are doing a lookup at the global level.
    if (!tokens.length) {
      return done(null, context);
    }

    middleware.trigger('completion:context', {
      token:   tokens.pop(),
      editor:  cm,
      global:  context,
      context: context
    }, function again (err, data) {
      if (err) {
        return done(err, data.context);
      }

      // Do some post processing work to correct primitive type references.
      if (typeof data.context === 'string') {
        data.context = String.prototype;
      } else if (typeof data.context === 'number') {
        data.context = Number.prototype;
      } else if (typeof data.context === 'boolean') {
        data.context = Boolean.prototype;
      }

      var token = data.token;

      if (token && (token.isFunction || token.type === 'immed')) {
        // Check that the property is also a function, otherwise we should
        // skip it and leave it up to the user to work out.
        if (!_.isFunction(data.context)) {
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

      if (_.isObject(data.context) && tokens.length) {
        data.token = tokens.pop();
        return middleware.trigger('completion:context', data, again);
      }

      return done(null, data.context);
    });
  });
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
  var cur       = cm.getCursor();
  var prevToken = getToken(cm, new Pos(cur.line, token.start));

  if (isWhitespaceToken(prevToken)) {
    prevToken = getToken(cm, new Pos(cur.line, prevToken.start));
  }

  getPropertyObject(cm, prevToken, context, function (err, context) {
    if (!context || !_.isFunction(context[prevToken.string])) {
      return done();
    }

    middleware.trigger('completion:arguments', {
      fn:     context[prevToken.string],
      name:   prevToken.string,
      editor: cm
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
