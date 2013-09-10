var changePlugin = function (data, next, done) {
  return data.save(done);
};

var authenticatedPlugin = function (data, next, done) {

};

var loadPlugin = function (data, next, done) {
  if (!data.id) { return next(); }

  this.trigger('ajax', {
    url: 'https://api.github.com/gists/' + data.id,
    type: 'GET'
  }, function (err, ajax) {
    var content = ajax.content;

    if (!content || !content.files || !content.files['notebook.md']) {
      return next();
    }

    data.ownerId  = content.user.id;
    data.notebook = content.files['notebook.md'].content;
    return done();
  });
};

var savePlugin = function (data, next, done) {

};

/**
 * Registers all the neccessary handlers for Github gist persistence.
 *
 * @param {Object} middleware
 */
exports.attach = function (middleware) {
  middleware.use('persistence:change',        changePlugin);
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
  middleware.disuse('persistence:authenticated', authenticatedPlugin);
  middleware.disuse('persistence:load',          loadPlugin);
  middleware.disuse('persistence:save',          savePlugin);
};
