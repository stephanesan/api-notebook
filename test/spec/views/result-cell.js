/* global describe, it, beforeEach */

describe('Result Cell', function () {
  var Result    = App.View.ResultCell;
  var fixture = document.getElementById('fixture');

  it('should exist', function () {
    expect(Result).to.be.a('function');
  });

  describe('Result Cell instance', function () {
    var view;

    beforeEach(function () {
      view = new Result().render();
    });

    it('should have a class', function () {
      expect(view.el.className).to.contain('cell');
      expect(view.el.className).to.contain('cell-result');
      expect(view.el.className).to.contain('result-pending');
    });

    describe('#setResult', function () {
      it('should set the result', function (done) {
        view.setResult({
          result:  'Testing',
          isError: false
        }, window, function (err) {
          expect(err).to.not.exist;
          expect(view.el.className).to.not.contain('result-error');
          expect(view.el.className).to.not.contain('result-pending');
          return done();
        });
      });

      it('should set an error', function (done) {
        view.setResult({
          result:  new Error('Testing'),
          isError: true
        }, window, function (err) {
          expect(err).to.not.exist;
          expect(view.el.className).to.contain('result-error');
          expect(view.el.className).to.not.contain('result-pending');
          return done();
        });
      });
    });

    describe('middleware', function () {
      it('should be able to hook onto the render', function (done) {
        var removeSpy = sinon.spy();

        var renderSpy = sinon.spy(function (data, next, done) {
          data.el.appendChild(document.createTextNode('some testing here'));
          return done(null, removeSpy);
        });

        App.middleware.register('result:render', renderSpy);

        view.setResult({
          result:  null,
          isError: false
        }, window, function () {
          expect(renderSpy).to.have.been.calledOnce;
          expect(
            view.el.querySelector('.result-content').textContent
          ).to.equal('some testing here');

          view.remove();
          expect(removeSpy).to.have.been.calledOnce;

          return done();
        });
      });
    });
  });
});
