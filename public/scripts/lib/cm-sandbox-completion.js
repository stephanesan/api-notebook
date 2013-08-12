var _ = require('underscore');

var Pos = CodeMirror.Pos;

// Reserved word list (http://mdn.io/reserved)
var keywords = ['break', 'case', 'catch', 'continue', 'debugger', 'default',
                'delete', 'do', 'else', 'false', 'finally', 'for', 'function',
                'if', 'in', 'instanceof', 'new', 'null', 'return', 'switch',
                'throw', 'true', 'try', 'typeof', 'var', 'void', 'while',
                'with'];

var varsToArray = function (scope) {
  var array = [];

  while (scope) {
    if (typeof scope.name === 'string') { array.push(scope.name); }
    scope = scope.next();
  }

  return array;
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

var completeVariable = function (cm, token, sandbox) {
  var variables = Object.getOwnPropertyNames(sandbox).concat(keywords);

  return variables
    .concat(varsToArray(token.localVars))
    .concat(varsToArray(token.globalVars));
};

var getPropertyContext = function (cm, token) {
  var cur     = cm.getCursor();
  var tprop   = token;
  var context = [];
  var level, prev;

  while (tprop.type === 'property') {
    tprop = getToken(cm, Pos(cur.line, tprop.start));
    if (tprop.string !== '.') { return []; }
    tprop = getToken(cm, Pos(cur.line, tprop.start));

    if (tprop.string === ')') {
      level = 1;
      prev  = tprop; // Keep track in case this isn't a function after all
      do {
        tprop = getToken(cm, Pos(cur.line, tprop.start));
        switch (tprop.string) {
          case ')': level++; break;
          case '(': level--; break;
        }
      } while (level > 0);

      tprop = getToken(cm, Pos(cur.line, tprop.start));
      // Do a simple additional check to see if we are trying to use a type
      // surrounded by parens. E.g. `(123).toString()`.
      if (tprop.type !== 'variable') {
        if (!isWhitespaceToken(tprop)) { return []; }
        // Set `tprop` to be the token inside the parens and start working from
        // that instead
        tprop = getToken(cm, Pos(cur.line, prev.start));
      } else {
        tprop.type = 'function';
      }
    }

    context.push(tprop);
  }

  if (tprop.type === 'function') {
    prev = getToken(cm, Pos(cur.line, tprop.start));

    if (isWhitespaceToken(prev)) {
      prev = getToken(cm, Pos(cur.line, prev.start));
      // Sets whether the property is a constructor, which will result in
      // richer autocompletion results
      tprop.constructor = (prev.type === 'keyword' && prev.string === 'new');
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
      case 'string-2': // RegExp
        base = RegExp.prototype;
        break;
      case 'atom':
        if (tprop.string === 'true' || trop.string === 'false') {
          base = Boolean.prototype
        } else {
          base = null;
        }
        break;
      case 'number':
        base = Number.prototype;
        break;
      case 'function':
        if (tprop.constructor) {
          base = base[tprop.string] && base[tprop.string].prototype;
        }
        break;
      default:
        base = null;
        break;
    }
  }

  return base;
};

var completeProperty = function (cm, token, sandbox) {
  var obj = getPropertyObject(cm, token, sandbox);
  var props;

  if (!_.isObject(obj)) { return; }

  props = [];

  while (obj) {
    props.push.apply(props, Object.getOwnPropertyNames(obj));
    // Check up the prototype chain for other variables
    obj = Object.getPrototypeOf(obj);
  }

  return _.uniq(props);
};

module.exports = function (cm, options) {
  var cur     = cm.getCursor();
  var token   = getToken(cm, cur);
  var context = cm.view && cm.view.sandbox && cm.view.sandbox.window || window;

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
    default:
      completions = [];
      break;
  }

  return {
    list: _.filter(completions, shouldDisplay, token),
    to:   Pos(cur.line, token.end),
    from: Pos(cur.line, token.start)
  };
};
