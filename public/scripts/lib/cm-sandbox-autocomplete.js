var _            = require('underscore');
var Pos          = CodeMirror.Pos;
var keywords     = require('./keywords');
var correctToken = require('./cm-correct-token');

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

var completeVariable = function (cm, token, sandbox) {
  var vars = varsToObject(token.state.localVars, token.string);
  var prev = token.state.context;

  // Extend the variables object with each context level
  while (prev) {
    _.extend(vars, varsToObject(prev.vars));
    prev = prev.prev;
  }
  // Extend with every other variable and keyword
  _.extend(vars, varsToObject(token.state.globalVars, token.string));
  _.extend(vars, getPropertyNames(sandbox), keywords);

  return {
    context: sandbox,
    results: _.keys(vars).sort()
  };
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

var getPropertyObject = function (cm, token, sandbox) {
  var base    = sandbox;
  var context = getPropertyContext(cm, token);
  var tprop;

  while (base && (tprop = context.pop())) {
    switch (tprop.type) {
    case 'variable':
      base = sandbox[tprop.string];
      break;
    case 'property':
      base = base[tprop.string];
      break;
    case 'string':
      base = String.prototype;
      break;
    case 'number':
      base = Number.prototype;
      break;
    case 'string-2': // RegExp
      base = RegExp.prototype;
      break;
    case 'atom':
      if (tprop.string === 'true' || tprop.string === 'false') {
        base = Boolean.prototype;
      } else {
        base = null;
      }
      break;
    case 'immed':
      base = base['@return'];
      break;
    default:
      base = null;
      break;
    }
    // Functions are a special case. We have rudimentary introspection for the
    // DSL. However, if it's a constructor we can provide additional context
    // from the prototype.
    if (tprop.isFunction && typeof base === 'function') {
      if (tprop.isConstructor) {
        base = base.prototype;
      } else {
        // Look up the `@return` property that should provide completion data
        base = base['@return'];
      }
    }
  }

  // Add some extra completion data for primitive values
  switch (typeof base) {
  case 'string':
    base = String.prototype;
    break;
  case 'number':
    base = Number.prototype;
    break;
  case 'boolean':
    base = Boolean.prototype;
    break;
  }

  return base;
};

var completeProperty = function (cm, token, sandbox) {
  var obj = getPropertyObject(cm, token, sandbox);

  if (!_.isObject(obj)) {
    return { context: sandbox, results: [] };
  }

  return {
    context: obj,
    results: _.keys(getPropertyNames(obj)).sort()
  };
};

module.exports = function (cm, options) {
  var cur     = cm.getCursor();
  var token   = correctToken(cm, cur);
  var context = options.context || global;
  var results = [];
  var type    = token.type;
  var start   = token.start;
  var end     = token.end;

  var completion;
  switch (type) {
  case 'keyword':
  case 'variable':
    completion = completeVariable(cm, token, context);
    context    = completion.context;
    results    = completion.results;
    break;
  case 'property':
    completion = completeProperty(cm, token, context);
    context    = completion.context;
    results    = completion.results;
    break;
  }

  return {
    list:    results,
    token:   token,
    context: context,
    to:      new Pos(cur.line, end),
    from:    new Pos(cur.line, start)
  };
};
