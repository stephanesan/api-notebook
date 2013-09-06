/* global describe, it */

describe('Function Return Plugin', function () {
  var fixture = document.getElementById('fixture');

  beforeEach(function () {
    functionReturnPlugin.attach(App.middleware);
  });

  afterEach(function () {
    functionReturnPlugin.detach(App.middleware);
  });

  describe('Inspector', function () {
    it('should hide the @return property from display', function () {
      var fn = function () {};
      fn['@return'] = 'test';

      var inspector = new App.View.Inspector({ inspect: fn });
      inspector.render().trigger('open');

      var properties = App._.map(inspector.children, function (child) {
        return ~child.el.className.indexOf('hide') ? null : child.property;
      });

      expect(properties).to.not.contain('@return');
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

    it('should autocomplete strings', function () {
      window.test = function () {};
      window.test['@return'] = 'output';

      expect(testAutocomplete('test().sub')).to.contain('substr');
    });

    it('should autocomplete objects', function () {
      window.test = function () {};
      window.test['@return'] = { test: 'test' };

      expect(testAutocomplete('test().te')).to.contain('test');
    });

    it('should autocomplete chained functions', function () {
      window.test = function () {};
      window.test['@return'] = { test: function () {} };
      window.test['@return'].test['@return'] = 'again';

      var suggestions = testAutocomplete('test().test().sub');
      expect(suggestions).to.contain('substr');
    });

    it('should autocomplete returned functions', function () {
      window.test = function () {};
      window.test['@return'] = function () {};
      window.test['@return']['@return'] = 'again';

      var suggestions = testAutocomplete('test()().sub');
      expect(suggestions).to.contain('substr');
    });
  });
});
