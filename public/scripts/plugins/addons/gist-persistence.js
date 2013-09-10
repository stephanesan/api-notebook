var changePlugin = function (data, next, done) {
  return data.save(done);
};

var authenticatedPlugin = function (data, next, done) {

};

var loadPlugin = function (data, next, done) {

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
