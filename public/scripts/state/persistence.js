var _                = require('underscore');
var Backbone         = require('backbone');
var config           = require('./config');
var messages         = require('./messages');
var middleware       = require('./middleware');
var bounce           = require('../lib/bounce');
var isMac            = require('../lib/browser/about').mac;
var PersistenceItems = require('../collections/persistence-items');

/**
 * Properties that should always be considered strings.
 *
 * @type {Object}
 */
var stringProps = {
  'id':         true,
  'originalId': true,
  'userId':     true,
  'ownerId':    true
};

/**
 * Persistence is a static model that holds all persistent notebook data.
 *
 * @type {Function}
 */
var Persistence = Backbone.Model.extend({
  defaults: {
    id:         null,
    meta:       new Backbone.Model(),
    items:      new PersistenceItems(),
    state:      0,
    notebook:   [],
    contents:   '',
    originalId: null,
    userId:     null,
    ownerId:    null,
    updatedAt:  null,
    userTitle:  '',
    readyState: false
  }
});

/**
 * Check whether the persistence model is new. Needs an override for empty
 * strings since I'm too lazy to fix my hash change code.
 */
Persistence.prototype.isNew = function () {
  return !this.has('id');
};

/**
 * Override `has` to take into account empty string overrides.
 *
 * @param  {String}  property
 * @return {Boolean}
 */
Persistence.prototype.has = function (property) {
  if (stringProps[property] && this.attributes[property] === '') {
    return false;
  }

  return Backbone.Model.prototype.has.call(this, property);
};

/**
 * Hook into the set function using the hidden validate property to sanitize
 * set properties.
 *
 * @return {Boolean}
 */
Persistence.prototype._validate = function (attrs) {
  _.each(attrs, function (value, property) {
    // Skip attributes that don't need to be sanitized.
    if (!stringProps[property]) { return; }

    attrs[property] = (value == null ? '' : '' + value);
  });

  return Backbone.Model.prototype._validate.apply(this, arguments);
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
  return !this.has('ownerId') || this.get('ownerId') === this.get('userId');
};

/**
 * Return whether a user is currently authenticated.
 *
 * @return {Boolean}
 */
Persistence.prototype.isAuthenticated = function () {
  return this.has('userId');
};

/**
 * Checks whether the current persistence item is unsaved.
 *
 * @return {Boolean}
 */
Persistence.prototype.isSaved = function () {
  // Check against a map of the different states.
  return ({
    0: true,
    1: false,
    2: false,
    3: false,
    4: true,
    5: true,
    6: true,
    7: false,
    8: true
  })[this.get('state')];
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
      meta:     {},
      ownerId:  null,
      notebook: null
    }),
    _.bind(function (err, data) {
      this.get('meta').clear().set(_.extend({
        title: 'Untitled Notebook'
      }, data.meta));
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
  if (!config.get('savable')) {
    return done(new Error('Notebook is not currently savable'));
  }

  this._changeState(Persistence.SAVING);

  middleware.trigger(
    'persistence:save',
    this.getMiddlewareData(),
    _.bind(function (err, data) {
      if (err) {
        this._changeState(Persistence.SAVE_FAIL);
        return done && done(err);
      }

      this.set('id',        data.id);
      this.set('ownerId',   data.userId);
      this.set('updatedAt', new Date());

      this._changeState(Persistence.SAVE_DONE);
      this.get('items').add(_.extend(this.toJSON(), {
        meta: this.get('meta').toJSON()
      }), { merge: true });

      return done && done();
    }, this)
  );
};

/**
 * Delete a given notebook, specified by its id, which is persistence
 * engine-specific.
 *
 * @param {String}   id
 * @param {Function} done
 */
Persistence.prototype.delete = function (id, done) {
  middleware.trigger('persistence:delete', {
    id: id
  }, _.bind(function(err) {
    if (err) {
      return done && done(err);
    }

    this.get('items').remove(this.get('items').get(id));

    return done && done();
  }, this));
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
      this.set('userTitle', data.userTitle);

      return done && done(err);
    }, this)
  );
};

/**
 * Unauthenticate the persistence layer login.
 *
 * @param {Function} done
 */
Persistence.prototype.unauthenticate = function (done) {
  middleware.trigger(
    'persistence:unauthenticate',
    this.getMiddlewareData(),
    _.bind(function (err) {
      this.set('userId',    '');
      this.set('userTitle', '');

      this.get('items').reset();

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
    // Turn meta model into a regular object.
    meta: this.get('meta').toJSON(),
    // Useful helper functions.
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
      meta:      {},
      contents:  null,
      notebook:  null,
      updatedAt: null
    }),
    _.bind(function (err, data) {
      this._loading = true;

      this.set('id',        data.id);
      this.set('ownerId',   data.ownerId);
      this.set('contents',  data.contents, { silent: true });
      this.set('notebook',  data.notebook, { silent: true });
      this.set('updatedAt', data.updatedAt);

      var complete = _.bind(function () {
        delete this._loading;
        this.trigger('changeNotebook', this);
        this._changeState(err ? Persistence.LOAD_FAIL : Persistence.LOAD_DONE);
        return done && done(err);
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
 * Generate a list of all loadable notebooks. Note that this will often
 * involve going to the network or disk.
 *
 * @param {Function} done
 */
Persistence.prototype.list = function (done) {
  if (!this.isAuthenticated()) {
    return done && done(new Error('Not authenticated'));
  }

  return middleware.trigger(
    'persistence:list', [], _.bind(function (err, list) {
      this.get('items').set(list);

      return done(err, this.get('items').toJSON());
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
  this.unset('id');
  this.unset('ownerId');
  this.unset('updatedAt');

  middleware.trigger(
    'persistence:clone', this.getMiddlewareData(), _.bind(function (err, data) {
      this.set('contents', data.contents);

      // Set the updated meta data after the contents.
      this.get('meta').clear().set(data.meta);

      this._changeState(Persistence.CHANGED);

      return done && done(err);
    }, this)
  );
};

/**
 * Resets the persistence model state.
 */
Persistence.prototype.reset = function () {
  this.set(this.defaults);
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
persistence.listenTo(persistence,             'change:notebook', serialize);
persistence.listenTo(persistence.get('meta'), 'change',          serialize);

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
      this.set('userId',     data.userId);
      this.set('userTitle',  data.userTitle);
      this.set('readyState', true);

      if (!this.has('id') && !this.has('ownerId')) {
        this.set('ownerId', this.get('userId'));
      }
    }, this)
  );
});

/**
 * On load messages, reload the current persistence object.
 */
persistence.listenTo(messages, 'load', _.bind(persistence.load, persistence));

/**
 * Keep the persistence meta data in sync with the config option.
 */
persistence.listenTo(config, 'change:url', bounce(function () {
  persistence.get('meta').set('url', config.get('url'));
}));

/**
 * When the application is ready, finally attempt to load the initial content.
 *
 * @param {Object}   app
 * @param {Function} next
 */
middleware.register('application:ready', function (app, next) {
  return persistence.load(next);
});

/**
 * When the application is ready, start listening for live id changes.
 *
 * @param {Object}   app
 * @param {Function} next
 */
middleware.register('application:ready', function (app, next) {
  persistence.set('id', config.get('id'));

  /**
   * Listens for global id changes and updates persistence. Primarily for
   * loading a new notebook from the embed frame where the current url scheme
   * is unlikely to be maintained.
   */
  config.listenTo(config, 'change:id', function () {
    persistence.set('id', config.get('id'));
  });

  /**
   * Listens for any changes of the persistence id. When it changes, we need to
   * navigate to the updated url.
   */
  config.listenTo(persistence, 'change:id', function () {
    config.set('id', persistence.get('id'));
  });

  /**
   * Trigger refreshes of the persistence layer when the contents change.
   */
  config.listenTo(config, 'change:contents', function () {
    persistence.set('id', '');
    persistence.load();
  });

  return next();
});

/**
 * Register a function to block the regular save button and override with saving
 * to the persistence layer.
 */
middleware.register(
  'keydown:' + (isMac ? 'Cmd' : 'Ctrl') + '-S',
  function (event, next, done) {
    if (!config.get('savable')) { return; }

    event.preventDefault();
    return persistence.save(done);
  }
);
