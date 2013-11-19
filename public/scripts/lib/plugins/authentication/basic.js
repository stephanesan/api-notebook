var _          = require('underscore');
var middleware = require('../../../state/middleware');

/**
 * Authenticate using basic auth.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
middleware.core('authentication:basicAuth', function (data, next, done) {
  if (!_.isString(data.username) || !_.isString(data.password)) {
    return next(new TypeError('Username and password must be defined'));
  }

  return done(null, _.pick(data, 'username', 'password'));
});

/**
 * Trigger an ajax request using basic auth configuration options.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
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
