/* global App */
var _    = App._;
var qs   = App.Library.querystring;
var url  = App.Library.url;
var path = App.Library.path;

var HTTP_METHODS     = ['get', 'head', 'put', 'post', 'patch', 'delete'];
var RETURN_PROPERTY  = '@return';
var RESERVED_METHODS = _.object(HTTP_METHODS.concat('headers', 'query'), true);
var TEMPLATE_REGEX   = /\{(\w+)\}/g;

/**
 * Simple "template" function for working with the uri param variables.
 *
 * @param  {String} template
 * @param  {Object} context
 * @return {String}
 */
var template = function (template, context) {
  return template.replace(TEMPLATE_REGEX, function (_, $0) {
    return context[$0];
  });
};

/**
 * Sanitize the AST from the RAML parser into something easier to work with.
 *
 * @param  {Object} ast
 * @return {Object}
 */
var sanitizeAST = function (ast) {
  // Merge the redundant objects that only have one property each.
  ast.traits        = _.extend.apply(_, ast.traits);
  ast.resourceTypes = _.extend.apply(_, ast.resourceTypes);

  // Recurse through the resources and move URIs to be the key names.
  ast.resources = (function flattenResources (resources) {
    var map = {};

    // Resources are provided as an object, we'll move them to be key based.
    _.each(resources, function (resource) {
      // Methods are implemented as arrays of objects too, but not recursively.
      if (resource.methods) {
        resource.methods = _.object(
          _.pluck(resource.methods, 'method'), resource.methods
        );
      }

      if (resource.resources) {
        resource.resources = flattenResources(resource.resources);
      }

      // Remove the prefixed `/` from the relativeUri.
      map[resource.relativeUri.substr(1)] = resource;
    });

    return map;
  })(ast.resources);

  return ast;
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
 * Returns a function that can be used to make ajax requests.
 *
 * @param  {String}   url
 * @return {Function}
 */
var httpRequest = function (nodes, method) {
  var fullUrl = url.resolve(
    nodes.baseUri, nodes.join('/').replace(/^\/+/, '')
  );

  if (_.isString(nodes.query)) {
    fullUrl = url.resolve(fullUrl, '?' + nodes.query);
  }

  return function (data, done) {
    // No need to pass data through with `GET` or `HEAD` requests.
    if (method === 'get' || method === 'head') {
      data = null;
      done = arguments[0];
    }

    App._executeContext.timeout(Infinity);
    done = done || App._executeContext.async();

    var options = {
      url:     fullUrl,
      data:    typeof data === 'object' ? JSON.stringify(data) : data,
      method:  method.method,
      headers: nodes.headers
    };

    // Trigger the ajax middleware so plugins can hook onto the requests.
    App.middleware.trigger('ajax', options, done);

    return options.xhr;
  };
};

/**
 * Attach the query string helper.
 *
 * @param  {Array}  nodes
 * @param  {Object} context
 * @param  {Object} methods
 * @return {Object}
 */
var attachQuery = function (nodes, context, methods) {
  if ('query' in nodes) {
    return context;
  }

  var routeNodes = _.extend([], nodes, {
    query: null
  });

  context.query = function (query) {
    if (_.isObject(query)) {
      query = qs.stringify(query);
    }

    routeNodes.query = query;
    return attachMethods(routeNodes, {}, methods);
  };

  context.query[RETURN_PROPERTY] = attachMethods(routeNodes, {}, methods);

  return context;
};

/**
 * Attach the headers helper.
 *
 * @param  {Array}  nodes
 * @param  {Object} context
 * @param  {Object} methods
 * @return {Object}
 */
var attachHeaders = function (nodes, context, methods) {
  if ('headers' in nodes) {
    return context;
  }

  var routeNodes = _.extend([], nodes, {
    headers: null
  });

  context.headers = function (headers) {
    if (typeof headers !== 'object') {
      throw new Error('Ajax headers must be provided as an object');
    }

    routeNodes.headers = headers;
    return attachMethods(routeNodes, {}, methods);
  };

  context.headers[RETURN_PROPERTY] = attachMethods(routeNodes, {}, methods);

  return context;
};

/**
 * Attaches executable XHR methods to the context object.
 *
 * @param  {Array}  nodes
 * @param  {Object} context
 * @param  {Object} methods
 * @return {Object}
 */

/* jshint -W003 */
var attachMethods = function (nodes, context, methods) {
  var newContext, routeNodes;

  attachQuery(nodes, context, methods);
  attachHeaders(nodes, context, methods);

  // Iterate over all the possible methods and attach.
  _.each(methods, function (method, verb) {
    context[verb] = httpRequest(nodes, method);
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
    var routeName  = route;
    var resources  = resource.resources;
    // Use `extend` to clone the nodes since we attach meta data directly to
    // the nodes.
    var routeNodes = _.extend([], nodes);
    var allTemplates;

    routeNodes.push(route);

    // The route can contain any number of templates and text.
    if (allTemplates = route.match(TEMPLATE_REGEX)) {
      var group      = allTemplates.join('');
      var startIndex = route.length - group.length;

      // The route must end with the template tags and have no intermediate
      // text between template tags.
      if (route.indexOf(group) === startIndex) {
        var startText = route.substr(0, startIndex);

        // If the route is only a template tag with no static text, use the
        // template tag text as the method name.
        if (startIndex === 0) {
          routeName = allTemplates[0].slice(1, -1);
        } else {
          routeName = startText;
        }

        // Don't add reserved methods to the context. This is done to avoid
        // potentially confusing use cases. *Was it `get` to make the request
        // or to set the path?*
        if (_.has(RESERVED_METHODS, routeName)) {
          return false;
        }

        // The route is dynamic, so we set the route name to be a function
        // which accepts the template arguments and creates a path fragment.
        // We'll mix in any route already at the namespace so we can do
        // things like use both `/{route}` and `/route`.
        context[routeName] = _.extend(function () {
          var args = _.first(arguments, allTemplates.length);

          // Check the taken arguments length matches the expected number.
          if (args.length < allTemplates.length) {
            throw new Error(
              'Insufficient parameters given for "' + route + '". ' +
              'Expected ' + allTemplates.length + ', but got ' + args.length
            );
          }

          // Change the last path fragment to the proper text.
          routeNodes[routeNodes.length - 1] = startText + args.join('');

          var newContext = {};
          attachMethods(routeNodes, newContext, resource.methods);
          return attachResources(routeNodes, newContext, resources);
        }, context[routeName]);

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
 * Generate the client object from a sanitized AST object.
 *
 * @param  {Object} ast
 * @return {Object}
 */
var generateClient = function (ast) {
  var nodes = _.extend([], {
    baseUri: ast.baseUri
  });

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
    var route = template(path, context || {}).split('/');
    return attachMethods(_.extend([], nodes, route), {}, httpMethods);
  };

  // Enable the `@return` property used by the completion plugin.
  client[RETURN_PROPERTY] = attachMethods(nodes, {}, httpMethods);

  // Attach all the resources to the returned client function.
  attachResources(nodes, client, ast.resources);

  return client;
};

/**
 * Exports the client generator, which accepts the AST of a RAML document.
 *
 * @return {Object} Dynamic object for constructing API requests from the AST.
 */
module.exports = function (ast) {
  return generateClient(sanitizeAST(ast));
};
