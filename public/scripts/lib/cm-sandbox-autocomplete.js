var _            = require('underscore');
var Pos          = CodeMirror.Pos;
var keywords     = require('./keywords');
var middleware   = require('./middleware');
var correctToken = require('./cm-correct-token');

// Require the autocompletion plugin to add additional functionality
require('../plugins/autocomplete')(middleware);

var varsToObject = function (scope, ignore) {
  var obj = {};

  while (scope) {
    // The scope variable could be the same token we are currently typing
    if (typeof scope.name === 'string' && scope.name !== ignore) {
      obj[scope.name] = true;
    }
    scope = scope.next;
  }

  return obj;
};

var isWhitespaceToken = function (token) {
  return token.type === null && /^\s*$/.test(token.string);
};

var getToken = function (cm, cur) {
  return cm.getTokenAt(cur);
};

var isValidVariableName = function (name) {
  return (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/).test(name);
};

var getPropertyNames = function (obj) {
  var props = {};
  var addProp;

  addProp = function (property) {
    // Avoid any property that is not a valid JavaScript literal variable,
    // since the autocompletion result wouldn't be valid JavaScript
    if (isValidVariableName(property)) { props[property] = true; }
  };

  do {
    _.each(Object.getOwnPropertyNames(obj), addProp);
  } while (obj = Object.getPrototypeOf(obj));

  return props;
};

var completeVariable = function (cm, token, context, done) {
  // Grab the variables based on the token state.
  middleware.use('completion:variable', function (data, next) {
    _.extend(data.results, varsToObject(token.state.localVars, token.string));

    // Extend the variables object with each context level
    var prev = token.state.context;
    while (prev) {
      _.extend(data.results, varsToObject(prev.vars));
      prev = prev.prev;
    }

    next();
  });

  // Grab all the variables from the context and add in keywords
  middleware.use('completion:variable', function (data, next) {
    _.extend(data.results, varsToObject(token.state.globalVars, token.string));
    _.extend(data.results, getPropertyNames(context), keywords);
    next();
  });

  // Trigger the autocompletion middleware to run
  middleware.trigger('completion:variable', {
    token:   token,
    editor:  cm,
    context: context,
    results: {}
  }, function (err, data) {
    middleware.stack['completion:variable'].splice(-2);

    return done(err, {
      context: data.context,
      results: _.keys(data.results).sort()
    });
  });
};

var getPropertyContext = function (cm, token) {
  var cur     = cm.getCursor();
  var tprop   = token;
  var context = [];
  var level, prev, subContext, eatSpace;

  // Since JavaScript allows any number of spaces between properties and parens,
  // we will need to eat the additional spaces.
  eatSpace = function () {
    var token = getToken(cm, new Pos(cur.line, tprop.start));

    if (token.type === null && /[ ]+/.test(token.string)) {
      token = getToken(cm, new Pos(cur.line, token.start));
    }

    return token;
  };

  while (tprop.type === 'property') {
    tprop = eatSpace(tprop);
    if (tprop.string !== '.') { return []; }
    tprop = eatSpace(tprop);

    while (tprop.string === ')') {
      level = 1;
      prev  = tprop; // Keep track in case this isn't a function after all
      do {
        tprop = getToken(cm, new Pos(cur.line, tprop.start));
        switch (tprop.string) {
        case ')':
          level++;
          break;
        case '(':
          level--;
          break;
        }
      // While still in parens *and not at the beginning of the line*
      } while (level > 0 && tprop.start);

      tprop = eatSpace(tprop);
      // Do a simple additional check to see if we are trying to use a type
      // surrounded by parens. E.g. `(123).toString()`.
      if (tprop.type === 'variable' || tprop.type === 'property') {
        tprop.isFunction = true;
      // This case is a little tricky to work with since a function could
      // return another function that is immediately invoked.
      } else if (tprop.string === ')') {
        context.push({
          start: tprop.end,
          end: tprop.end,
          string: '',
          state: tprop.state,
          type: 'immed'
        });
      // Set `tprop` to be the token inside the parens and start working from
      // that instead. If the last token is a space though, we need to move
      // back a little further.
      } else {
        tprop = getToken(cm, new Pos(cur.line, prev.start));
        if (isWhitespaceToken(tprop)) {
          tprop = getToken(cm, new Pos(cur.line, tprop.start));
        }
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
    prev = eatSpace(tprop);

    // Sets whether the variable is actually a constructor function
    if (prev.type === 'keyword' && prev.string === 'new') {
      context.hasNew = true;
      // Try to set a function to be a constructor function
      _.some(context, function (tprop) {
        if (!tprop.isFunction) { return; }
        // Remove the `hasNew` flag and set the function to be a constructor
        delete context.hasNew;
        return (tprop.isConstructor = true);
      });
    }
  }

  return context;
};

var getPropertyObject = function (cm, token, context, done) {
  var base   = context;
  var tokens = getPropertyContext(cm, token);

  middleware.use('completion:context', function (data, next) {
    var token  = data.token;
    var type   = token.type;
    var string = token.string;

    if (type === 'variable' || type === 'property') {
      var context = data[type === 'variable' ? 'global' : 'context'];
      // Lookup the property on the current context
      data.context = context[string];
      // If the variable/property is a constructor function, we can provide
      // some additional context by looking at the `prototype` property.
      if (token.isFunction && token.isConstructor) {
        if (typeof data.context === 'function') {
          data.context = data.context.prototype;
        }
      }
      return next();
    }

    if (type === 'string') {
      data.context = String.prototype;
      return next();
    }

    if (type === 'number') {
      data.context = Number.prototype;
      return next();
    }

    if (type === 'string-2') {
      data.context = RegExp.prototype;
      return next();
    }

    if (type === 'atom' && (string === 'true' || string === 'false')) {
      data.context = Boolean.prototype;
      return next();
    }

    data.context = null;
    return next();
  });

  middleware.trigger('completion:context', {
    token:   tokens.pop(),
    editor:  cm,
    global:  context,
    context: context
  }, function again (err, data) {
    if (!err) {
      // Do some post processing work to correct primitive types
      if (typeof data.context === 'string') {
        data.context = String.prototype;
      } else if (typeof data.context === 'number') {
        data.context = Number.prototype;
      } else if (typeof data.context === 'boolean') {
        data.context = Boolean.prototype;
      }

      if (data.context && tokens.length) {
        data.token = tokens.pop();
        return middleware.trigger('completion:context', data, again);
      }
    }

    middleware.stack['completion:context'].pop();

    return done(err, data.context);
  });
};

var completeProperty = function (cm, token, context, done) {
  getPropertyObject(cm, token, context, function (err, context) {
    if (!_.isObject(context)) {
      return done({
        context: context,
        results: []
      });
    }

    middleware.use('completion:property', function (data, next) {
      _.extend(data.results, getPropertyNames(data.context));
      return next();
    });

    middleware.trigger('completion:property', {
      token:   token,
      editor:  cm,
      context: context,
      results: {}
    }, function (err, data) {
      middleware.stack['completion:property'].pop();

      return done(err, {
        context: data.context,
        results: _.keys(data.results).sort()
      });
    });
  });
};

module.exports = function (cm, options, done) {
  var cur     = cm.getCursor();
  var token   = correctToken(cm, cur);
  var context = options.context || global;
  var results = [];
  var type    = token.type;

  var cb = function (err, completion) {
    return done(err, {
      list:    completion.results,
      token:   token,
      context: completion.context,
      to:      new Pos(cur.line, token.end),
      from:    new Pos(cur.line, token.start)
    });
  };

  if (type === 'keyword' || type === 'variable') {
    return completeVariable(cm, token, context, cb);
  }

  if (type === 'property') {
    return completeProperty(cm, token, context, cb);
  }

  done();
};
