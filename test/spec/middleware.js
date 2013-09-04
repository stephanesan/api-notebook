/* global describe, it, afterEach, expect, sinon, App */

describe('middleware', function () {
  var middleware = App.middleware;

  it('should exist', function () {
    expect(middleware).to.exist;
  });

  describe('events', function () {
    it('should work like Backbone.Events', function () {
      var spy = sinon.spy();
      middleware.on('test', spy);
      middleware.trigger('test');
      expect(spy).to.have.been.called;
    });
  });

  describe('plugins', function () {
    afterEach(function () {
      middleware._stack = {};
    });

    it('should define a `use` method', function () {
      expect(middleware.use).to.be.a('function');
    });

    it('should add middleware functions to be called on an event', function () {
      var spy = sinon.spy();

      middleware.use('test', spy);
      middleware.trigger('test');

      expect(spy).to.have.been.calledOnce;
    });

    it('should loop through middleware', function () {
      var spy = sinon.spy(function (data, next) {
        next();
      });

      middleware.use('test', spy);
      middleware.use('test', spy);
      middleware.trigger('test');

      expect(spy).to.have.been.calledTwice;
    });

    it('should not loop through if we don\'t call next', function () {
      var spy = sinon.spy();

      middleware.use('test', spy);
      middleware.use('test', spy);
      middleware.trigger('test');

      expect(spy).to.have.been.calledOnce;
    });

    it('should be able to pass through a custom data object', function () {
      var spy = sinon.spy(function (data) {
        expect(data.test).to.equal('success');
      });

      middleware.use('test', spy);
      middleware.trigger('test', { test: 'success' });

      expect(spy).to.have.been.calledOnce;
    });

    it('should be able to pass a function to run when complete', function () {
      var spy = sinon.spy();

      middleware.trigger('test', null, spy);

      expect(spy).to.have.been.calledOnce;
    });

    it('should be able to run completion function after multiple middleware', function () {
      var spy  = sinon.spy();
      var next = sinon.spy(function (data, next) {
        next();
      });

      middleware.use('test', next);
      middleware.use('test', next);
      middleware.use('test', next);
      middleware.trigger('test', null, spy);

      expect(spy).to.have.been.calledOnce;
      expect(next).to.have.been.calledThrice;
    });

    it('should be able to short circuit the rest of the execution stack', function () {
      var spy  = sinon.spy();
      var next = sinon.spy(function (data) {
        data.done();
      });


      middleware.use('test', next);
      middleware.use('test', next);
      middleware.use('test', next);
      middleware.trigger('test', null, spy);

      expect(spy).to.have.been.calledOnce;
      expect(next).to.have.been.calledOnce;
    });
  });
});
