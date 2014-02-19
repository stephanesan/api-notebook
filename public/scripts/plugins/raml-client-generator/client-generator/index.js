/* global App */
var _           = App._;
var qs          = App.Library.querystring;
var trim        = require('trim');
var cases       = App.Library.changeCase;
var escape      = require('escape-regexp');
var parser      = require('uri-template');
var sanitizeAST = require('./sanitize-ast');

var HTTP_METHODS         = ['get', 'head', 'put', 'post', 'patch', 'delete'];
var RETURN_PROPERTY      = '@return';
var DESCRIPTION_PROPERTY = '@description';
var RESERVED_METHODS     = _.object(HTTP_METHODS, true);

/**
 * Accepts a params object and transforms it into a regex for matching the
 * tokens in the route.
 *
 * @param  {Object} params
 * @return {RegExp}
 */
var uriParamRegex = function (params) {
  // Transform the params into a regular expression for matching.
  return new RegExp('{(' + _.map(_.keys(params), escape).join('|') + ')}', 'g');
};

/**
 * Simple "template" function for working with the uri param variables.
 *
 * @param  {String}       template
 * @param  {Object}       params
 * @param  {Object|Array} context
 * @return {String}
 */
var template = function (string, params, context) {
  // If the context is an array, we need to transform the replacements into
  // index based positions for the uri template parser.
  if (_.isArray(context)) {
    var index = 0;

    string = string.replace(uriParamRegex(params), function () {
      return '{' + (index++) + '}';
    });
  }

  return parser.parse(string).expand(context);
};

/**
 * Transform a general RAML method describing object into a tooltip
 * documentation object.
 *
 * @param  {Object} object
 * @return {Object}
 */
var toDescriptionObject = function (object) {
  var description = {};

  // Documentation/description is usually available.
  description['!doc'] = object.description;

  return description;
};

/**
 * List of all plain HTTP methods in the format from the AST.
 *
 * @type {Object}
 */
var httpMethods = _.chain(HTTP_METHODS).map(function (method) {
    return [method, {
      method: method
    }];
  }).object().value();

/**
 * Map of methods to their tooltip description objects.
 *
 * @type {Object}
 */
var methodDescription = {
  'get': {
    '!type': 'fn(query?: object, async?: ?)'
  },
  'head': {
    '!type': 'fn(query?: object, async?: ?)'
  },
  'put': {
    '!type': 'fn(body?: ?, async?: ?)'
  },
  'post': {
    '!type': 'fn(body?: ?, async?: ?)'
  },
  'patch': {
    '!type': 'fn(body?: ?, async?: ?)'
  },
  'delete': {
    '!type': 'fn(body?: ?, async?: ?)'
  }
};

/**
 * Parse an XHR request for response headers and return as an object. Pass an
 * additional flag to filter any potential duplicate headers (E.g. different
 * cases).
 *
 * @param  {Object} xhr
 * @return {Object}
 */
var getAllReponseHeaders = function (xhr) {
  var responseHeaders = {};

  _.each(xhr.getAllResponseHeaders().split('\n'), function (header) {
    header = header.split(':');

    // Make sure we have both parts of the header.
    if (header.length > 1) {
      var name  = header.shift();
      var value = trim(header.join(':'));

      responseHeaders[name.toLowerCase()] = value;
    }
  });

  return responseHeaders;
};

/**
 * Return the xhr response mime type.
 *
 * @param  {String} contentType
 * @return {String}
 */
var getMime = function (contentType) {
  return (contentType || '').split(';')[0];
};

/**
 * Check if an object is a host object and avoid serializing.
 *
 * @param  {Object}  obj
 * @return {Boolean}
 */
var isHost = function (obj) {
  var str = Object.prototype.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object String]':
    case '[object Number]':
    case '[object Boolean]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
};

/**
 * Map mime types to their parsers.
 *
 * @type {Object}
 */
var parse = {
  'application/json': JSON.parse,
  'application/x-www-form-urlencoded': qs.parse
};

/**
 * Map mime types to their serializers.
 *
 * @type {Object}
 */
var serialize = {
  'application/json': JSON.stringify,
  'application/x-www-form-urlencoded': qs.stringify,
  'multipart/form-data': function (data) {
    var form = new FormData();

    // Iterate over every piece of data and append to the form data object.
    _.each(data, function (value, key) {
      form.append(key, value);
    });

    return form;
  }
};

/**
 * Map the supported auth types to the known triggers.
 *
 * @type {Object}
 */
var authTypes = {
  'OAuth 1.0':            'oauth1',
  'OAuth 2.0':            'oauth2',
  'Basic Authentication': 'basicAuth'
};

/**
 * Required authentication keys used to check the options object.
 *
 * @type {Object}
 */
var requiredAuthKeys = {
  oauth1: {
    consumerKey:    true,
    consumerSecret: true
  },
  oauth2: {
    clientId:     true,
    clientSecret: true
  },
  basicAuth: {
    username: true,
    password: true
  }
};

/**
 * Gets a header from the header object.
 *
 * @param  {Object}  headers
 * @param  {String}  header
 * @return {Boolean}
 */
var findHeader = function (headers, header) {
  header = header.toLowerCase();

  return _.find(headers, function (value, name) {
    return name.toLowerCase() === header;
  });
};

/**
 * Sanitize the XHR request into the desired format.
 *
 * @param  {XMLHttpRequest} xhr
 * @return {Object}
 */
var sanitizeXHR = function (xhr) {
  if (!xhr) { return xhr; }

  var mime    = getMime(xhr.getResponseHeader('Content-Type'));
  var body    = xhr.responseText;
  var headers = getAllReponseHeaders(xhr);

  // Automatically parse certain response types.
  if (parse[mime]) {
    body = parse[mime](body);
  }

  return {
    body:    body,
    status:  xhr.status,
    headers: headers
  };
};

/**
 * Returns a function that can be used to make ajax requests.
 *
 * @param  {String}   url
 * @return {Function}
 */
var httpRequest = function (nodes, method) {
  return function (data, config, done) {
    // Allow config to be omitted from arguments.
    if (_.isFunction(arguments[1])) {
      done   = arguments[1];
      config = null;
    }

    // Merge configuration options for a complete object.
    // TODO: Confirm this behaviour (wiping an entire key for another). E.g.
    // All headers will be wiped out instead of merged.
    config = _.extend({}, nodes.config, config);

    var async   = !!done;
    var query   = _.extend({}, config.query);
    var headers = _.extend({}, config.headers);
    var mime    = getMime(findHeader(headers, 'Content-Type'));
    var baseUri = template(nodes.client.baseUri, {}, config.baseUriParameters);
    var fullUri = baseUri + '/' + nodes.join('/');

    // Parse the query string if needed to merge parameters and run validation.
    if (_.isString(query)) {
      query = qs.parse(query);
    }

    // GET and HEAD requests accept the query string as the first argument.
    if (method.method === 'get' || method.method === 'head') {
      _.extend(query, _.isString(data) ? qs.parse(data) : data);
      data  = null;
    }

    // Append the stringified query string if we have one.
    fullUri += _.keys(query).length ? '?' + qs.stringify(query) : '';

    // Set the correct `Content-Type` header, if none exists. Kind of random if
    // more than one exists - in that case I would suggest setting it yourself.
    if (!mime && typeof method.body === 'object') {
      headers['Content-Type'] = mime = _.keys(method.body).pop();
    }

    // If we have no accept header set already, default to accepting
    // everything. This is required because Firefox sets the base accept
    // header to essentially be `html/xml`.
    if (!findHeader(headers, 'Accept')) {
      headers.accept = '*/*';
    }

    // If we were passed in data, attempt to sanitize it to the correct type.
    if (!isHost(data) && serialize[mime]) {
      data = serialize[mime](data);
    }

    var options = {
      url:     fullUri,
      data:    data,
      async:   async,
      proxy:   nodes.config.proxy,
      method:  method.method,
      headers: headers
    };

    // Iterate through `securedBy` methods and accept the first one we are
    // already authenticated for.
    _.some(method.securedBy || nodes.client.securedBy, function (secured) {
      // Skip unauthorized requests since we'll be doing that anyway if the
      // rest of the secure methods fail to exist.
      if (secured == null) {
        return false;
      }

      var scheme        = nodes.client.securitySchemes[secured];
      var authenticated = nodes.client.authentication[scheme.type];

      // Return the authenticated object. If truthy, iteration will stop.
      return options[authTypes[scheme.type]] = authenticated;
    });

    // If the request is async, set the relevant function callbacks.
    if (async) {
      App._executeContext.timeout(Infinity);

      if (!_.isFunction(done)) {
        done = App._executeContext.async();
      }
    }

    // Awkward sync and async code mixing.
    var response, error;

    // Trigger the ajax middleware so plugins can hook onto the requests. If
    // the function is async we need to register a callback for the middleware.
    App.middleware.trigger('ajax', options, function (err, xhr) {
      error    = err;
      response = sanitizeXHR(xhr);

      return async && done(err, response);
    });

    // If the request was synchronous, return the sanitized XHR response data.
    // This is super jank for handling errors, etc.
    if (!async) {
      if (error) {
        throw error;
      }

      return response;
    }
  };
};

/**
 * Attaches executable XHR methods to the context object.
 *
 * @param  {Array}  nodes
 * @param  {Object} context
 * @param  {Object} methods
 * @return {Object}
 */
var attachMethods = function (nodes, context, methods) {
  // Attach the available methods to the current context.
  _.each(methods, function (method, verb) {
    context[verb] = httpRequest(nodes, method);
    context[verb][DESCRIPTION_PROPERTY] = _.extend(
      toDescriptionObject(method), methodDescription[verb]
    );
  });

  return context;
};

/**
 * Recurses through a resource object in the RAML AST, generating a dynamic
 * DSL that only allows methods that were defined in the RAML spec.
 *
 * @param  {Array}  nodes     An array of path nodes that can be joined.
 * @param  {Object} context   Where to attach the resource routes.
 * @param  {Object} resources An object of resource routes.
 * @return {Object}           Returns the passed in context object.
 */
var attachResources = function attachResources (nodes, context, resources) {
  _.each(resources, function (resource, route) {
    var routeName = route;
    var resources = resource.resources;
    // Use `extend` to clone nodes since we have data available on the nodes.
    var routeNodes   = _.extend([], nodes);
    var templateTags = resource.uriParameters && _.keys(resource.uriParameters);

    // Push the current route into the route array.
    routeNodes.push(route);

    if (templateTags && templateTags.length) {
      // The route must end with template tags and have no intermediate text
      // between template tags.
      if (/^.*(?:\{[^\{\}]+\})+$/.test(route)) {
        var templateCount = templateTags.length;

        // If the route is only a template tag with no static text, use the
        // template tag text as the method name.
        if (templateCount === 1 && route === '{' + templateTags[0] + '}') {
          routeName = templateTags[0];
        } else {
          routeName = route.substr(0, route.indexOf('{'));
        }

        // Don't add reserved methods to the context. This is done to avoid
        // potentially confusing use cases. *Was it `get` to make the request
        // or to set the path?*
        if (!routeName || _.has(RESERVED_METHODS, routeName)) {
          return false;
        }

        // Get the ordered tag names for completion.
        var tags = _.map(
          route.match(uriParamRegex(resource.uriParameters)),
          function (param) {
            return resource.uriParameters[param.slice(1, -1)];
          }
        );

        // The route is dynamic, so we set the route name to be a function
        // which accepts the template arguments and updates the path fragment.
        // We'll extend any route already at the same namespace so we can do
        // things like use both `/{route}` and `/route`, if needed.
        context[routeName] = _.extend(function () {
          var args = arguments;

          // Map the tags to the arguments or default arguments.
          var parts = _.map(tags, function (param, index) {
            // Inject enum parameters if there is only one available enum.
            // TODO: When/if we add validation back, have these routes
            // be generated instead of typed out.
            if (args[index] == null && param.enum && param.enum.length === 1) {
              return param.enum[0];
            }

            return args[index];
          });

          // Change the last path fragment to the proper template text.
          routeNodes[routeNodes.length - 1] = template(
            route, resource.uriParameters, parts
          );

          var newContext = {};
          attachMethods(routeNodes, newContext, resource.methods);
          return attachResources(routeNodes, newContext, resources);
        }, context[routeName]);

        // Generate the description object for helping tooltip display.
        context[routeName][DESCRIPTION_PROPERTY] = {
          // Create a function type hint based on the display name and whether
          // the tag is required.
          '!type': 'fn(' + _.map(tags, function (param) {
            var displayName = param.displayName + (!param.required ? '?' : '');

            return displayName + ': ' + (param.type || '?');
          }).join(', ') + ')',
          // Generate documentation by joining all the template descriptions
          // together with new lines.
          '!doc': _.chain(tags).uniq().filter(function (param) {
            return !!param.description;
          }).map(function (param) {
            return '"' + param.displayName + '": ' + param.description;
          }).value().join('\n')
        };

        // Generate the return property for helping autocompletion.
        var returnPropContext = {};
        attachMethods(routeNodes, returnPropContext, resource.methods);
        attachResources(routeNodes, returnPropContext, resources);
        return context[routeName][RETURN_PROPERTY] = returnPropContext;
      } else {
        return false;
      }
    }

    // If the route is only static text we can easily add the next route.
    var newContext = context[routeName] || (context[routeName] = {});
    attachMethods(routeNodes, newContext, resource.methods);
    return attachResources(routeNodes, newContext, resources);
  });

  return context;
};

/**
 * Returns an object of keys with whether they are required or not.
 *
 * @param  {String} type
 * @param  {Object} options
 * @return {Object}
 */
var requiredKeys = function (type, options) {
  var requiredKeys = _.extend({}, requiredAuthKeys[type]);

  // Special case is required for OAuth2 implicit auth flow.
  if (type === 'oauth2' && _.contains(options.authorizationGrants, 'token')) {
    requiredKeys.clientSecret = false;
  }

  return requiredKeys;
};

/**
 * Return an array of keys that are still required to be filled.
 *
 * @param  {String} type
 * @param  {Object} options
 * @return {Array}
 */
var requiredOptions = function (type, options) {
  var keys = requiredKeys(type, options);

  return _.filter(_.keys(keys), function (key) {
    return keys[key] && !options[key];
  });
};

/**
 * Trigger the middleware prompt for tokens.
 *
 * @param {String}   type
 * @param {Object}   options
 * @param {Function} done
 */
var middlewarePrompt = function (type, options, done) {
  return App.middleware.trigger('ramlClient:' + type, options, done);
};

/**
 * Execute the full authentication prompt. This includes requesting the
 * middleware and/or prompting the user to fill the values.
 *
 * @param {String}   type
 * @param {Object}   options
 * @param {Function} done
 */
var fullPrompt = function (type, options, done) {
  var title = {
    oauth1:    'Please Enter Your OAuth1 Keys',
    oauth2:    'Please Enter Your OAuth2 Keys',
    basicAuth: 'Please Enter Your Username and Password'
  }[type];

  return App.middleware.trigger('ui:modal', {
    title: title,
    content: [
      '<p>',
      'This API requires authentication. Please enter your application keys.',
      '</p>',
      '<p><em>',
      'We will not store your keys.',
      '</em></p>'
    ].concat([
      '<form>',
      _.map(requiredOptions(type, options), function (required) {
        var value = options[required] || '';

        return [
          '<div class="form-group">',
          '<label for="' + required + '">' + required + '</label>',
          '<input id="' + required + '" value="' + value + '">',
          '</div>'
        ].join('');
      }).join('\n'),
      '<div class="form-footer">',
      '<button type="submit" class="btn btn-primary">Submit</button>',
      '</div>',
      '<form>'
    ]).join('\n'),
    show: function (modal) {
      modal.el.querySelector('form')
        .addEventListener('submit', function (e) {
          e.preventDefault();

          _.each(this.querySelectorAll('input'), function (inputEl) {
            options[inputEl.getAttribute('id')] = inputEl.value;
          });

          // Close the modal once all the options have been
          modal.close();
        });
    }
  }, function (err) {
    return done(err, options);
  });
};

/**
 * Trigger the authentication flow immediately or after we attempt to grab
 * the configuration options.
 *
 * @param {String}   type
 * @param {Object}   options
 * @param {Function} done
 */
var authenticatePrompt = function (type, options, done) {
  var cb = function (err, data) {
    if (err) { return done(err); }

    // Extend the options object with generated options.
    var trigger = 'authenticate:' + type;
    return App.middleware.trigger(trigger, _.extend(options, data), done);
  };

  // Check against the required options.
  if (!requiredOptions(type, options).length) {
    return cb(null, {});
  }

  return fullPrompt(type, options, cb);
};

/**
 * Attach an authentication method that delegates to middleware.
 *
 * @param  {String}   trigger
 * @param  {Array}    nodes
 * @param  {Object}   scheme
 * @return {Function}
 */
var authenticateMiddleware = function (trigger, nodes, scheme) {
  return function (data, done) {
    // Allow the `data` argument to be omitted.
    if (typeof arguments[0] === 'function') {
      data = {};
      done = arguments[0];
    }

    // If no callback function is provided, use the `async` function.
    if (!_.isFunction(done)) {
      done = App._executeContext.async();
    }

    var options = _.extend({}, scheme.settings);

    // Timeout after 10 minutes.
    App._executeContext.timeout(10 * 60 * 1000);

    var cb = function (err, auth) {
      // Set the client authentication details. This will be used with any
      // http requests that require the authentication type.
      nodes.client.authentication[scheme.type] = _.extend({}, options, auth);
      return done(err, auth);
    };

    // Check whether we need to proceed to collecting more data.
    if (!requiredOptions(trigger, _.extend({}, options, data))) {
      return authenticatePrompt(trigger, _.extend(options, data), cb);
    }

    // Trigger a prompt to the middleware layer.
    return middlewarePrompt(trigger, options, function (err, updates) {
      if (err) { return done(err); }

      // Extend the options with the user data over the top.
      return authenticatePrompt(trigger, _.extend(options, updates, data), cb);
    });
  };
};

/**
 * Attaches all available security schemes to the context.
 *
 * @param  {Array}  nodes
 * @param  {Object} context
 * @param  {Object} schemes
 * @return {Object}
 */
var attachSecuritySchemes = function (nodes, context, schemes) {
  var description = 'Authentication parameters are optional. ' +
    'For popular APIs, we provide keys. ' +
    'If we need your keys we will prompt you via a modal. ' +
    'Never enter keys directly into a Notebook unless ' +
    'you explicitly intend to share them. ' +
    'If you would like to know more about authenticating ' +
    'with this API, see \'securityScheme.settings\' in the RAML file.';

  // Loop through the available schemes and manually attach each of the
  // available schemes.
  _.each(schemes, function (scheme, title) {
    if (!authTypes[scheme.type]) { return; }

    var type   = authTypes[scheme.type];
    var method = 'authenticate' + cases.pascal(title);

    context[method] = authenticateMiddleware(type, nodes, scheme);
    context[method][DESCRIPTION_PROPERTY] = _.extend(
      toDescriptionObject(scheme),
      {
        '!type': 'fn(options?: object, cb?: function(error, data))'
      }
    );

    if (!context[method][DESCRIPTION_PROPERTY]['!doc']) {
      context[method][DESCRIPTION_PROPERTY]['!doc'] = description;
    } else {
      context[method][DESCRIPTION_PROPERTY]['!doc'] = [
        description, context[method][DESCRIPTION_PROPERTY]['!doc']
      ].join('\n\n');
    }
  });

  return context;
};

/**
 * Generate the client object from a sanitized AST object.
 *
 * @param  {Object} ast Passed through `sanitizeAST`
 * @return {Object}
 */
var generateClient = function (ast, config) {
  // Generate the root node array. Set properties directly on this array to be
  // copied to the next execution part. We have a global configuration object
  // which can be altered externally at any point, as well as when we finally
  // make a request. For this reason, it's important that we use objects which
  // are passed by reference.
  var nodes = _.extend([], {
    config: config || {},
    client: {
      baseUri:         ast.baseUri.replace(/\/+$/, ''),
      securedBy:       ast.securedBy,
      authentication:  {},
      securitySchemes: ast.securitySchemes
    }
  });

  // Set up the initial baseUriParameters configuration.
  config.baseUriParameters = _.extend(
    {}, config.baseUriParameters, _.pick(ast, 'version')
  );

  /**
   * The root client implementation is simply a function. This allows us to
   * enter a custom path that may not be supported by the DSL and run any
   * method regardless of whether it was defined in the spec.
   *
   * @param  {String} path
   * @param  {Object} context
   * @return {Object}
   */
  var client = function (path, context) {
    var route = template(
      path, {}, context || {}
    ).replace(/^\/+/, '').split('/');

    return attachMethods(_.extend([], nodes, route), {}, httpMethods);
  };

  // Enable the `@return` property used by the completion plugin.
  client[RETURN_PROPERTY] = attachMethods(nodes, {}, httpMethods);

  // Enable the `@description` property used by the completion tooltip helper.
  client[DESCRIPTION_PROPERTY] = {
    '!type': 'fn(url: string, data?: object)',
    '!doc': [
      'Make an API request to a custom URL. Pass in a `data` object to replace',
      'any template tags before making the request.'
    ].join(' ')
  };

  // Attach all the resources to the returned client function.
  attachResources(nodes, client, ast.resources);

  // Attach security scheme authentication to the root node.
  attachSecuritySchemes(nodes, client, ast.securitySchemes);

  return client;
};

/**
 * Exports the client generator, which accepts the AST of a RAML document.
 *
 * @return {Object} Dynamic object for constructing API requests from the AST.
 */
module.exports = function (ast, config) {
  return generateClient(sanitizeAST(ast), config);
};
