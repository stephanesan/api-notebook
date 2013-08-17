/* global describe, it */

describe('App', function () {
  it('should expose a global variable for testing', function () {
    expect(App).to.be.a('function');
  });

  it('should expose views', function () {
    expect(App.View).to.be.an('object');
  });

  it('should expose models', function () {
    expect(App.Model).to.be.an('object');
  });

  it('should expose collections', function () {
    expect(App.Collection).to.be.an('object');
  });

  describe('App instance', function () {
    var view;

    beforeEach(function () {
      // Stop attempting to do ajax requests
      Backbone.$.ajax = sinon.spy();
      // Create an app instance for testing, but stub opening a new window
      view = new App();
      view.authNotebook = sinon.spy(window, 'open');
    });

    afterEach(function () {
      window.open.restore();
    });

    it('should have a class name of `application`', function () {
      expect(view.el.className).to.equal('application');
    });

    it('should create a user session', function () {
      expect(view.user).to.exist;
    });
  });
});
