/* global describe, it */

describe('Filter Properties Plugin', function () {
  var fixture = document.getElementById('fixture');

  beforeEach(function () {
    filterPropertiesPlugin.attach(App.middleware);
  });

  afterEach(function () {
    filterPropertiesPlugin.detach(App.middleware);
  });

  describe('Inspector', function () {
    it('should hide the internal prototype from display', function () {
      var inspector = new App.View.Inspector({ inspect: {} });
      inspector.render().trigger('open');

      var visibleChildren = App._.filter(inspector.children, function (child) {
        return child.el.className.indexOf('hide') < 0;
      });

      expect(visibleChildren.length).to.equal(0);
      expect(inspector.children.length).to.equal(1);
    });
  });

  describe('Completion', function () {
    var editor;

    var testAutocomplete = function (text) {
      return testCompletion(editor, text);
    };

    beforeEach(function () {
      editor = new CodeMirror(document.body, {
        mode: 'javascript'
      });
      new App.CodeMirror.Completion(editor);
    });

    afterEach(function () {
      delete window.test;
      document.body.removeChild(editor.getWrapperElement());
    });

    describe('Object', function () {
      it('should not display object prototype properties in completion', function () {
        window.test = {};

        expect(testAutocomplete('test.').length).to.equal(0);
      });

      it('should display user defined properties of the same name', function () {
        window.test = { hasOwnProperty: true };

        expect(testAutocomplete('test.has')).to.contain('hasOwnProperty');
      });

      it('should work as expected with Object.create(null)', function () {
        window.test = Object.create(null);
        window.test.hasOwnProperty = true;

        expect(testAutocomplete('test.has')).to.contain('hasOwnProperty');
      });
    });

    describe('Function', function () {
      it('should not display function prototype properties in completion', function () {
        window.test = function () {};

        expect(testAutocomplete('test.').length).to.equal(0);
      });

      it('should display user defined properties of the same name', function () {
        window.test = function () {};
        window.test.bind = 'test';

        expect(testAutocomplete('test.b')).to.contain('bind');
      });
    });
  });
});
