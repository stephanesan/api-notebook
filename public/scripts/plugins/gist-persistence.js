/* global App */
var _            = App._;
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
  clientId:            process.env.plugins.github.clientId,
  clientSecret:        '',
  accessTokenUri:      TOKEN_URL,
  authorizationUri:    AUTH_URL,
  authorizationGrants: 'code',
  modal: {
    title: 'Authenticate Notebook',
    content: [
      '<p>Notebooks are saved as gists to your GitHub account.</p>',
      '<p>',
      'Please authorize this application in order to ',
      'save, edit, and share your notebooks.',
      '</p>'
    ].join('\n'),
    btnText: 'Authorize With GitHub'
  }
};

/**
 * Check whether a gist contents are a valid notebook.
 *
 * @param  {Object}  content
 * @return {Boolean}
 */
var isNotebookContent = function (content) {
  return content && content.files && content.files['notebook.md'];
};

/**
 * Parse the link header for the specific links.
 *
 * @param  {String} header
 * @return {Object}
 */
var parseLinkHeader = function (header) {
  var obj = {};

  _.each(header.split(', '), function (part) {
    var matches = /^<([^>]+)>; *rel="([^"]+)"$/.exec(part);
    return matches && (obj[matches[2]] = matches[1]);
  });

  return obj;
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

  return setTimeout(_.bind(data.save, data, done), 600);
};

/**
 * Get the authenticated user id and title by making a request on the users
 * behalf.
 *
 * @param {Function} done
 */
var authenticatedUserId = function (done) {
  if (!oauth2Store.has('accessToken')) {
    return done(new Error('No known access token'));
  }

  App.middleware.trigger('ajax:oauth2', {
    url:    VALIDATE_URL,
    oauth2: oauth2Store.toJSON()
  }, function (err, xhr) {
    var content;

    // Proxy errors back to the user.
    if (err) { return done(err); }

    // Check if the connection was rejected because of invalid credentials.
    if (xhr.readyState === 4 && xhr.status !== 200) {
      oauth2Store.clear();
      return done(new Error('Invalid credentials'));
    }

    try {
      content = JSON.parse(xhr.responseText);
    } catch (e) {
      return done(e);
    }

    return done(null, {
      userId:    content.id,
      userTitle: content.login
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
 * Unauthenticate the user.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var unauthenticatePlugin = function (data, next, done) {
  oauth2Store.clear();

  return done();
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

    if (!isNotebookContent(content)) {
      return next(new Error('Unexpected notebook response'));
    }

    data.id        = content.id;
    data.ownerId   = content.user && content.user.id;
    data.contents  = content.files['notebook.md'].content;
    data.updatedAt = new Date(content.updated_at);
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
    return data.authenticate(function (err) {
      if (err) { return next(err); }

      return done(), data.save();
    });
  }

  if (!data.isOwner()) {
    return done(), data.clone(), data.save();
  }

  App.middleware.trigger('ajax:oauth2', {
    url: 'https://api.github.com/gists' + (data.id ? '/' + data.id : ''),
    method: data.id ? 'PATCH' : 'POST',
    data: JSON.stringify({
      description: data.meta.title,
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

    return done();
  });
};

/**
 * Push all suitable gists into the list of notebooks.
 *
 * @param {Array}    list
 * @param {Function} next
 * @param {Function} done
 */
var listPlugin = function (list, next, done) {
  (function recurse (link) {
    App.middleware.trigger('ajax:oauth2', {
      url:    link,
      method: 'GET',
      oauth2: oauth2Store.toJSON()
    }, function (err, xhr) {
      if (err) { return done(err); }

      var nextLink = parseLinkHeader(xhr.getResponseHeader('link') || '').next;
      var response;

      try {
        response = JSON.parse(xhr.responseText);
      } catch (e) {
        return next(e);
      }

      if (typeof response !== 'object') {
        return next(new Error('Unexpected response'));
      }

      _.each(response, function (content) {
        if (!isNotebookContent(content)) { return; }

        list.push({
          id: content.id,
          updatedAt: new Date(content.updated_at),
          meta: {
            title: content.description
          }
        });
      });

      // Proceed to the next link or return done.
      return nextLink ? recurse(nextLink) : done();
    });
  })('https://api.github.com/gists');
};

/**
 * Delete a single notebook from Github gists.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var deletePlugin = function (data, next, done) {
  return App.middleware.trigger('ajax:oauth2', {
    url:    'https://api.github.com/gists/' + data.id,
    method: 'DELETE',
    oauth2: oauth2Store.toJSON()
  }, done);
};

/**
 * Set the config option for the authentication text.
 */
App.config.set('authenticateText', 'Connect using Github');

/**
 * A { key: function } map of all middleware used in the plugin.
 *
 * @type {Object}
 */
module.exports = {
  'persistence:change':         changePlugin,
  'persistence:authenticate':   authenticatePlugin,
  'persistence:unauthenticate': unauthenticatePlugin,
  'persistence:authenticated':  authenticatedPlugin,
  'persistence:load':           loadPlugin,
  'persistence:save':           savePlugin,
  'persistence:list':           listPlugin,
  'persistence:delete':         deletePlugin
};
