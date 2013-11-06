/* global App */
var CLIENT_ID    = process.env.GITHUB_CLIENT_ID;
var AUTH_URL     = 'https://github.com/login/oauth/authorize';
var TOKEN_URL    = 'https://github.com/login/oauth/access_token';
var VALIDATE_URL = 'https://api.github.com/user';

/**
 * OAuth2 authentication options object.
 *
 * @type {Object}
 */
var authOpts = {
  scopes:              ['gist'],
  clientId:            CLIENT_ID,
  clientSecret:        '', // Injected by proxy
  accessTokenUri:      TOKEN_URL,
  authorizationUri:    AUTH_URL,
  authorizationGrants: 'code'
};

/**
 * Generate a custom store for the Github OAuth2 response tokens.
 *
 * @type {Object}
 */
var oauth2Store = App.store.customStore('github');

/**
 * When a change occurs *and* we are already authenticated, we can automatically
 * save the update to a gist.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var changePlugin = function (data, next, done) {
  if (data.isNew() || !data.isAuthenticated() || !data.isOwner()) {
    return done();
  }

  return setTimeout(App._.bind(data.save, data, done), 600);
};

/**
 * Get the authenticated user id and title by making a request on the users
 * behalf.
 *
 * @param {Function} done
 */
var authenticatedUserId = function (done) {
  App.middleware.trigger('ajax:oauth2', {
    url:    VALIDATE_URL,
    oauth2: oauth2Store.toJSON()
  }, function (err, xhr) {
    var content;

    if (err) { return done(err); }

    try {
      content = JSON.parse(xhr.responseText);
    } catch (e) {
      return done(e);
    }

    return done(null, {
      userId:    content.id,
      userTitle: content.login + ' @ Github'
    });
  });
};

/**
 * Authenticate with the github oauth endpoint. Since we are unlikely to include
 * our client secret with the client code, you'll probably want to include the
 * proxy plugin (`./proxy.js`).
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var authenticatePlugin = function (data, next, done) {
  App.middleware.trigger('authenticate:oauth2', authOpts, function (err, auth) {
    if (err) { return next(err); }

    oauth2Store.set(auth);

    return authenticatedUserId(done);
  });
};

/**
 * Check whether we are authenticated to Github.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var authenticatedPlugin = function (data, next, done) {
  return authenticatedUserId(done);
};

/**
 * Loads a single gist id from Github and checks whether it holds our notebook.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var loadPlugin = function (data, next, done) {
  if (!data.id) {
    return next();
  }

  App.middleware.trigger('ajax', {
    url: 'https://api.github.com/gists/' + data.id,
    method: 'GET'
  }, function (err, xhr) {
    var content;

    try {
      content = JSON.parse(xhr.responseText);
    } catch (e) {
      return next(e);
    }

    if (!content || !content.files || !content.files['notebook.md']) {
      return next(new Error('Unexpected JSON response'));
    }

    data.id       = content.id;
    data.ownerId  = content.user && content.user.id;
    data.contents = content.files['notebook.md'].content;
    return done();
  });
};

/**
 * Save the notebook into a single Github gist for persistence. If the user is
 * not yet authenticated, we'll attempt to do a smoother on boarding by showing
 * a help dialog.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var savePlugin = function (data, next, done) {
  if (!data.isAuthenticated()) {
    var authenticated = false;

    return App.middleware.trigger('ui:modal', {
      title:   'Authenticate with Github',
      content: [
        '<p>Tell the user something useful here.</p>',
        '<p class="text-center">',
        '<button class="btn" data-github>Connect to Github</button>',
        '</p>'
      ].join('\n'),
      afterRender: function (modal) {
        // Set the `authenticated` flag when the button is clicked.
        App.Library.Backbone.$(modal.el)
          .on('click', '[data-github]', function () {
            authenticated = true;
            return data.authenticate(modal.close);
          });
      }
    }, function (err) {
      if (err) { return done(err); }

      // Close the first save attempt and start another now that we should be
      // authenticated to Github.
      return done(), authenticated && data.save();
    });
  }

  if (!data.isOwner()) {
    return done(), data.clone();
  }

  App.middleware.trigger('ajax:oauth2', {
    url: 'https://api.github.com/gists' + (data.id ? '/' + data.id : ''),
    method: data.id ? 'PATCH' : 'POST',
    data: JSON.stringify({
      files: {
        'notebook.md': {
          content: data.contents
        }
      }
    }),
    oauth2: oauth2Store.toJSON()
  }, function (err, xhr) {
    if (err) { return next(err); }

    // The status does not equal a sucessful patch or creation.
    if (xhr.status !== 200 && xhr.status !== 201) {
      return next(new Error('Request failed'));
    }

    try {
      var content = JSON.parse(xhr.responseText);
      data.id      = content.id;
      data.ownerId = content.user && content.user.id;
    } catch (e) {
      return next(e);
    }

    return next();
  });
};

/**
 * A { key: function } map of all middleware used in the plugin.
 *
 * @type {Object}
 */
var plugins = {
  'persistence:change':        changePlugin,
  'persistence:authenticate':  authenticatePlugin,
  'persistence:authenticated': authenticatedPlugin,
  'persistence:load':          loadPlugin,
  'persistence:save':          savePlugin
};

/**
 * Registers all the neccessary handlers for Github gist persistence.
 *
 * @param {Object} middleware
 */
exports.attach = function (middleware) {
  middleware.use(plugins);
};

/**
 * Detaches all middleware used by gist persistence.
 *
 * @param {Object} middleware
 */
exports.detach = function (middleware) {
  middleware.disuse(plugins);
};
