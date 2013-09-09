var PREFIX  = 'notebook-';
var USER_ID = 'blakeembrey';

/**
 * Generate a unique id for the url.
 *
 * @return {String}
 */
var generateId = function () {
  var s4 = function () {
    return Math.floor(Math.random()*(0x10000 - 1)).toString(16);
  };

  return [s4(), s4(), s4(), s4()].join('');
};

/**
 * Returns the namespaced localStorage key.
 *
 * @return {String}
 */
var localStorageKey = function (key) {
  return PREFIX + key;
};

/**
 * Sets the user as authenticated by providing a faux user id, since no user is
 * actually required to save to localStorage.
 *
 * @param  {Object}   data
 * @param  {Function} next
 */
var authenticatedPlugin = function (data, next) {
  data.userId  = USER_ID;
  data.ownerId = USER_ID;
  return next();
};

/**
 * Catch changes in the notebook and save the content.
 *
 * @param  {Object}   data
 * @param  {Function} next
 */
var changePlugin = function (data, next) {
  data.save(next);
};

var savePlugin = function (data, next, done) {
  process.nextTick(function () {
    if (!data.id) { data.id = generateId(); }
    localStorage.setItem(localStorageKey(data.id), data.notebook || '');
    return done();
  });
};

/**
 * Load the notebook from localStorage.
 *
 * @param  {Object}   data
 * @param  {Function} next
 */
var loadPlugin = function (data, next, done) {
  process.nextTick(function () {
    var key = localStorageKey(data.id);

    // Hand loading off to the next middleware module.
    if (!localStorage.getItem(key)) { return next(); }

    data.ownerId  = USER_ID;
    data.notebook = localStorage.getItem(localStorageKey(data.id));
    return done();
  });
};

/**
 * Registers all the neccessary handlers for localStorage-based persistence.
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
 * Registers all the neccessary handlers for localStorage-based persistence.
 *
 * @param {Object} middleware
 */
exports.detach = function (middleware) {
  middleware.disuse('persistence:change',        changePlugin);
  middleware.disuse('persistence:authenticated', authenticatedPlugin);
  middleware.disuse('persistence:load',          loadPlugin);
  middleware.disuse('persistence:save',          savePlugin);
};
