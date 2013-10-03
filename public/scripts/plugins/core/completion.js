var _ = require('underscore');

/**
 * Reserved keyword list (http://mdn.io/reserved)
 *
 * @type {Object}
 */
var keywords = _.object(('break case catch continue debugger default ' +
               'delete do else false finally for function if in instanceof ' +
               'new null return switch throw true try typeof var void while ' +
               'with').split(' '), true);

/**
 * CodeMirror provides access to inline variables defined within the notebook
 * using nested objects to represent each scope level in the editor. This will
 * squash the variables to a single level.
 *
 * @param  {Object} scope
 * @return {Object}
 */
var varsToObject = function (scope) {
  var obj = {};

  while (scope) {
    // The scope variable could be the same token we are currently typing
    if (typeof scope.name === 'string') {
      obj[scope.name] = true;
    }
    scope = scope.next;
  }

  return obj;
};

/**
 * Checks if the variable name is valid.
 *
 * @param  {String}  name
 * @return {Boolean}
 */
var isValidVariableName = function (name) {
  return (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/).test(name);
};

/**
 * Returns a flat object of all valid JavaScript literal property names.
 *
 * @param  {Object} obj
 * @return {Object}
 */
var getPropertyNames = function (obj) {
  var props = {};
  var addProp;

  /**
   * Adds the property to the property names object. Skips any property names
   * that aren't valid JavaScript literals since completion should not display
   * invalid JavaScript suggestions.
   *
   * @param {String} property
   */
  addProp = function (property) {
    if (isValidVariableName(property)) {
      props[property] = true;
    }
  };

  do {
    _.each(Object.getOwnPropertyNames(obj), addProp);
  } while (obj = Object.getPrototypeOf(obj));

  return props;
};

/**
 * Registers all the core plugins for the completion widgets.
 *
 * @param {Object} middleware
 */
module.exports = function (middleware) {
  /**
   * Completes the completion variable suggestions.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  middleware.core('completion:variable', function (data, next, done) {
    var token = data.token;

    _.extend(data.results, varsToObject(token.state.localVars));

    // Extend the variables object with each context level
    var prev = token.state.context;
    while (prev) {
      _.extend(data.results, varsToObject(prev.vars));
      prev = prev.prev;
    }

    _.extend(data.results, varsToObject(token.state.globalVars));
    _.extend(data.results, getPropertyNames(data.context), keywords);

    return done();
  });

  /**
   * Augments the property completion data with all property names.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  middleware.core('completion:property', function (data, next, done) {
    _.extend(data.results, getPropertyNames(data.context));
    return done();
  });

  /**
   * Corrects the completion lookup context. Looks up variables/properties in
   * the global scope and coerces other types detected by CodeMirror (such as
   * strings and numbers) into the correct representation.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  middleware.core('completion:context', function (data, next, done) {
    var token  = data.token;
    var type   = token.type;
    var string = token.string;

    if (type === 'variable' || type === 'property') {
      var context = data[type === 'variable' ? 'global' : 'context'];
      // Lookup the property on the current context object.
      data.context = context[string];
      return done();
    }

    if (type === 'array') {
      data.context = Array.prototype;
      return done();
    }

    if (type === 'string') {
      data.context = string.slice(1, -1);
      return done();
    }

    if (type === 'number') {
      data.context = Number(string);
      return done();
    }

    if (type === 'string-2') {
      var parts = token.string.split('/');
      data.context = new RegExp(parts[1].replace('\\', '\\\\'), parts[2]);
      return done();
    }

    if (type === 'atom') {
      if (string === 'true' || string === 'false') {
        data.context = Boolean(string);
      } else if (string === 'null') {
        data.context = null;
      } else if (string === 'undefined') {
        data.context = undefined;
      }

      return done();
    }

    data.context = null;
    return done();
  });

  /**
   * Filter autocompletion suggestions. Checks the given suggestion is actually
   * the start of the current token.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  middleware.core('completion:filter', function (data, next, done) {
    var value  = data.result.value;
    var string = data.token.string;
    var length = value.length >= string.length;

    return done(null, length && value.substr(0, string.length) === string);
  });

  /**
   * Provides completion suggestions for a functions arguments.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  middleware.core('completion:arguments', function (data, next, done) {
    // TODO: Refactor into its own module.
    if (data.fn === data.context.addEventListener) {
      return done(null, ['"name"', 'function (event) {}', 'true']);
    }

    return done(null, []);
  });

  /**
   * Provides completion middleware for resolving the returned context of a
   * function.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  middleware.core('completion:function', function (data, next, done) {
    // If the variable/property is a constructor function, we can provide
    // some additional context by looking at the `prototype` property.
    if (data.construct) {
      return done(null, data.fn.prototype);
    }

    // TODO: Refactor to a more generalised module.
    if (data.fn === data.context.Array) {
      return done(null, []);
    }

    // Intentionally return an empty context for functions.
    return done(null, null);
  });
};
