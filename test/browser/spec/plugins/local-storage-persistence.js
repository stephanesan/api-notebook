/* global describe, it, beforeEach, afterEach */

describe('Local Storage Persistence Plugin', function () {
  var id       = '213';
  var notebook = '# Testing localStorage';

  beforeEach(function () {
    localStoragePersistencePlugin.attach(App.middleware);
  });

  afterEach(function () {
    App.persistence.reset();
    localStorage.removeItem('notebook-' + id);
    localStoragePersistencePlugin.detach(App.middleware);
  });

  it('should save to localStorage with a made up id', function (done) {
    App.persistence.set('id',       id);
    App.persistence.set('notebook', notebook);

    App.persistence.save(function (err, content) {
      expect(content).to.equal(notebook);
      expect(App.persistence.get('id')).to.equal(id);
      expect(localStorage.getItem('notebook-' + id)).to.equal(notebook);

      done();
    });
  });

  it('should load the id from localStorage', function (done) {
    App.persistence.set('id', id);
    localStorage.setItem('notebook-' + id, notebook);

    App.persistence.load(function (err, content) {
      expect(content).to.equal(notebook);

      done();
    });
  });
});
