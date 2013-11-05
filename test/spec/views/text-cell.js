/* global describe, it */

describe('Text Cell', function () {
  var Text    = App.View.TextCell;
  var fixture = document.getElementById('fixture');

  it('should exist', function () {
    expect(Text).to.be.a('function');
  });

  describe('Text Cell instance', function () {
    var view;

    beforeEach(function () {
      view = new Text();
    });

    it('should have a class', function () {
      expect(view.el.className).to.contain('cell');
      expect(view.el.className).to.contain('cell-text');
    });

    describe('Using the editor', function () {
      var editor;

      beforeEach(function () {
        view   = view.render().appendTo(fixture).focus();
        editor = view.editor;
      });

      afterEach(function () {
        view.remove();
      });

      it('should be a markdown editor', function () {
        expect(editor.getOption('mode')).to.equal('gfm');
      });
    });
  });
});
