/* global App */
var _ = App.Library._;

/**
 * Sanitize the AST from the RAML parser into something easier to work with.
 *
 * @param  {Object} ast
 * @return {Object}
 */
module.exports = function (ast) {
  if (!_.isString(ast.baseUri)) {
    throw new Error('A baseUri is required');
  }

  // Merge an array of objects into a single object using `_.extend` and
  // `apply` (since `_.extend` accepts unlimited number of arguments).
  ast.traits          = _.extend.apply(_, ast.traits);
  ast.resourceTypes   = _.extend.apply(_, ast.resourceTypes);
  ast.securitySchemes = _.extend.apply(_, ast.securitySchemes);

  // Recurse through the resources and move URIs to be the key names.
  ast.resources = (function flattenResources (resources) {
    var map = {};

    // Resources are provided as an array, we'll move them to be an object.
    _.each(resources, function (resource) {
      // Methods are implemented as arrays of objects too, but not recursively.
      // TODO: If the endpoint is the final route and has no methods, implement
      // backtracking and remove access to it from the AST.
      if (resource.methods) {
        resource.methods = _.object(
          _.pluck(resource.methods, 'method'), resource.methods
        );
      }

      if (resource.resources) {
        resource.resources = flattenResources(resource.resources);
      }

      (function attachResource (object, segments) {
        var segment = segments.shift();

        // Only the one segment part left, embed the entire resource.
        if (!segments.length) {
          return object[segment] = resource;
        }

        // Pull any potential tags out of the relative uri part.
        var tags = _.map(segment.match(/\{([^\{\}]+)\}/g), function (tag) {
          return tag.slice(1, -1);
        });

        // Nested segments need access to the relative uri parameters.
        object[segment] = {
          // Extends any resources already attached to the same property.
          resources: _.extend({}, object[segment] && object[segment].resources),
          // Dodgy `relativeUri` patch.
          relativeUri: '/' + segment,
          // Pick out the applicable template tags.
          uriParameters: _.pick(resource.uriParameters, tags)
        };

        // Remove the segment from the original relative uri.
        resource.relativeUri = resource.relativeUri.substr(segment.length + 1);

        // Remove tags no longer applicable to other parts.
        // Note: This *will* break if the same tag name is in multiple parts.
        resource.uriParameters = _.omit(resource.uriParameters, tags);

        return attachResource(object[segment].resources, segments);
      })(map, resource.relativeUri.substr(1).split('/'));
    });

    return map;
  })(ast.resources);

  return ast;
};
