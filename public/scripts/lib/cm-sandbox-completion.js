var _ = require('underscore');

var Pos = CodeMirror.Pos;

// Reserved word list (http://mdn.io/reserved)
var keywords = _.object(('break case catch continue debugger default delete ' +
               'do else false finally for function if in instanceof new null ' +
               'return switch throw true try typeof var void while ' +
               'with').split(' '), true);

var varsToObject = function (scope) {
  var obj = {};

  while (scope) {
    if (typeof scope.name === 'string') { obj[scope.name] = true; }
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

var shouldDisplay = function (string) {
  return string.indexOf(this.string) === 0;
};

var getPropertyNames = function (obj) {
  var props = {};
  var addProp;

  addProp = function (prop) {
    props[prop] = true;
  };

  do {
    _.each(Object.getOwnPropertyNames(obj), addProp);
  } while (obj = Object.getPrototypeOf(obj));

  return props;
};

var completeVariable = function (cm, token, sandbox) {
  var vars = varsToObject(token.state.localVars);
  var prev = token.state.context;
  // Extend the variables object with each context level
  while (prev) {
    _.extend(vars, varsToObject(prev.vars));
    prev = prev.prev;
  }
  // Extend with every other variable and keyword
  _.extend(vars, varsToObject(token.state.globalVars));
  _.extend(vars, getPropertyNames(sandbox), keywords);
  // Return as an array for autocompletion
  return _.keys(vars);
};

var getPropertyContext = function (cm, token) {
  var cur     = cm.getCursor();
  var tprop   = token;
  var context = [];
  var level, prev, subContext;

  while (tprop.type === 'property') {
    tprop = getToken(cm, new Pos(cur.line, tprop.start));
    if (tprop.string !== '.') { return []; }
    tprop = getToken(cm, new Pos(cur.line, tprop.start));

    if (tprop.string === ')') {
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

      tprop = getToken(cm, new Pos(cur.line, tprop.start));
      // Do a simple additional check to see if we are trying to use a type
      // surrounded by parens. E.g. `(123).toString()`.
      if (tprop.type === 'variable' || tprop.type === 'property') {
        tprop.isFunction = true;
      } else {
        if (!isWhitespaceToken(tprop)) { return []; }
        // Set `tprop` to be the token inside the parens and start working from
        // that instead
        tprop      = getToken(cm, new Pos(cur.line, prev.start));
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
    prev = getToken(cm, new Pos(cur.line, tprop.start));

    if (isWhitespaceToken(prev)) {
      prev = getToken(cm, new Pos(cur.line, prev.start));
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
    default:
      base = null;
      break;
    }
    // Functions are a special case. We have rudimentary introspection for the
    // DSL. However, if it's a constructor we can provide additional context
    // from the prototype.
    if (tprop.isFunction) {
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

  if (!_.isObject(obj)) { return; }

  return _.keys(getPropertyNames(obj));
};

module.exports = function (cm, options) {
  var cur     = cm.getCursor();
  var token   = getToken(cm, cur);
  var context = options.context || global;

  token.state = CodeMirror.innerMode(cm.getMode(), token.state).state;

  // Check if it's a valid word style token
  if (!/^[\w$_]*$/.test(token.string)) {
    token = {
      start: cur.ch,
      end: cur.ch,
      string: '',
      state: token.state,
      type: token.string === '.' ? 'property' : null
    };
  }

  var completions;
  switch (token.type) {
  case 'keyword':
  case 'variable':
    completions = completeVariable(cm, token, context);
    break;
  case 'property':
    completions = completeProperty(cm, token, context);
    break;
  }

  if (!completions) { return; }

  return {
    list: _.filter(completions, shouldDisplay, token),
    to:   new Pos(cur.line, token.end),
    from: new Pos(cur.line, token.start)
  };
};
