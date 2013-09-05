var _              = require('underscore');
var domify         = require('domify');
var typeOf         = require('../../lib/type');
var Cell           = require('./cell');
var middleware     = require('../../lib/middleware');
var Inspector      = require('../inspector');
var ErrorInspector = require('../error-inspector');

var ResultCell = module.exports = Cell.extend({
  className: 'cell cell-result result-pending'
});

ResultCell.prototype.initialize = function () {
  this.data = {}; // Set a unique empty object for every result cell
  Cell.prototype.initialize.apply(this, arguments);
};

ResultCell.prototype._reset = function (done) {
  middleware.use('result:empty', function (data, next, done) {
    if (data.data.inspector) {
      data.data.inspector.remove();
    }
    return done();
  });

  middleware.trigger('result:empty', {
    el:   this.el,
    data: this.data
  }, function (err, data) {
    middleware.stack['result:empty'].pop();
    data.el.classList.add('result-pending');
    data.el.classList.remove('result-error');
    done(err);
  });
};

ResultCell.prototype._renderInspector = function (Inspector, options) {
  return this;
};

ResultCell.prototype.setResult = function (inspect, isError, context, done) {
  this._reset(_.bind(function (err) {
    if (err) { return done && done(err); }

    middleware.use('result:render', function (data, next, done) {
      var options = {
        inspect: data.inspect,
        context: data.context
      };

      var inspector;
      if (!data.isError) {
        inspector = data.data.inspector = new Inspector(options);
      } else {
        inspector = data.data.inspector = new ErrorInspector(options);
        data.el.classList.add('result-error');
      }

      inspector.render().appendTo(data.el);

      // Opens the inspector automatically when the type is an object
      var type = typeOf(data.inspect);
      if (type === 'object' || type === 'array') {
        this.inspector.open();
      }

      return done();
    });

    middleware.trigger('result:render', {
      el:      this.el,
      data:    this.data,
      context: context,
      inspect: inspect,
      isError: isError
    }, function (err, data) {
      middleware.stack['result:render'].pop();
      data.el.classList.remove('result-pending');
      return done && done(err);
    });
  }, this));
};

ResultCell.prototype.render = function () {
  Cell.prototype.render.call(this);

  this.el.appendChild(domify(
    '<div class="result-label">$' + this.model._uniqueCellId + '= </div>'
  ));

  return this;
};
