var RETURN_PROPERTY = '@return';

module.exports = function (middleware) {
  middleware.use('completion:context', function (data, next, done) {
    var token = data.token;
    var type  = token.type;

    if (type === 'immed' && typeof data.context === 'function') {
      data.context = data.context[RETURN_PROPERTY];
      return done();
    }

    if (token.isFunction && (type === 'variable' || type === 'property')) {
      var property = data.context[token.string];
      if (typeof property === 'function' && RETURN_PROPERTY in property) {
        data.context = property[RETURN_PROPERTY];
        return done();
      }
    }

    return next();
  });
};
