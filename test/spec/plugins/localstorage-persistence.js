/* global describe, it */

describe('Local Storage Persistence Plugin', function () {
  beforeEach(function () {
    localstoragePersistencePlugin.attach(App.middleware);
  });

  afterEach(function () {
    App.persistence.reset();
    localstoragePersistencePlugin.detach(App.middleware);
  });

  describe('Id', function () {
    var text = '# Testing localStorage';
    var id;

    it('should save to localStorage with a made up id', function (done) {
      App.persistence.set('notebook', text);

      App.persistence.save(function (err, notebook) {
        expect(notebook).to.equal(text);
        expect(id = App.persistence.get('id')).to.exist;

        done();
      });
    });

    it('should load the id from localstorage', function (done) {
      App.persistence.load(id, function (err, notebook) {
        expect(notebook).to.equal(text);

        localStorage.clear();
        done();
      });
    });
  });
});
