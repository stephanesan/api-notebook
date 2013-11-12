var _          = require('underscore');
var Backbone   = require('backbone');
var middleware = require('./middleware');

/**
 * Persistence is a static model that holds all persistent notebook data.
 *
 * @type {Function}
 */
var Persistence = Backbone.Model.extend({
  defaults: {
    id:         null,
    state:      0,
    notebook:   [],
    contents:   '',
    originalId: null,
    userId:     null,
    ownerId:    null,
    userTitle:  'Unauthenticated'
  }
});

/**
 * Check whether the persistence model is new. Needs an override for empty
 * strings since I'm too lazy to fix my hash change code.
 */
Persistence.prototype.isNew = function () {
  return this.get('id') === '' || Backbone.Model.prototype.isNew.call(this);
};

/**
 * Initialize the persistence model and attach the related meta data model.
 */
Persistence.prototype.initialize = function () {
  // Set the `meta` property on the persistence model to be its own model.
  this.meta = new (Backbone.Model.extend({
    defaults: {
      title: 'New Notebook'
    }
  }))();
};

/**
 * Represent persistence states in event listeners as numerical entities.
 *
 * @type {Number}
 */
Persistence.prototype.NULL      = Persistence.NULL      = 0;
Persistence.prototype.SAVING    = Persistence.SAVING    = 1;
Persistence.prototype.LOADING   = Persistence.LOADING   = 2;
Persistence.prototype.SAVE_FAIL = Persistence.SAVE_FAIL = 3;
Persistence.prototype.SAVE_DONE = Persistence.SAVE_DONE = 4;
Persistence.prototype.LOAD_FAIL = Persistence.LOAD_FAIL = 5;
Persistence.prototype.LOAD_DONE = Persistence.LOAD_DONE = 6;
Persistence.prototype.CHANGED   = Persistence.CHANGED   = 7;
Persistence.prototype.CLONING   = Persistence.CLONING   = 8;

/**
 * Private method for triggering state changes and relevant events.
 *
 * @return {App}
 */
Persistence.prototype._changeState = function (state) {
  this.set('state', state);

  return this;
};

/**
 * Return whether the current user session is the owner of the current notebook.
 *
 * @return {Boolean}
 */
Persistence.prototype.isOwner = function () {
  if (!this.isOwnerReady || (!this.has('ownerId') && !this.has('userId'))) {
    return true;
  }

  return this.get('ownerId') === this.get('userId');
};

/**
 * Return whether a user is currently authenticated.
 *
 * @return {Boolean}
 */
Persistence.prototype.isAuthenticated = function () {
  return !this.isOwnerReady || this.has('userId');
};

/**
 * Pass an array of cells that represent the notebook for serialization.
 *
 * @param {Array}    cells
 * @param {Function} done
 */
Persistence.prototype.serialize = function (done) {
  middleware.trigger(
    'persistence:serialize',
    _.extend(this.getMiddlewareData(), {
      contents: null
    }),
    _.bind(function (err, data) {
      this.set('contents', data.contents);

      return done && done(err);
    }, this)
  );
};

/**
 * Trigger deserializing from the notebook contents.
 *
 * @param {Function} done
 */
Persistence.prototype.deserialize = function (done) {
  middleware.trigger(
    'persistence:deserialize',
    _.extend(this.getMiddlewareData(), {
      ownerId:  null,
      notebook: null
    }),
    _.bind(function (err, data) {
      this.meta.set(data.meta);
      this.set('notebook', data.notebook);

      return done && done(err);
    }, this)
  );
};

/**
 * Save the notebook.
 *
 * @param {Function} done
 */
Persistence.prototype.save = function (done) {
  this._changeState(Persistence.SAVING);

  middleware.trigger(
    'persistence:save',
    this.getMiddlewareData(),
    _.bind(function (err, data) {
      if (err) {
        this._changeState(Persistence.SAVE_FAIL);
        return done && done(err);
      }

      this.set('id',      data.id);
      this.set('ownerId', data.ownerId);

      this._changeState(Persistence.SAVE_DONE);
      return done && done();
    }, this)
  );
};

/**
 * Authenticate with the external persistence provider.
 *
 * @param {Function} done
 */
Persistence.prototype.authenticate = function (done) {
  middleware.trigger(
    'persistence:authenticate',
    _.extend(this.getMiddlewareData(), {
      userId:    null,
      userTitle: null
    }),
    _.bind(function (err, data) {
      this.set('userId',    data.userId);
      this.set('userTitle', this.has('userId') ?
        data.userTitle || 'Authenticated' : this.defaults.userTitle);

      // When we authenticate, the owner id will be out of sync here. If we
      // don't currently have an `id` and `ownerId`, we'll set the user to be
      // the notebook owner.
      if (!this.has('id') && !this.has('ownerId')) {
        this.set('ownerId', this.get('userId'));
      }

      return done && done(err);
    }, this)
  );
};

/**
 * Get the persistence object in a format that is suitable for middleware.
 *
 * @return {Object}
 */
Persistence.prototype.getMiddlewareData = function () {
  return _.extend(this.toJSON(), {
    meta:            this.meta.toJSON(),
    save:            _.bind(this.save, this),
    clone:           _.bind(this.clone, this),
    isNew:           _.bind(this.isNew, this),
    isOwner:         _.bind(this.isOwner, this),
    authenticate:    _.bind(this.authenticate, this),
    isAuthenticated: _.bind(this.isAuthenticated, this)
  });
};

/**
 * Load a notebook from an external service based on an id string.
 *
 * @param {String}   id
 * @param {Function} done
 */
Persistence.prototype.load = function (done) {
  this._changeState(Persistence.LOADING);

  return middleware.trigger(
    'persistence:load',
    _.extend(this.getMiddlewareData(), {
      contents: null,
      notebook: null
    }),
    _.bind(function (err, data) {
      this._loading = true;

      if (err) {
        delete this._loading;
        this._changeState(Persistence.LOAD_FAIL);
        return done && done(err);
      }

      this.set('id',       data.id);
      this.set('ownerId',  data.ownerId);
      this.set('contents', data.contents, { silent: true });
      this.set('notebook', data.notebook, { silent: true });

      var complete = _.bind(function () {
        delete this._loading;
        this.trigger('changeNotebook', this);
        this._changeState(Persistence.LOAD_DONE);
        return done && done();
      }, this);

      // No post-processing required.
      if (this.has('contents') && this.has('notebook')) {
        return complete();
      }

      // Requires serializing to text.
      if (this.has('notebook')) {
        return this.serialize(complete);
      }

      // Requires deserializing to the notebook array.
      return this.deserialize(complete);
    }, this)
  );
};

/**
 * Clone the notebook and reset the persistence layer to look normal again.
 */
Persistence.prototype.clone = function (done) {
  // Allows a reference back to the original notebook. Could be a useful for
  // someone to track where different notebooks originally come from.
  if (this.has('id')) {
    this.set('originalId', this.get('id'));
  }

  this._changeState(Persistence.CLONING);

  // Removes the notebook id and sets the user id to the current user.
  this.set('id',      null);
  this.set('ownerId', this.get('userId'));

  return this.save(done);
};

/**
 * Resets the persistence model state.
 */
Persistence.prototype.reset = function () {
  this.set(this.defaults);
  this.meta.set(this.meta.defaults);
};

/**
 * Export a static instance of the persistence model.
 *
 * @type {Object}
 */
var persistence = module.exports = new Persistence();

/**
 * Simple function used as a safeguard to block any accidental recursion with
 * syncing data between persistence fields.
 *
 * @param  {Function} fn
 * @return {Function}
 */
var syncProtection = function (fn) {
  return function () {
    // Break execution when we are already syncing.
    if (persistence._syncing) { return; }

    persistence._syncing = true;
    return fn.apply(this, arguments);
  };
};

/**
 * Serialize the notebook contents.
 */
var serialize = syncProtection(function () {
  // Serialize the notebook contents and remove sync protection.
  persistence.serialize(function () {
    persistence._syncing = false;
  });
});

/**
 * Deserialize the notebook contents.
 */
var deserialize = syncProtection(function () {
  // Deserialize the contents and remove sync protection.
  persistence.deserialize(function () {
    persistence._syncing = false;
  });
});

/**
 * Keeps the serialized notebook in sync with the deserialized version.
 */
persistence.listenTo(persistence,      'change:notebook', serialize);
persistence.listenTo(persistence.meta, 'change',          serialize);

/**
 * Keeps the deserialized notebook contents in sync with the serialized content.
 */
persistence.listenTo(persistence, 'change:contents', deserialize);

/**
 * Listens to any changes to the user id and emits a custom `changeUser` event
 * that different parts of the application bind to and does things like
 * rerendering of notebook.
 */
persistence.listenTo(
  persistence,
  'change:userId change:ownerId change:userTitle',
  _.debounce(function () {
    this.trigger('changeUser', this);
  }, 300)
);

/**
 * Any time the notebook changes, trigger the `persistence:change` middleware
 * handler.
 */
persistence.listenTo(persistence, 'change:contents', (function () {
  var changing    = false;
  var changeQueue = false;

  return function change () {
    // Block updates when loading a notebook.
    if (this._loading) { return; }

    // If we are already changing the data, but it has not yet been resolved,
    // set a change queue flag to `true` to let ourselves know we have changes
    // queued to sync once we finish the current operation.
    if (changing) { return changeQueue = true; }

    changing = true;
    this._changeState(Persistence.CHANGED);

    middleware.trigger(
      'persistence:change',
      this.getMiddlewareData(),
      _.bind(function () {
        changing = false;
        if (changeQueue) {
          changeQueue = false;
          return change.call(this);
        }
      }, this)
    );
  };
})());

/**
 * Check with an external service whether a users session is authenticated. This
 * will only check, and not actually trigger authentication which would be a
 * jarring experience. Also load the initial notebook contents alongside.
 */
persistence.listenTo(middleware, 'application:ready', function () {
  return middleware.trigger(
    'persistence:authenticated',
    _.extend(this.getMiddlewareData(), {
      userId:    null,
      userTitle: null
    }), _.bind(function (err, data) {
      this.set('userId',    data.userId);
      this.set('userTitle', this.has('userId') ?
        data.userTitle || 'Authenticated' : this.defaults.userTitle);

      if (!this.has('id') && !this.has('ownerId')) {
        this.set('ownerId', this.get('userId'));
      }

      // Set an `isOwnerReady` flag on the persistence model. This is used to
      // check if the user is authenticated and if the user is the owner.
      this.isOwnerReady = true;
    }, this)
  );
});
