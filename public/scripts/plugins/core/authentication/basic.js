var _ = require('underscore');

module.exports = function (middleware) {
  middleware.core('authentication:basicAuth', function (data, next, done) {
    if (!_.isString(data.username) || !_.isString(data.password)) {
      return next(new TypeError('Username and password must be defined'));
    }

    return done(null, _.pick(data, 'username', 'password'));
  });

  middleware.core('ajax:basicAuth', function (data, next, done) {
    if (!_.isObject(data.basicAuth)) {
      return done(new TypeError('"basicAuth" config object expected'));
    }

    data.headers = _.extend({
      'Authorization': 'Basic ' + new Buffer(
        data.basicAuth.username + ':' + data.basicAuth.password
      ).toString('base64')
    }, data.headers);

    return middleware.trigger('ajax', data, done);
  });
};
