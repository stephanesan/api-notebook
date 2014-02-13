var _          = require('underscore');
var middleware = require('../../../state/middleware');

/**
 * Authenticate using basic auth.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
middleware.register('authentication:basicAuth', function (data, next, done) {
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
 */
middleware.register('ajax', function (data, next) {
  // Check we have a basic auth object before mixing in our credentials.
  if (_.isObject(data.basicAuth)) {
    data.headers = _.extend({
      'Authorization': 'Basic ' + new Buffer(
        data.basicAuth.username + ':' + data.basicAuth.password
      ).toString('base64')
    }, data.headers);
  }

  return next(null, data);
});
