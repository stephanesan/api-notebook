/* global describe, it */

describe('Embeddable Widget', function () {
  var fixture = document.getElementById('fixture');

  it('should exist', function () {
    expect(Notebook).to.exist;
  });

  it('should append to a DOM node', function () {
    expect(fixture.childNodes.length).to.equal(0);

    var notebook = new Notebook(fixture);

    expect(fixture.childNodes.length).to.equal(1);
    expect(fixture.childNodes[0]).to.equal(notebook.frame);

    notebook.remove();
  });

  it('should accept a custom append function', function () {
    expect(fixture.childNodes.length).to.equal(0);

    var notebook = new Notebook(function (el) {
      fixture.appendChild(el);
    });

    expect(fixture.childNodes.length).to.equal(1);
    expect(fixture.childNodes[0]).to.equal(notebook.frame);

    notebook.remove();
  });
});
