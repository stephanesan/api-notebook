var typeOf         = require('../../lib/type');
var Inspector      = require('../../views/inspector');
var ErrorInspector = require('../../views/error-inspector');

module.exports = function (middleware) {
  /**
   * Empty the result cell contents.
   *
   * @param  {Object}   data
   * @param  {Function} next
   * @param  {Function} done
   */
  middleware.core('result:empty', function (view, next, done) {
    if (view instanceof Inspector) {
      view.remove();
      return done();
    }

    return next();
  });

  /**
   * Render the result cell contents.
   *
   * @param  {Object}   data
   * @param  {Function} next
   * @param  {Function} done
   */
  middleware.core('result:render', function (data, next, done) {
    var options = {
      inspect: data.inspect,
      context: data.context
    };

    var inspector;
    if (!data.isError) {
      inspector = new Inspector(options);
    } else {
      inspector = new ErrorInspector(options);
    }

    inspector.render().appendTo(data.el);

    // Opens the inspector automatically when the type is an object
    var type = typeOf(data.inspect);
    if (type === 'object' || type === 'array') {
      inspector.open();
    }

    return done(null, inspector);
  });
};
