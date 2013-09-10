var accessToken;

/**
 * Any time a change occurs, we'll sync the change with out Github gist.
 *
 * @param  {Object}   data
 * @param  {Function} next
 * @param  {Function} done
 */
var changePlugin = function (data, next, done) {
  return data.save(done);
};

/**
 * Authenticate with the github oauth endpoint. Since we are unlikely to include
 * our client secret with the client code, you'll probably want to include the
 * proxy plugin.
 *
 * @param  {Object}   data
 * @param  {Function} next
 * @param  {Function} done
 */
var authenticatePlugin = function (data, next, done) {
  var middleware = this;
  var clientId   = process.env.GITHUB_CLIENT_ID;

  this.trigger('authenticate:oauth2', {
    scope:            ['gist'],
    clientId:         clientId,
    tokenUrl:         'https://github.com/login/oauth/access_token',
    authorizationUrl: 'https://github.com/login/oauth/authorize'
  }, function (err, auth) {
    if (err) { return next(err); }
    // Set a global access token variable we can use when we save and update.
    accessToken = auth.accessToken;
    // Trigger an ajax request to get additional details from Github
    middleware.trigger('ajax', {
      url: 'https://api.github.com/applications/' + clientId + '/tokens/' +
            accessToken,
      dataType: 'json'
    }, function (err, authorization) {
      data.userId = authorization.content.user.id;
      return done();
    });
  });
};

/**
 * Check that we are authenticated with Github.
 *
 * @param  {Object}   data
 * @param  {Function} next
 * @param  {Function} done
 */
var authenticatedPlugin = function (data, next, done) {
  return done();
};

/**
 * Load a single gist from Github and make sure it holds our notebook content.
 *
 * @param  {Object}   data
 * @param  {Function} next
 * @param  {Function} done
 */
var loadPlugin = function (data, next, done) {
  if (!data.id) { return next(); }

  this.trigger('ajax', {
    url: 'https://api.github.com/gists/' + data.id,
    type: 'GET',
    dataType: 'json'
  }, function (err, ajax) {
    var content = ajax.content;

    if (!content || !content.files || !content.files['notebook.md']) {
      return next();
    }

    data.id       = content.id;
    data.ownerId  = content.user && content.user.id;
    data.notebook = content.files['notebook.md'].content;
    return done();
  });
};

/**
 * Save the notebook into a Github gist for persistence.
 *
 * @param  {Object}   data
 * @param  {Function} next
 * @param  {Function} done
 */
var savePlugin = function (data, next, done) {
  if (!accessToken) { return next(); }

  this.trigger('ajax', {
    url: 'https://api.github.com/gists' + (data.id ? '/' + data.id : '') + '?' +
          'access_token=' + accessToken,
    type: data.id ? 'PATCH' : 'POST',
    data: JSON.stringify({
      files: {
        'notebook.md': {
          content: data.notebook
        }
      }
    }),
    dataType: 'json'
  }, function (err, ajax) {
    data.id      = ajax.content.id;
    data.ownerId = ajax.content.user && ajax.content.user.id;
    return done();
  });
};

/**
 * Registers all the neccessary handlers for Github gist persistence.
 *
 * @param {Object} middleware
 */
exports.attach = function (middleware) {
  middleware.use('persistence:change',        changePlugin);
  middleware.use('persistence:authenticate',  authenticatePlugin);
  middleware.use('persistence:authenticated', authenticatedPlugin);
  middleware.use('persistence:load',          loadPlugin);
  middleware.use('persistence:save',          savePlugin);
};

/**
 * Registers all the neccessary handlers for Github gist persistence.
 *
 * @param {Object} middleware
 */
exports.detach = function (middleware) {
  middleware.disuse('persistence:change',        changePlugin);
  middleware.disuse('persistence:authenticate',  authenticatePlugin);
  middleware.disuse('persistence:authenticated', authenticatedPlugin);
  middleware.disuse('persistence:load',          loadPlugin);
  middleware.disuse('persistence:save',          savePlugin);
};
