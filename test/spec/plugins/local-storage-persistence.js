/* global describe, it, before, after */

describe('Local Storage Persistence Plugin', function () {
  var id       = '213';
  var notebook = '---\ntitle: Test Notebook\n---\n\n# Testing localStorage';

  beforeEach(function () {
    App.persistence.reset();
    App.middleware.use(localStoragePersistencePlugin);
  });

  afterEach(function () {
    localStorage.removeItem('notebook-' + id);
    App.middleware.disuse(localStoragePersistencePlugin);
  });

  it.skip('should save to localStorage with a made up id', function (done) {
    App.persistence.set('id',       id);
    App.persistence.set('contents', notebook);

    App.persistence.save(function (err) {
      expect(err).to.not.exist;
      expect(App.persistence.get('id')).to.equal(id);
      expect(App.persistence.get('contents')).to.equal(notebook);

      return done();
    });
  });

  it.skip('should load the id from localStorage', function (done) {
    App.persistence.set('id', id);
    localStorage.setItem('notebook-' + id, notebook);

    App.persistence.load(function (err) {
      expect(err).to.not.exist;
      expect(App.persistence.get('contents')).to.equal(notebook);

      return done();
    });
  });
});
