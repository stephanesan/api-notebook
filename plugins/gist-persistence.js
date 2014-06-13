!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var n;"undefined"!=typeof window?n=window:"undefined"!=typeof global?n=global:"undefined"!=typeof self&&(n=self),n.gistPersistencePlugin=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/* global App */
var _             = App._;
var AUTH_URL      = 'https://github.com/login/oauth/authorize';
var TOKEN_URL     = 'https://github.com/login/oauth/access_token';
var CLIENT_ID     = {}.github.clientId;
var CLIENT_SECRET = {}.github.clientSecret;

/**
 * OAuth2 authentication options object.
 *
 * @type {Object}
 */
var AUTH_OPTIONS = {
  scopes:              ['gist'],
  type:                'OAuth 2.0',
  clientId:            CLIENT_ID,
  clientSecret:        CLIENT_SECRET,
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
 * Make saves to the server less frequently. Handles multiple notebooks saving
 * concurrently.
 *
 * @type {Function}
 */
var debounceSave = (function (hash) {
  return function (data) {
    // Remove any previously queued save request for the same resource.
    if (hash[data.id]) {
      clearTimeout(hash[data.id]);
      delete hash[data.id];
    }

    hash[data.id] = setTimeout(function () {
      return data.shouldSave() && data.save();
    }, 600);
  };
})({});

/**
 * When a change occurs *and* we are already authenticated, we can automatically
 * save the update to a gist.
 *
 * @param {Object}   data
 * @param {Function} next
 * @param {Function} done
 */
var changePlugin = function (data, next, done) {
  debounceSave(data);

  return done();
};

/**
 * Get the authenticated user id and title by making a request on the users
 * behalf.
 *
 * @param {Function} done
 */
var authenticatedUserId = function (done) {
  if (!oauth2Store.has('accessToken')) {
    return done(new Error('No access token'));
  }

  // Make a request to the check authorization url, which doesn't incur any
  // rate limiting penalties.
  App.middleware.trigger('ajax:basicAuth', {
    url: 'https://api.github.com/applications/' + CLIENT_ID + '/tokens/' +
      oauth2Store.get('accessToken'),
    proxy: false,
    basicAuth: {
      username: CLIENT_ID,
      password: CLIENT_SECRET
    }
  }, function (err, xhr) {
    var content;

    // Proxy any errors back to the user.
    if (err) { return done(err); }

    // Check if the connection was rejected because of invalid credentials.
    if (xhr.status === 404) {
      oauth2Store.clear();
      return done(new Error('Invalid credentials'));
    }

    try {
      content = JSON.parse(xhr.responseText);
    } catch (e) {
      return done(e);
    }

    return done(null, {
      userId:    content.user.id,
      userTitle: content.user.login
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
  App.middleware.trigger('authenticate', AUTH_OPTIONS, function (err, auth) {
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

  App.middleware.trigger('ajax:oauth2', {
    // Add the application client id and secret to load requests to avoid rate
    // limiting in the case that the user is unauthenticated.
    url:    'https://api.github.com/gists/' + data.id + '?_=' + Date.now(),
    proxy:  false,
    method: 'GET',
    oauth2: oauth2Store.toJSON()
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
    data.ownerId   = content.owner && content.owner.id;
    data.content   = content.files['notebook.md'].content;
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

  App.middleware.trigger('ajax:oauth2', {
    url:    'https://api.github.com/gists' + (data.id ? '/' + data.id : ''),
    proxy:  false,
    method: data.id ? 'PATCH' : 'POST',
    data: JSON.stringify({
      description: data.meta.title,
      files: {
        'notebook.md': {
          content: data.content
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
      data.ownerId = content.owner && content.owner.id;
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
  if (!oauth2Store.has('accessToken')) {
    return done(new Error('Listing notebooks requires authentication'));
  }

  (function recurse (link) {
    App.middleware.trigger('ajax:oauth2', {
      url:    link + (link.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now(),
      proxy:  false,
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
var removePlugin = function (data, next, done) {
  return App.middleware.trigger('ajax:oauth2', {
    url:    'https://api.github.com/gists/' + data.id,
    proxy:  false,
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
  'persistence:remove':         removePlugin
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL3B1YmxpYy9zY3JpcHRzL3BsdWdpbnMvZ2lzdC1wZXJzaXN0ZW5jZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBnbG9iYWwgQXBwICovXG52YXIgXyAgICAgICAgICAgICA9IEFwcC5fO1xudmFyIEFVVEhfVVJMICAgICAgPSAnaHR0cHM6Ly9naXRodWIuY29tL2xvZ2luL29hdXRoL2F1dGhvcml6ZSc7XG52YXIgVE9LRU5fVVJMICAgICA9ICdodHRwczovL2dpdGh1Yi5jb20vbG9naW4vb2F1dGgvYWNjZXNzX3Rva2VuJztcbnZhciBDTElFTlRfSUQgICAgID0ge30uZ2l0aHViLmNsaWVudElkO1xudmFyIENMSUVOVF9TRUNSRVQgPSB7fS5naXRodWIuY2xpZW50U2VjcmV0O1xuXG4vKipcbiAqIE9BdXRoMiBhdXRoZW50aWNhdGlvbiBvcHRpb25zIG9iamVjdC5cbiAqXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG52YXIgQVVUSF9PUFRJT05TID0ge1xuICBzY29wZXM6ICAgICAgICAgICAgICBbJ2dpc3QnXSxcbiAgdHlwZTogICAgICAgICAgICAgICAgJ09BdXRoIDIuMCcsXG4gIGNsaWVudElkOiAgICAgICAgICAgIENMSUVOVF9JRCxcbiAgY2xpZW50U2VjcmV0OiAgICAgICAgQ0xJRU5UX1NFQ1JFVCxcbiAgYWNjZXNzVG9rZW5Vcmk6ICAgICAgVE9LRU5fVVJMLFxuICBhdXRob3JpemF0aW9uVXJpOiAgICBBVVRIX1VSTCxcbiAgYXV0aG9yaXphdGlvbkdyYW50czogJ2NvZGUnLFxuICBtb2RhbDoge1xuICAgIHRpdGxlOiAnQXV0aGVudGljYXRlIE5vdGVib29rJyxcbiAgICBjb250ZW50OiBbXG4gICAgICAnPHA+Tm90ZWJvb2tzIGFyZSBzYXZlZCBhcyBnaXN0cyB0byB5b3VyIEdpdEh1YiBhY2NvdW50LjwvcD4nLFxuICAgICAgJzxwPicsXG4gICAgICAnUGxlYXNlIGF1dGhvcml6ZSB0aGlzIGFwcGxpY2F0aW9uIGluIG9yZGVyIHRvICcsXG4gICAgICAnc2F2ZSwgZWRpdCwgYW5kIHNoYXJlIHlvdXIgbm90ZWJvb2tzLicsXG4gICAgICAnPC9wPidcbiAgICBdLmpvaW4oJ1xcbicpLFxuICAgIGJ0blRleHQ6ICdBdXRob3JpemUgV2l0aCBHaXRIdWInXG4gIH1cbn07XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBhIGdpc3QgY29udGVudHMgYXJlIGEgdmFsaWQgbm90ZWJvb2suXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgY29udGVudFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xudmFyIGlzTm90ZWJvb2tDb250ZW50ID0gZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgcmV0dXJuIGNvbnRlbnQgJiYgY29udGVudC5maWxlcyAmJiBjb250ZW50LmZpbGVzWydub3RlYm9vay5tZCddO1xufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgbGluayBoZWFkZXIgZm9yIHRoZSBzcGVjaWZpYyBsaW5rcy5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9IGhlYWRlclxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG52YXIgcGFyc2VMaW5rSGVhZGVyID0gZnVuY3Rpb24gKGhlYWRlcikge1xuICB2YXIgb2JqID0ge307XG5cbiAgXy5lYWNoKGhlYWRlci5zcGxpdCgnLCAnKSwgZnVuY3Rpb24gKHBhcnQpIHtcbiAgICB2YXIgbWF0Y2hlcyA9IC9ePChbXj5dKyk+OyAqcmVsPVwiKFteXCJdKylcIiQvLmV4ZWMocGFydCk7XG4gICAgcmV0dXJuIG1hdGNoZXMgJiYgKG9ialttYXRjaGVzWzJdXSA9IG1hdGNoZXNbMV0pO1xuICB9KTtcblxuICByZXR1cm4gb2JqO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhIGN1c3RvbSBzdG9yZSBmb3IgdGhlIEdpdGh1YiBPQXV0aDIgcmVzcG9uc2UgdG9rZW5zLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBvYXV0aDJTdG9yZSA9IEFwcC5zdG9yZS5jdXN0b21TdG9yZSgnZ2l0aHViJyk7XG5cbi8qKlxuICogTWFrZSBzYXZlcyB0byB0aGUgc2VydmVyIGxlc3MgZnJlcXVlbnRseS4gSGFuZGxlcyBtdWx0aXBsZSBub3RlYm9va3Mgc2F2aW5nXG4gKiBjb25jdXJyZW50bHkuXG4gKlxuICogQHR5cGUge0Z1bmN0aW9ufVxuICovXG52YXIgZGVib3VuY2VTYXZlID0gKGZ1bmN0aW9uIChoYXNoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAoZGF0YSkge1xuICAgIC8vIFJlbW92ZSBhbnkgcHJldmlvdXNseSBxdWV1ZWQgc2F2ZSByZXF1ZXN0IGZvciB0aGUgc2FtZSByZXNvdXJjZS5cbiAgICBpZiAoaGFzaFtkYXRhLmlkXSkge1xuICAgICAgY2xlYXJUaW1lb3V0KGhhc2hbZGF0YS5pZF0pO1xuICAgICAgZGVsZXRlIGhhc2hbZGF0YS5pZF07XG4gICAgfVxuXG4gICAgaGFzaFtkYXRhLmlkXSA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIGRhdGEuc2hvdWxkU2F2ZSgpICYmIGRhdGEuc2F2ZSgpO1xuICAgIH0sIDYwMCk7XG4gIH07XG59KSh7fSk7XG5cbi8qKlxuICogV2hlbiBhIGNoYW5nZSBvY2N1cnMgKmFuZCogd2UgYXJlIGFscmVhZHkgYXV0aGVudGljYXRlZCwgd2UgY2FuIGF1dG9tYXRpY2FsbHlcbiAqIHNhdmUgdGhlIHVwZGF0ZSB0byBhIGdpc3QuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9ICAgZGF0YVxuICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZG9uZVxuICovXG52YXIgY2hhbmdlUGx1Z2luID0gZnVuY3Rpb24gKGRhdGEsIG5leHQsIGRvbmUpIHtcbiAgZGVib3VuY2VTYXZlKGRhdGEpO1xuXG4gIHJldHVybiBkb25lKCk7XG59O1xuXG4vKipcbiAqIEdldCB0aGUgYXV0aGVudGljYXRlZCB1c2VyIGlkIGFuZCB0aXRsZSBieSBtYWtpbmcgYSByZXF1ZXN0IG9uIHRoZSB1c2Vyc1xuICogYmVoYWxmLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGRvbmVcbiAqL1xudmFyIGF1dGhlbnRpY2F0ZWRVc2VySWQgPSBmdW5jdGlvbiAoZG9uZSkge1xuICBpZiAoIW9hdXRoMlN0b3JlLmhhcygnYWNjZXNzVG9rZW4nKSkge1xuICAgIHJldHVybiBkb25lKG5ldyBFcnJvcignTm8gYWNjZXNzIHRva2VuJykpO1xuICB9XG5cbiAgLy8gTWFrZSBhIHJlcXVlc3QgdG8gdGhlIGNoZWNrIGF1dGhvcml6YXRpb24gdXJsLCB3aGljaCBkb2Vzbid0IGluY3VyIGFueVxuICAvLyByYXRlIGxpbWl0aW5nIHBlbmFsdGllcy5cbiAgQXBwLm1pZGRsZXdhcmUudHJpZ2dlcignYWpheDpiYXNpY0F1dGgnLCB7XG4gICAgdXJsOiAnaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9hcHBsaWNhdGlvbnMvJyArIENMSUVOVF9JRCArICcvdG9rZW5zLycgK1xuICAgICAgb2F1dGgyU3RvcmUuZ2V0KCdhY2Nlc3NUb2tlbicpLFxuICAgIHByb3h5OiBmYWxzZSxcbiAgICBiYXNpY0F1dGg6IHtcbiAgICAgIHVzZXJuYW1lOiBDTElFTlRfSUQsXG4gICAgICBwYXNzd29yZDogQ0xJRU5UX1NFQ1JFVFxuICAgIH1cbiAgfSwgZnVuY3Rpb24gKGVyciwgeGhyKSB7XG4gICAgdmFyIGNvbnRlbnQ7XG5cbiAgICAvLyBQcm94eSBhbnkgZXJyb3JzIGJhY2sgdG8gdGhlIHVzZXIuXG4gICAgaWYgKGVycikgeyByZXR1cm4gZG9uZShlcnIpOyB9XG5cbiAgICAvLyBDaGVjayBpZiB0aGUgY29ubmVjdGlvbiB3YXMgcmVqZWN0ZWQgYmVjYXVzZSBvZiBpbnZhbGlkIGNyZWRlbnRpYWxzLlxuICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgIG9hdXRoMlN0b3JlLmNsZWFyKCk7XG4gICAgICByZXR1cm4gZG9uZShuZXcgRXJyb3IoJ0ludmFsaWQgY3JlZGVudGlhbHMnKSk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnRlbnQgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBkb25lKGUpO1xuICAgIH1cblxuICAgIHJldHVybiBkb25lKG51bGwsIHtcbiAgICAgIHVzZXJJZDogICAgY29udGVudC51c2VyLmlkLFxuICAgICAgdXNlclRpdGxlOiBjb250ZW50LnVzZXIubG9naW5cbiAgICB9KTtcbiAgfSk7XG59O1xuXG4vKipcbiAqIEF1dGhlbnRpY2F0ZSB3aXRoIHRoZSBnaXRodWIgb2F1dGggZW5kcG9pbnQuIFNpbmNlIHdlIGFyZSB1bmxpa2VseSB0byBpbmNsdWRlXG4gKiBvdXIgY2xpZW50IHNlY3JldCB3aXRoIHRoZSBjbGllbnQgY29kZSwgeW91J2xsIHByb2JhYmx5IHdhbnQgdG8gaW5jbHVkZSB0aGVcbiAqIHByb3h5IHBsdWdpbiAoYC4vcHJveHkuanNgKS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gICBkYXRhXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBkb25lXG4gKi9cbnZhciBhdXRoZW50aWNhdGVQbHVnaW4gPSBmdW5jdGlvbiAoZGF0YSwgbmV4dCwgZG9uZSkge1xuICBBcHAubWlkZGxld2FyZS50cmlnZ2VyKCdhdXRoZW50aWNhdGUnLCBBVVRIX09QVElPTlMsIGZ1bmN0aW9uIChlcnIsIGF1dGgpIHtcbiAgICBpZiAoZXJyKSB7IHJldHVybiBuZXh0KGVycik7IH1cblxuICAgIG9hdXRoMlN0b3JlLnNldChhdXRoKTtcblxuICAgIHJldHVybiBhdXRoZW50aWNhdGVkVXNlcklkKGRvbmUpO1xuICB9KTtcbn07XG5cbi8qKlxuICogVW5hdXRoZW50aWNhdGUgdGhlIHVzZXIuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9ICAgZGF0YVxuICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZG9uZVxuICovXG52YXIgdW5hdXRoZW50aWNhdGVQbHVnaW4gPSBmdW5jdGlvbiAoZGF0YSwgbmV4dCwgZG9uZSkge1xuICBvYXV0aDJTdG9yZS5jbGVhcigpO1xuXG4gIHJldHVybiBkb25lKCk7XG59O1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgd2UgYXJlIGF1dGhlbnRpY2F0ZWQgdG8gR2l0aHViLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGRhdGFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGRvbmVcbiAqL1xudmFyIGF1dGhlbnRpY2F0ZWRQbHVnaW4gPSBmdW5jdGlvbiAoZGF0YSwgbmV4dCwgZG9uZSkge1xuICByZXR1cm4gYXV0aGVudGljYXRlZFVzZXJJZChkb25lKTtcbn07XG5cbi8qKlxuICogTG9hZHMgYSBzaW5nbGUgZ2lzdCBpZCBmcm9tIEdpdGh1YiBhbmQgY2hlY2tzIHdoZXRoZXIgaXQgaG9sZHMgb3VyIG5vdGVib29rLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSAgIGRhdGFcbiAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGRvbmVcbiAqL1xudmFyIGxvYWRQbHVnaW4gPSBmdW5jdGlvbiAoZGF0YSwgbmV4dCwgZG9uZSkge1xuICBpZiAoIWRhdGEuaWQpIHtcbiAgICByZXR1cm4gbmV4dCgpO1xuICB9XG5cbiAgQXBwLm1pZGRsZXdhcmUudHJpZ2dlcignYWpheDpvYXV0aDInLCB7XG4gICAgLy8gQWRkIHRoZSBhcHBsaWNhdGlvbiBjbGllbnQgaWQgYW5kIHNlY3JldCB0byBsb2FkIHJlcXVlc3RzIHRvIGF2b2lkIHJhdGVcbiAgICAvLyBsaW1pdGluZyBpbiB0aGUgY2FzZSB0aGF0IHRoZSB1c2VyIGlzIHVuYXV0aGVudGljYXRlZC5cbiAgICB1cmw6ICAgICdodHRwczovL2FwaS5naXRodWIuY29tL2dpc3RzLycgKyBkYXRhLmlkICsgJz9fPScgKyBEYXRlLm5vdygpLFxuICAgIHByb3h5OiAgZmFsc2UsXG4gICAgbWV0aG9kOiAnR0VUJyxcbiAgICBvYXV0aDI6IG9hdXRoMlN0b3JlLnRvSlNPTigpXG4gIH0sIGZ1bmN0aW9uIChlcnIsIHhocikge1xuICAgIHZhciBjb250ZW50O1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnRlbnQgPSBKU09OLnBhcnNlKHhoci5yZXNwb25zZVRleHQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBuZXh0KGUpO1xuICAgIH1cblxuICAgIGlmICghaXNOb3RlYm9va0NvbnRlbnQoY29udGVudCkpIHtcbiAgICAgIHJldHVybiBuZXh0KG5ldyBFcnJvcignVW5leHBlY3RlZCBub3RlYm9vayByZXNwb25zZScpKTtcbiAgICB9XG5cbiAgICBkYXRhLmlkICAgICAgICA9IGNvbnRlbnQuaWQ7XG4gICAgZGF0YS5vd25lcklkICAgPSBjb250ZW50Lm93bmVyICYmIGNvbnRlbnQub3duZXIuaWQ7XG4gICAgZGF0YS5jb250ZW50ICAgPSBjb250ZW50LmZpbGVzWydub3RlYm9vay5tZCddLmNvbnRlbnQ7XG4gICAgZGF0YS51cGRhdGVkQXQgPSBuZXcgRGF0ZShjb250ZW50LnVwZGF0ZWRfYXQpO1xuICAgIHJldHVybiBkb25lKCk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBTYXZlIHRoZSBub3RlYm9vayBpbnRvIGEgc2luZ2xlIEdpdGh1YiBnaXN0IGZvciBwZXJzaXN0ZW5jZS4gSWYgdGhlIHVzZXIgaXNcbiAqIG5vdCB5ZXQgYXV0aGVudGljYXRlZCwgd2UnbGwgYXR0ZW1wdCB0byBkbyBhIHNtb290aGVyIG9uIGJvYXJkaW5nIGJ5IHNob3dpbmdcbiAqIGEgaGVscCBkaWFsb2cuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9ICAgZGF0YVxuICogQHBhcmFtIHtGdW5jdGlvbn0gbmV4dFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZG9uZVxuICovXG52YXIgc2F2ZVBsdWdpbiA9IGZ1bmN0aW9uIChkYXRhLCBuZXh0LCBkb25lKSB7XG4gIGlmICghZGF0YS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgIHJldHVybiBkYXRhLmF1dGhlbnRpY2F0ZShmdW5jdGlvbiAoZXJyKSB7XG4gICAgICBpZiAoZXJyKSB7IHJldHVybiBuZXh0KGVycik7IH1cblxuICAgICAgcmV0dXJuIGRvbmUoKSwgZGF0YS5zYXZlKCk7XG4gICAgfSk7XG4gIH1cblxuICBBcHAubWlkZGxld2FyZS50cmlnZ2VyKCdhamF4Om9hdXRoMicsIHtcbiAgICB1cmw6ICAgICdodHRwczovL2FwaS5naXRodWIuY29tL2dpc3RzJyArIChkYXRhLmlkID8gJy8nICsgZGF0YS5pZCA6ICcnKSxcbiAgICBwcm94eTogIGZhbHNlLFxuICAgIG1ldGhvZDogZGF0YS5pZCA/ICdQQVRDSCcgOiAnUE9TVCcsXG4gICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgZGVzY3JpcHRpb246IGRhdGEubWV0YS50aXRsZSxcbiAgICAgIGZpbGVzOiB7XG4gICAgICAgICdub3RlYm9vay5tZCc6IHtcbiAgICAgICAgICBjb250ZW50OiBkYXRhLmNvbnRlbnRcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pLFxuICAgIG9hdXRoMjogb2F1dGgyU3RvcmUudG9KU09OKClcbiAgfSwgZnVuY3Rpb24gKGVyciwgeGhyKSB7XG4gICAgaWYgKGVycikgeyByZXR1cm4gbmV4dChlcnIpOyB9XG5cbiAgICAvLyBUaGUgc3RhdHVzIGRvZXMgbm90IGVxdWFsIGEgc3VjZXNzZnVsIHBhdGNoIG9yIGNyZWF0aW9uLlxuICAgIGlmICh4aHIuc3RhdHVzICE9PSAyMDAgJiYgeGhyLnN0YXR1cyAhPT0gMjAxKSB7XG4gICAgICByZXR1cm4gbmV4dChuZXcgRXJyb3IoJ1JlcXVlc3QgZmFpbGVkJykpO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICB2YXIgY29udGVudCA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICBkYXRhLmlkICAgICAgPSBjb250ZW50LmlkO1xuICAgICAgZGF0YS5vd25lcklkID0gY29udGVudC5vd25lciAmJiBjb250ZW50Lm93bmVyLmlkO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJldHVybiBuZXh0KGUpO1xuICAgIH1cblxuICAgIHJldHVybiBkb25lKCk7XG4gIH0pO1xufTtcblxuLyoqXG4gKiBQdXNoIGFsbCBzdWl0YWJsZSBnaXN0cyBpbnRvIHRoZSBsaXN0IG9mIG5vdGVib29rcy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSAgICBsaXN0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBkb25lXG4gKi9cbnZhciBsaXN0UGx1Z2luID0gZnVuY3Rpb24gKGxpc3QsIG5leHQsIGRvbmUpIHtcbiAgaWYgKCFvYXV0aDJTdG9yZS5oYXMoJ2FjY2Vzc1Rva2VuJykpIHtcbiAgICByZXR1cm4gZG9uZShuZXcgRXJyb3IoJ0xpc3Rpbmcgbm90ZWJvb2tzIHJlcXVpcmVzIGF1dGhlbnRpY2F0aW9uJykpO1xuICB9XG5cbiAgKGZ1bmN0aW9uIHJlY3Vyc2UgKGxpbmspIHtcbiAgICBBcHAubWlkZGxld2FyZS50cmlnZ2VyKCdhamF4Om9hdXRoMicsIHtcbiAgICAgIHVybDogICAgbGluayArIChsaW5rLmluZGV4T2YoJz8nKSA+IC0xID8gJyYnIDogJz8nKSArICdfPScgKyBEYXRlLm5vdygpLFxuICAgICAgcHJveHk6ICBmYWxzZSxcbiAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICBvYXV0aDI6IG9hdXRoMlN0b3JlLnRvSlNPTigpXG4gICAgfSwgZnVuY3Rpb24gKGVyciwgeGhyKSB7XG4gICAgICBpZiAoZXJyKSB7IHJldHVybiBkb25lKGVycik7IH1cblxuICAgICAgdmFyIG5leHRMaW5rID0gcGFyc2VMaW5rSGVhZGVyKHhoci5nZXRSZXNwb25zZUhlYWRlcignbGluaycpIHx8ICcnKS5uZXh0O1xuICAgICAgdmFyIHJlc3BvbnNlO1xuXG4gICAgICB0cnkge1xuICAgICAgICByZXNwb25zZSA9IEpTT04ucGFyc2UoeGhyLnJlc3BvbnNlVGV4dCk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBuZXh0KGUpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIHJlc3BvbnNlICE9PSAnb2JqZWN0Jykge1xuICAgICAgICByZXR1cm4gbmV4dChuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgcmVzcG9uc2UnKSk7XG4gICAgICB9XG5cbiAgICAgIF8uZWFjaChyZXNwb25zZSwgZnVuY3Rpb24gKGNvbnRlbnQpIHtcbiAgICAgICAgaWYgKCFpc05vdGVib29rQ29udGVudChjb250ZW50KSkgeyByZXR1cm47IH1cblxuICAgICAgICBsaXN0LnB1c2goe1xuICAgICAgICAgIGlkOiBjb250ZW50LmlkLFxuICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoY29udGVudC51cGRhdGVkX2F0KSxcbiAgICAgICAgICBtZXRhOiB7XG4gICAgICAgICAgICB0aXRsZTogY29udGVudC5kZXNjcmlwdGlvblxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgICAgLy8gUHJvY2VlZCB0byB0aGUgbmV4dCBsaW5rIG9yIHJldHVybiBkb25lLlxuICAgICAgcmV0dXJuIG5leHRMaW5rID8gcmVjdXJzZShuZXh0TGluaykgOiBkb25lKCk7XG4gICAgfSk7XG4gIH0pKCdodHRwczovL2FwaS5naXRodWIuY29tL2dpc3RzJyk7XG59O1xuXG4vKipcbiAqIERlbGV0ZSBhIHNpbmdsZSBub3RlYm9vayBmcm9tIEdpdGh1YiBnaXN0cy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gICBkYXRhXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBuZXh0XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBkb25lXG4gKi9cbnZhciByZW1vdmVQbHVnaW4gPSBmdW5jdGlvbiAoZGF0YSwgbmV4dCwgZG9uZSkge1xuICByZXR1cm4gQXBwLm1pZGRsZXdhcmUudHJpZ2dlcignYWpheDpvYXV0aDInLCB7XG4gICAgdXJsOiAgICAnaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9naXN0cy8nICsgZGF0YS5pZCxcbiAgICBwcm94eTogIGZhbHNlLFxuICAgIG1ldGhvZDogJ0RFTEVURScsXG4gICAgb2F1dGgyOiBvYXV0aDJTdG9yZS50b0pTT04oKVxuICB9LCBkb25lKTtcbn07XG5cbi8qKlxuICogU2V0IHRoZSBjb25maWcgb3B0aW9uIGZvciB0aGUgYXV0aGVudGljYXRpb24gdGV4dC5cbiAqL1xuQXBwLmNvbmZpZy5zZXQoJ2F1dGhlbnRpY2F0ZVRleHQnLCAnQ29ubmVjdCB1c2luZyBHaXRodWInKTtcblxuLyoqXG4gKiBBIHsga2V5OiBmdW5jdGlvbiB9IG1hcCBvZiBhbGwgbWlkZGxld2FyZSB1c2VkIGluIHRoZSBwbHVnaW4uXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICdwZXJzaXN0ZW5jZTpjaGFuZ2UnOiAgICAgICAgIGNoYW5nZVBsdWdpbixcbiAgJ3BlcnNpc3RlbmNlOmF1dGhlbnRpY2F0ZSc6ICAgYXV0aGVudGljYXRlUGx1Z2luLFxuICAncGVyc2lzdGVuY2U6dW5hdXRoZW50aWNhdGUnOiB1bmF1dGhlbnRpY2F0ZVBsdWdpbixcbiAgJ3BlcnNpc3RlbmNlOmF1dGhlbnRpY2F0ZWQnOiAgYXV0aGVudGljYXRlZFBsdWdpbixcbiAgJ3BlcnNpc3RlbmNlOmxvYWQnOiAgICAgICAgICAgbG9hZFBsdWdpbixcbiAgJ3BlcnNpc3RlbmNlOnNhdmUnOiAgICAgICAgICAgc2F2ZVBsdWdpbixcbiAgJ3BlcnNpc3RlbmNlOmxpc3QnOiAgICAgICAgICAgbGlzdFBsdWdpbixcbiAgJ3BlcnNpc3RlbmNlOnJlbW92ZSc6ICAgICAgICAgcmVtb3ZlUGx1Z2luXG59O1xuIl19
(1)
});
