/* global describe, it */

describe('App', function () {
  var fixture = document.getElementById('fixture');

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
      view.remove();
      window.open.restore();
    });

    it('should have a class name of `application`', function () {
      expect(view.el.className).to.equal('application');
    });

    it('should create a user session', function () {
      expect(view.user).to.exist;
    });

    describe('#render', function () {
      beforeEach(function () {
        view.render();
      });

      it('should render the template', function () {
        expect(view.el.children).to.have.length.above(1);
      });
    });

    describe('#appendTo', function () {
      beforeEach(function () {
        view.render().appendTo(fixture);
      });

      afterEach(function () {
        view.remove();
      });

      it('should set a new gist', function () {
        expect(view.notebook).to.exist;
        expect(view.notebook.gist).to.exist;
        expect(view.notebook.gist.id).to.not.exist;
      });
    });
  });
});
