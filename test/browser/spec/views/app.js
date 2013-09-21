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
      view = new App();
    });

    afterEach(function () {
      view.remove();
    });

    it('should have a class name of `application`', function () {
      expect(view.el.className).to.contain('application');
    });

    describe('#render', function () {
      beforeEach(function () {
        view.render();
      });

      it('should render the template', function () {
        expect(view.el.children).to.have.length.above(1);
      });
    });

    describe('Generated App', function () {
      beforeEach(function () {
        view.render().appendTo(fixture);
      });

      it('should be able to set the notebook title', function () {
        var titleEl = view.el.querySelector('.notebook-title');
        titleEl.value = 'Test Notebook';
        simulateEvent(titleEl, 'focusout');
        expect(App.persistence.get('title')).to.equal('Test Notebook');
      });
    });

    describe('Switching Notebook Views', function () {
      var contents = '```javascript\n\n```';

      beforeEach(function () {
        persistence.reset();
        persistence.set('contents', contents);
        view.render().appendTo(fixture);
      });

      it('should switch to a raw notebook viewer', function () {
        simulateEvent(view.el.querySelector('.toggle-notebook-raw'), 'click');

        expect(view.el.querySelector('pre').textContent).to.equal(contents);
      });

      describe('Raw Notebook Editor', function () {
        var editor;

        beforeEach(function () {
          simulateEvent(view.el.querySelector('.toggle-notebook-edit'), 'click');

          editor = view.el.querySelector('.CodeMirror').CodeMirror;
        });

        it('should switch to a raw notebook editor', function () {
          expect(editor.getValue()).to.equal(contents);
        });

        it('should start with the editor focused', function () {
          expect(editor.hasFocus()).to.be.true;
        });

        it('should update persistence when editing the raw notebook', function () {
          editor.setValue('Simple test');

          expect(persistence.get('contents')).to.equal('Simple test');
        });
      });
    });
  });
});
