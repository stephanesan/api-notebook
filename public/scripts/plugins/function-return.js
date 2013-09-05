var RETURN_PROP = '@return';

module.exports = function (middleware) {
  middleware.use('inspector:filter', function (data, next) {
    if (typeof data.parent === 'function' && data.property === RETURN_PROP) {
      data.filter = true;
    }

    return next();
  });

  middleware.use('completion:context', function (data, next, done) {
    var token = data.token;
    var type  = token.type;

    if (type === 'immed' && typeof data.context === 'function') {
      data.context = data.context[RETURN_PROP];
      return done();
    }

    if (token.isFunction && (type === 'variable' || type === 'property')) {
      var property = data.context[token.string];
      if (typeof property === 'function' && RETURN_PROP in property) {
        data.context = property[RETURN_PROP];
        return done();
      }
    }

    return next();
  });
};
