/* global describe, it */

describe('Object Inspector', function () {
  var Inspector = App.View.Inspector;
  var fixture   = document.getElementById('fixture');

  it('should exist', function () {
    expect(Inspector).to.be.a('function');
  });

  describe('functionality', function () {
    var inputOutput = function (input, output) {
      var inspector = new Inspector({ inspect: input, context: window });
      inspector.render();
      var el = inspector.previewEl.getElementsByClassName('object')[0];
      if (output instanceof RegExp) {
        expect(el.textContent).to.match(output);
      } else {
        expect(el.textContent).to.equal(output);
      }
    };

    it('should inspect string', function () {
      inputOutput('test', '"test"');
    });

    it('should inspect null', function () {
      inputOutput(null, 'null');
    });

    it('should inspect undefined', function () {
      inputOutput(undefined, 'undefined');
    });

    it('should inspect numbers', function () {
      inputOutput(55, '55');
    });

    it('should inspect booleans', function () {
      inputOutput(true, 'true');
    });

    it('should inspect arrays', function () {
      inputOutput([1, 2, 3], '[1, 2, 3]');
    });

    it('should inspect objects', function () {
      inputOutput({ testing: true }, '{ "testing": true }');
    });

    it('should inspect functions', function () {
      inputOutput(
        function () { return 'test' },
        'function () { return \'test\' }'
      );
    });

    it('should inspect dates', function () {
      inputOutput(
        new Date(1995, 11, 17, 3, 24, 0),
        /^Sun Dec 17 1995 03:24:00/
      );
    });

    it('should inspect regular expressions', function () {
      inputOutput(/test/i, '/test/i');
      inputOutput(/(passing)?/, '/(passing)?/');
    });

    it('should inspect elements', function () {
      inputOutput(document.createElement('div'), '<div></div>');
    });

    it('should inspect errors', function () {
      inputOutput(new Error('Test Error'), 'Error: Test Error');
    });
  });
});
