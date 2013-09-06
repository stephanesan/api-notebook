var logger = function (data, next) {
  console.log(data);
  next();
};

/**
 * Registers all the neccessary handlers for localStorage-based persistence.
 *
 * @param {Object} middleware
 */
exports.attach = function (middleware) {
  middleware.use('persistence:change',       logger);
  middleware.use('persistence:serialize',    logger);
  middleware.use('persistence:deserialize',  logger);
  middleware.use('persistence:authenticate', logger);
  middleware.use('persistence:session',      logger);
  middleware.use('persistence:load',         logger);
  middleware.use('persistence:save',         logger);
};

/**
 * Registers all the neccessary handlers for localStorage-based persistence.
 *
 * @param {Object} middleware
 */
exports.detach = function (middleware) {
  middleware.disuse('persistence:change',       logger);
  middleware.disuse('persistence:serialize',    logger);
  middleware.disuse('persistence:deserialize',  logger);
  middleware.disuse('persistence:authenticate', logger);
  middleware.disuse('persistence:session',      logger);
  middleware.disuse('persistence:load',         logger);
  middleware.disuse('persistence:save',         logger);
};
