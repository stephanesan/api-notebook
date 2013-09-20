/* global App */
var _    = App._;
var url  = App.Library.url;
var path = App.Library.path;

var RETURN_PROPERTY = '@return';

// Catch commonly used regular expressions
var TEMPLATE_REGEX = /\{(\w+)\}/g;

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
      // Recursively resolves resources.
      if (resource.resources) {
        resource.resources = flattenResources(resource.resources);
      }
      // Remove the prefixed `/` from the relativeUri.
      map[resource.relativeUri.substr(1)] = resource;
    });
    // Returns the updated resources
    return map;
  })(ast.resources);

  // Returns the original AST object, everything has been changed in place.
  return ast;
};

/**
 * List of all plain HTTP methods in the format from the AST.
 *
 * @type {Object}
 */
var httpMethods = _.chain(
    ['get', 'put', 'post', 'patch', 'delete']
  ).map(function (method) {
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
  var fullUrl = url.resolve(nodes.baseUri, nodes.join('/'));

  // Switch behaviour based on the method data.
  return function () {
    var done;

    // We know this code works, so bump up the execution timeout. This needs to
    // be done before we call `async` so that it will use this value.
    App._executeContext.timeout = Infinity;

    if (arguments.length > 1) {
      done = arguments[1];
    } else {
      done = App._executeContext.async();
    }

    var options = {
      url:  fullUrl,
      type: method.method
    };

    // Trigger ajax middleware resolution so other middleware can hook onto
    // these requests and augment.
    App.middleware.trigger('ajax', options, done);

    // Return the XHR request.
    return options.xhr;
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
  // Iterate over all resource keys
  _.each(resources, function (resource, route) {
    var routeName  = route;
    var resources  = resource.resources;
    // Use `extend` to clone the nodes since we attach meta data directly to
    // the nodes.
    var routeNodes = _.extend([], nodes);
    var allTemplates;

    // Push the latest route into the path fragment list.
    routeNodes.push(route);

    // The route contains any number of templates and text.
    if (allTemplates = route.match(TEMPLATE_REGEX)) {
      var group      = allTemplates.join('');
      var startIndex = route.length - group.length;
      // The route must end with the template tags and have no intermediate
      // text between template tags.
      if (route.indexOf(group) === startIndex) {
        var startText = route.substr(0, startIndex);
        // The route is only a template tag with no static text, use the
        // template tag text.
        if (startIndex === 0) {
          routeName = allTemplates[0].slice(1, -1);
        } else {
          routeName = startText;
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

    // The route is only static text, we can easily add the next route.
    var newContext = context[routeName] || (context[routeName] = {});
    attachMethods(routeNodes, newContext, resource.methods);
    return attachResources(routeNodes, newContext, resources);
  });

  // Chainability
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

    // Extends a new array with root meta data and path fragment nodes.
    return attachMethods(_.extend([], nodes, route), {}, httpMethods);
  };

  // Enable the `@return` property used by the completion plugin.
  client[RETURN_PROPERTY] = attachMethods(nodes, {}, httpMethods);

  // Attach all the resources to the returned client function.
  attachResources(nodes, client, ast.resources);

  // Returns the root of the DST.
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
