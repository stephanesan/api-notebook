var _          = require('underscore');
var Backbone   = require('backbone');
var middleware = require('./middleware');

/**
 * Persistence is a static model that holds all persistence based data. Only
 * two flags should ever be set - `userId` and `notebook` - but more could be
 * set external to the module.
 *
 * @type {Object}
 */
var persistence = module.exports = new (Backbone.Model.extend({
  defaults: {
    id:       undefined, // Holds the notebook unique id.
    userId:   undefined, // Holds the persistence session user id.
    ownerId:  undefined, // Holds the notebook owners user id.
    notebook: '',        // Holds the notebook content in serialized format.
    defaultContent: ''   // Holds the default notebook content for new notebooks
  }
}))();

/**
 * Return whether the current user session is the owner of the current notebook.
 *
 * @return {Boolean}
 */
persistence.isOwner = function () {
  return this.get('ownerId') === this.get('userId');
};

/**
 * Simple wrapper around the serialize method that also sets the notebook.
 *
 * @param  {Array}    cells
 * @param  {Function} done
 */
persistence.update = function (cells, done) {
  this.serialize(cells, function (err, notebook) {
    this.set('notebook', notebook);
    done(err, notebook);
  });
};

/**
 * Pass an array of cells that represent the notebook for serialization.
 *
 * @param  {Array}    cells
 * @param  {Function} done
 */
persistence.serialize = function (cells, done) {
  middleware.trigger('persistence:serialize', {
    notebook: cells
  }, function (err, data) {
    return done(err, data.notebook);
  });
};

/**
 * Trigger deserializing from the notebook contents.
 *
 * @param  {Function} done
 */
persistence.deserialize = function (done) {
  middleware.trigger('persistence:deserialize', {
    notebook: this.get('notebook')
  }, function (err, data) {
    return done(err, data.notebook);
  });
};

/**
 * Save the notebook.
 *
 * @param  {Function} done
 */
persistence.save = function (done) {
  middleware.trigger('persistence:save', {
    notebook: this.get('notebook')
  }, function (err, data) {
    this.set('notebook', data.notebook);
    done(err, data.notebook);
  });
};

/**
 * Load the notebook.
 *
 * @param  {Function} done
 */
persistence.load = function (done) {
  middleware.trigger('persistence:load', {
    notebook: null,
  }, function (err, data) {
    this.set('notebook', data.notebook);
    done(err, data.notebook);
  });
};

/**
 * Authenticate with the external persistence provider.
 *
 * @param  {Function} done
 */
persistence.authenticate = function (done) {
  middleware.trigger('persistence:authenticate', {
    userId: this.get('userId')
  }, function (err, data) {
    this.set('userId', data.userId);
    done(err, data.userId);
  });
};

/**
 * Check with the external service whether we are actually authenticated. This
 * will only check, and not actually trigger authentication which would be a
 * jarring experience.
 *
 * @param  {Function} done
 */
persistence.isAuthenticated = function (done) {
  middleware.trigger('persistence:session', {
    userId: this.get('userId')
  }, function (err, data) {
    this.set('userId', data.userId);
    done(err, data.userId);
  });
};

/**
 * Listens to any changes to the user id and emits a custom `changeUser` event
 * that different parts of the application bind to and does things like
 * rerendering of notebook.
 */
persistence.listenTo(persistence, 'change:userId', function () {
  this.trigger('changeUser', this);
});

/**
 * Any time the notebook changes, trigger the `persistence:change` middleware
 * handler.
 */
persistence.listenTo(persistence, 'change:notebook', function () {
  middleware.trigger('persistence:change', {
    notebook: this.get('notebook')
  });
});
