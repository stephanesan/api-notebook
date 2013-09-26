/* global App */
var _   = require('underscore');
var qs  = require('querystring');
var url = require('url');

/**
 * Return a unique key for storing the access token in localStorage.
 *
 * @param  {Object} options
 * @return {String}
 */
var tokenKey = function (options) {
  return 'oauth2[' + JSON.stringify(options.authorizationUrl) + ']';
};

/**
 * Sanitize OAuth2 option keys.
 *
 * @param  {Object} data
 * @return {Object}
 */
var sanitizeOptions = function (data) {
  var options = _.extend({}, {
    scope:          [],
    validateOnly:   false,
    scopeSeparator: '+'
  }, data);

  if (_.isObject(options.scope)) {
    options.scope = _.toArray(options.scope).join(options.scopeSeparator);
  }

  return options;
};

/**
 * If we already have an access token, we can do a quick validation check.
 *
 * @param {Object}   options
 * @param {Function} done
 */
var validateToken = function (options, done) {
  if (!options.validateUrl || !App.store.has(tokenKey(options))) {
    return done();
  }

  var auth = App.store.get(tokenKey(options));

  App.middleware.trigger('ajax:oauth2', {
    url:              options.validateUrl,
    authorizationUrl: options.authorizationUrl
  }, function (err, xhr) {
    // Check if the response returned any type of error.
    if (err || Math.floor(xhr.status / 100) !== 2) {
      App.store.unset(tokenKey(options));
      return done(err);
    }

    // Bump the updated date.
    auth.updated = Date.now();
    App.store.set(tokenKey(options), auth);

    // Return the auth object extended with the ajax request.
    return done(null, _.extend(auth, {
      xhr: xhr
    }));
  });
};

/**
 * Trigger the full server-side OAuth2 flow.
 *
 * @param {Object}   options
 * @param {Function} done
 */
var oAuth2Flow = function (options, done) {
  var width  = 500;
  var height = 350;
  var left   = (window.screen.availWidth - width) / 2;
  var state  = ('' + Math.random()).substr(2);

  /**
   * Assigns a global variable that the oauth authentication window should
   * be able to access and send the callback data.
   */
  global.authenticateOauth2 = function (href) {
    delete global.authenticateOauth2;
    // Parse the url and prepare to do an ajax request to get the acces token.
    var uri = url.parse(href, true);

    if (uri.query.state !== state) {
      return done(new Error('Oauth2 state mismatch.'));
    }

    if (!uri.query.code) {
      return done(new Error('Oauth2 code missing.'));
    }

    App.middleware.trigger('ajax', {
      url: options.tokenUrl + '?' + qs.stringify({
        'code':          uri.query.code,
        'client_id':     options.clientId,
        'client_secret': options.clientSecret
      }),
      method: 'POST'
    }, function (err, xhr) {
      if (err) { return done(err); }

      var content = qs.parse(xhr.responseText);
      var data    = {
        scope:       options.scope,
        updated:     Date.now(),
        tokenType:   content.token_type,
        accessToken: content.access_token
      };

      // Persist the key in localStorage.
      App.store.set(tokenKey(options), data);

      // The returned body from the ajax request could provide an error string.
      return done(content.error && new Error(content.error), _.extend(data, {
        xhr: xhr
      }));
    });
  };

  // Stringify the query string data.
  var query  = qs.stringify({
    'state':        state,
    'scope':        options.scope,
    'client_id':    options.clientId,
    'redirect_uri': url.resolve(
      global.location, '/authentication/oauth2.html'
    )
  });

  window.open(
    options.authorizationUrl + '?' + query,
    'authenticateOauth2', // Assigning a name stops overlapping windows.
    'left=' + left + ',top=100,width=' + width + ',height=' + height
  );
};

/**
 * Register oauth2 based middleware. Handles oauth2 implicit auth flow, and the
 * normal oauth2 authentication flow when using the notebook proxy server.
 *
 * @param {Object} middleware
 */
module.exports = function (middleware) {
  /**
   * Trigger authentication via OAuth2 in the browser. Valid data properties:
   *
   *   `authorizationUrl` - "https://www.example.com/oauth2/authorize"
   *   `tokenUrl`         - "https://www.example.com/oauth2/token"
   *   `clientId`         - EXAMPLE_CLIENT_ID
   *   `clientSecret`     - EXAMPLE_CLIENT_SECRET *NOT RECOMMENDED*
   *   `scope`            - ["user", "read", "write"]
   *   `scopeSeparator`   - "+" *Github uses a comma*
   *   `validateUrl`      - "http://www.example.com/user/self" *No side effects*
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  middleware.core('authenticate:oauth2', function (data, next, done) {
    var options = sanitizeOptions(data);

    return middleware.trigger(
      'authenticate:oauth2:validate',
      options,
      function (err, auth) {
        // Break before doing the Oauth2 dance if we received an auth object.
        if (err || auth) {
          return done(err, auth);
        }

        // Commit to the whole OAuth2 dance.
        return oAuth2Flow(options, done);
      }
    );
  });

  /**
   * Middleware for checking if the OAuth token is valid without actually
   * triggering the OAuth2 flow.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  middleware.core('authenticate:oauth2:validate', function (data, next, done) {
    return validateToken(sanitizeOptions(data), function (err, auth) {
      return done(err, auth);
    });
  });

  /**
   * Add a new ajax flow for oauth2-based URLs.
   *
   * @param {Object}   data
   * @param {Function} next
   * @param {Function} done
   */
  middleware.core('ajax:oauth2', function (data, next, done) {
    if (!data.authorizationUrl) {
      throw new Error('An authorization url is required to be set');
    }

    if (!App.store.has(tokenKey(data))) {
      throw new Error('No access token is available for this endpoint');
    }

    // Add the access token to the request.
    var uri = url.parse(data.url, true);
    uri.query.access_token = App.store.get(tokenKey(data)).accessToken;
    data.url = url.format(uri);
    delete data.authorizationUrl;

    // Trigger the regular ajax method.
    return middleware.trigger('ajax', data, done);
  });
};
