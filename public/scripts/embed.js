var css     = require('css-component');
var each    = require('foreach');
var Kamino  = require('kamino');
var __slice = Array.prototype.slice;

// Set the location to load the notebook from
var NOTEBOOK_URL = process.env.NOTEBOOK_URL;

/**
 * Extend any object with the properties from other objects, overriding of left
 * to right.
 *
 * @param  {Object} obj Root object to copy properties to.
 * @param  {Object} ... Any number of source objects that properties will be
 *                      copied from.
 * @return {Object}
 */
var extend = function (obj /*, ...source */) {
  each(__slice.call(arguments, 1), function (source) {
    for (var prop in source) {
      if (Object.prototype.hasOwnProperty.call(source, prop)) {
        obj[prop] = source[prop];
      }
    }
  });

  return obj;
};

/**
 * Getting all the data atrributes of an element. Works cross-browser.
 *
 * @param  {Element} el
 * @return {Object}
 */
var getDataAttributes = function (el) {
  var obj  = {};

  if (el.dataset) {
    return extend(obj, el.dataset);
  }

  var upperCase = function (_, $0) { return $0.toUpperCase(); };

  var attrs = el.attributes;
  for (var i = 0, l = attrs.length; i < l; i++) {
    var attr = attrs.item(i);
    if (attr.nodeName.substr(0, 5) === 'data-') {
      var name = attr.nodeName.substr(5).replace(/\-(\w)/, upperCase);

      obj[name] = attr.nodeValue;
    }
  }

  return obj;
};

/**
 * Copy of all the default options for a new Notebook instance.
 *
 * @type {Object}
 */
var defaultOptions = {
  id:       null, // Initial id to pull content from
  contents: null, // Fallback content in case of no id
  style:    {},   // Set styles on the iframe
  alias:    {}    // Alias objects into the frame once available
};

/**
 * Copy of the default iframe style options.
 *
 * @type {Object}
 */
var defaultStyles = {
  width:       '100%',
  border:      'none',
  display:     'block',
  marginLeft:  'auto',
  marginRight: 'auto',
  padding:     '0'
};

/**
 * Creates an embeddable version of the notebook for general consumption.
 *
 * @param  {Element|Function} el      Pass an element or a function that accepts
 *                                    an element as the argument.
 * @param  {Object}           options
 * @return {Notebook}
 */
var Notebook = module.exports = function (el, options, styles) {
  if (!(this instanceof Notebook)) {
    return new Notebook(el, options);
  }

  var notebook = this;

  notebook.makeFrame(el, extend({}, defaultOptions, options));
  notebook.styleFrame(extend({}, defaultStyles, styles));
};

/**
 * Keep track of all created notebooks and allow configuration after creation.
 *
 * @type {Array}
 */
Notebook.instances = [];

/**
 * Keep track of all registered subscriptions and unsubscriptions.
 *
 * @type {Array}
 */
Notebook.subscriptions   = [];
Notebook.unsubscriptions = [];

/**
 * Pass a subscription method to every notebook. It will be called for all
 * notebook instances, new and old.
 *
 * @param {Function} fn
 */
Notebook.subscribe = function (fn) {
  Notebook.subscriptions.push(fn);

  each(Notebook.instances, function (notebook) {
    fn(notebook);
  });
};

/**
 * Pass an unsubscribe method to every notebook instance for removal.
 *
 * @param {Function} fn
 */
Notebook.unsubscribe = function (fn) {
  Notebook.unsubscriptions.push(fn);
};

/**
 * Generate an iframe to house the embeddable widget and append to the
 * designated element in the DOM.
 *
 * @param  {Element|Function} el
 * @return {Notebook}
 */
Notebook.prototype.makeFrame = function (el, options) {
  var that  = this;
  var src   = NOTEBOOK_URL + '/embed.html';
  var frame = this.el = document.createElement('iframe');

  // Configure base frame options.
  frame.src       = src;
  frame.className = options.className || '';

  // Extend basic configuration options.
  options.config = extend({
    id:       options.id,
    url:      window.location.href,
    embedded: true,
    contents: options.contents
  }, options.config);

  // When the app is ready to receive events, send configuration data and let
  // the frame know that we are ready to execute.
  this.once('ready', function () {
    this.trigger('ready', options);

    this.once('rendered', function () {
      Notebook.instances.push(that);
      each(Notebook.subscriptions, function (fn) {
        fn(that);
      });
    });
  });

  // When a new height comes through, update the iframe height. Use the inline
  // height tag since css should take a higher precendence (which allows simple
  // height overrides to work alongside this).
  this.on('height', function (height) {
    this.el.height = height;
  });

  // Set up a single message listener that will trigger events from the frame
  global.addEventListener('message', this._messageListener = function (e) {
    if (e.source !== frame.contentWindow) { return; }

    that._frameEvent = e;
    that.trigger.apply(that, Kamino.parse(e.data));
  }, false);

  if (typeof el.appendChild === 'function') {
    el.appendChild(frame);
  } else {
    el(frame);
  }

  this.window = frame.contentWindow;

  return this;
};

/**
 * Sets the inline styles of the frame.
 *
 * @param  {Object}   style
 * @return {Notebook}
 */
Notebook.prototype.styleFrame = function (styles) {
  css(this.el, styles);
  return this;
};

/**
 * Evaluate text in the context of the notebook frame.
 *
 * @param {String} evil
 */
Notebook.prototype.exec = function (evil, done) {
  this.once('exec', function (result) {
    return done && done(result);
  });

  this.trigger('exec', evil);
};


/**
 * Returns a variable from the embedded page.
 *
 * @param {String}   key
 * @param {Function} done
 */
Notebook.prototype.getVariable = function (key, done) {
  this.exec(key, function (result) {
    return done(result);
  });
};

/**
 * Removes the frame from the DOM.
 *
 * @return {Notebook}
 */
Notebook.prototype.removeFrame = function () {
  global.removeEventListener('message', this._messageListener);
  this.el.parentNode.removeChild(this.el);
  delete this.el;

  return this;
};

/**
 * Removes any notebook associated data from the embedding frame.
 *
 * @return {Notebook}
 */
Notebook.prototype.remove = function () {
  for (var i = 0; i < Notebook.instances.length; i++) {
    if (Notebook.instances[i] === this) {
      /* jshint -W083 */
      each(Notebook.unsubscriptions, function (fn) {
        fn(Notebook.instances[i]);
      });

      i--;
      Notebook.instances.pop();
    }
  }

  this.off();

  return this.removeFrame();
};

/**
 * Listen to events triggered by the frame.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @return {Notebook}
 */
Notebook.prototype.on = function (name, fn) {
  this._events = this._events || {};
  var events = (this._events[name] = this._events[name] || []);
  events.push(fn);

  return this;
};

/**
 * Listen to an event being triggered by the frame once.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @return {Notebook}
 */
Notebook.prototype.once = function (name, fn) {
  var that = this;
  return this.on(name, function cb () {
    that.off(name, cb);
    fn.apply(this, arguments);
    fn = null;
  });
};

/**
 * Remove an event listener from the frame.
 *
 * @param  {String}   name
 * @param  {Function} [fn]
 * @return {Notebook}
 */
Notebook.prototype.off = function (name, fn) {
  if (!this._events || !this._events[name]) { return this; }

  if (!fn) {
    if (!name) {
      delete this._events;
    } else {
      delete this._events[name];
    }

    return this;
  }

  var events = this._events[name];
  for (var i = 0; i < events.length; i++) {
    if (events[i] === fn) {
      events.splice(i, 1);
      i--;
    }
  }

  if (!events.length) { delete this._events[name]; }

  return this;
};

/**
 * Trigger an event on the frame. Read: Sends an event to the frames postMessage
 * handler.
 *
 * @param  {String}   name
 * @param  {*}        ...  Any additional data you wish the send with the event
 * @return {Notebook}
 */
Notebook.prototype.trigger = function (name /*, ..args */) {
  var that = this;
  var args;

  if (this._frameEvent) {
    delete that._frameEvent;
    args = __slice.call(arguments, 1);
    if (this._events && this._events[name]) {
      // Slice a copy of the events since we might be removing an event from
      // within an event callback. In which case it would break the loop.
      each(this._events[name].slice(), function (fn) {
        fn.apply(that, args);
      });
    }
    return this;
  }

  args = __slice.call(arguments, 0);
  this.el.contentWindow.postMessage(Kamino.stringify(args), NOTEBOOK_URL);
  return this;
};

/**
 * Shorthand for setting a config option.
 */
Notebook.prototype.config = function () {
  this.trigger.apply(this, ['config'].concat(__slice.call(arguments)));
};

/**
 * Shorthand for passing messages to the application.
 */
Notebook.prototype.message = function () {
  this.trigger.apply(this, ['message'].concat(__slice.call(arguments)));
};

/**
 * Refresh the iframe.
 */
Notebook.prototype.refresh = function () {
  this.message('refresh');
};

/**
 * Attempts to automatically create the initial notebook by scanning for the
 * correct script tag and using the data from it to generate the notebook.
 *
 * @param {NodeList} scripts
 */
(function (scripts) {
  var script;

  for (var i = 0, l = scripts.length; i < l; i++) {
    script = scripts[i];
    // Allows the script to be loaded asynchronously if we provide this
    // attribute with the script tag.
    if (typeof script.getAttribute('data-notebook') === 'string') { break; }
  }

  var data     = getDataAttributes(script);
  var selector = data.selector;

  // Allow manual creation of embeddable notebooks.
  if ('manual' in data) { return; }

  // TODO: Discuss replacing this implementation with something more
  // cross-browser. Probably just stick with element ids.
  var el = selector ? document.querySelector(selector) : script.parentNode;
  return new Notebook(el, data);
})(document.getElementsByTagName('script'));
