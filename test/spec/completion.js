/* global describe, it */

describe('Completion', function () {
  var editor;

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

  var testAutocomplete = function (text) {
    return testCompletion(editor, text);
  };

  it('should complete variables', function () {
    expect(testAutocomplete('doc')).to.contain('document');
  });

  it('should complete keywords', function () {
    expect(testAutocomplete('sw')).to.contain('switch');
  });

  it('should complete using static analysis', function () {
    var suggestions = testAutocomplete('var testing = "test";\ntes');

    expect(suggestions).to.contain('testing');
  });

  it('should complete from outer scope statically', function () {
    var suggestions = testAutocomplete(
      'var testing = "test";\nfunction () {\n  tes'
    );

    expect(suggestions).to.contain('testing');
  });

  it('should complete from the global scope statically', function () {
    var suggestions = testAutocomplete(
      'var testing = "test";\nfunction () {\n  var test = "again";\n' +
      '  function () {\n    tes'
    );

    expect(suggestions).to.contain('test');
    expect(suggestions).to.contain('testing');
  });

  describe('properties', function () {
    it('should complete object properties', function () {
      var suggestions = testAutocomplete('document.getElementBy');

      expect(suggestions).to.contain('getElementById');
    });

    it('should complete single characters', function () {
      window.test = { o: "test" };

      expect(testAutocomplete('test.')).to.contain('o');
    });

    it('should complete numbers', function () {
      var suggestions = testAutocomplete('123..to');

      expect(suggestions).to.contain('toFixed');
    });

    it('should complete strings', function () {
      var suggestions = testAutocomplete('"test".sub');

      expect(suggestions).to.contain('substr');
    });

    it('should complete regular expressions', function () {
      var suggestions = testAutocomplete('(/./g).');

      expect(suggestions).to.contain('test');
      expect(suggestions).to.contain('global');
    });

    it('should complete booleans', function () {
      var suggestions = testAutocomplete('true.to');

      expect(suggestions).to.contain('toString');
    });

    it('should complete functions', function () {
      var suggestions = testAutocomplete('Date.n');

      expect(suggestions).to.contain('now');
    });

    it('should complete constructor properties', function () {
      var suggestions = testAutocomplete('new Date().get');

      expect(suggestions).to.contain('getYear');
    });

    it('should complete object constructor properties', function () {
      var suggestions = testAutocomplete('new window.Date().get');

      expect(suggestions).to.contain('getYear');
    });

    it('should complete normal object properties with new', function () {
      var suggestions = testAutocomplete('new window.Dat');

      expect(suggestions).to.contain('Date');
    });

    it('constructor should work without parens', function () {
      var suggestions = testAutocomplete('(new Date).get');

      expect(suggestions).to.contain('getMonth');
      expect(suggestions).to.contain('getYear');
    });

    it('should work with parens around the value', function () {
      var suggestions = testAutocomplete('(123).to');

      expect(suggestions).to.contain('toFixed');
    });

    it('should ignore whitespace between properties', function () {
      expect(testAutocomplete('window  .win')).to.contain('window');
      expect(testAutocomplete('window.  win')).to.contain('window');
      expect(testAutocomplete('window  .  win')).to.contain('window');
    });

    it('should ignore whitespace inside parens', function () {
      expect(testAutocomplete('(  123).to')).to.contain('toFixed');
      expect(testAutocomplete('(123  ).to')).to.contain('toFixed');
      expect(testAutocomplete('(  123  ).to')).to.contain('toFixed');
    });
  });

  describe('middleware', function () {
    it('should be able to hook onto variable completion', function () {
      var spy = sinon.spy(function (data, next) {
        data.results.something = true;
        next();
      });

      App.middleware.use('completion:variable', spy);

      expect(testAutocomplete('some')).to.contain('something');
      expect(spy).to.have.been.calledOnce;

      App.middleware.disuse('completion:variable', spy);
    });

    it('should be able to hook onto context lookups', function () {
      var spy = sinon.spy(function (data, next, done) {
        data.context = { random: 'property' };
        done();
      });

      App.middleware.use('completion:context', spy);

      expect(testAutocomplete('something.ran')).to.contain('random');
      expect(spy).to.have.been.calledOnce;

      App.middleware.disuse('completion:context', spy);
    });

    it('should be able to hook into property completion', function () {
      var spy = sinon.spy(function (data, next) {
        data.results.somethingElse = true;
        next();
      });

      App.middleware.use('completion:property', spy);

      expect(testAutocomplete('moreOf.some')).to.contain('somethingElse');
      expect(spy).to.have.been.calledOnce;

      App.middleware.disuse('completion:property', spy);
    });
  });
});
