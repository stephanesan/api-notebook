/* global describe, it */

describe('Notebook Collection', function () {
  var Collection = App.Collection.Notebook;

  it('should exist', function () {
    expect(Collection).to.be.a('function');
  });

  describe('notebook instance', function () {
    var collection;

    beforeEach(function () {
      collection = new Collection();
    });

    describe('deserializing from gist text', function () {
      it('should deserialize text', function () {
        var models = collection.deserializeFromGist('test\ntext');

        expect(models.length).to.equal(1);
        expect(models[0].type).to.equal('text');
        expect(models[0].value).to.equal('test\ntext');
      });

      it('should deserialize code', function () {
        var models = collection.deserializeFromGist(
          '```javascript\ntest\ncode\n```'
        );

        expect(models.length).to.equal(1);
        expect(models[0].type).to.equal('code');
        expect(models[0].value).to.equal('test\ncode');
      });


      it('should deserialize code and text', function () {
        var models = collection.deserializeFromGist(
          '```javascript\ntest\ncode\n```\n\ntest\ntext'
        );

        expect(models.length).to.equal(2);
        expect(models[0].type).to.equal('code');
        expect(models[0].value).to.equal('test\ncode');
        expect(models[1].type).to.equal('text');
        expect(models[1].value).to.equal('test\ntext');
      });

      it('should deserialize mutliple code blocks', function () {
        var models = collection.deserializeFromGist(
          '```javascript\ntest\n```\n\n```javascript\ncode\n```'
        );

        expect(models.length).to.equal(2);
        expect(models[0].type).to.equal('code');
        expect(models[0].value).to.equal('test');
        expect(models[1].type).to.equal('code');
        expect(models[1].value).to.equal('code');
      });

      it('should deserialize empty code cells', function () {
        var models = collection.deserializeFromGist(
          '```javascript\n\n```'
        );

        expect(models.length).to.equal(1);
        expect(models[0].type).to.equal('code');
        expect(models[0].value).to.equal('');
      });
    });

    describe('serializing to gist text', function () {
      it('should serialize text', function () {
        collection.push({
          type:  'text',
          value: 'text\nhere'
        });

        var text = collection.serializeForGist();

        expect(text).to.equal('text\nhere');
      });

      it('should serialize code', function () {
        collection.push({
          type:  'code',
          value: 'code\nhere'
        });

        var text = collection.serializeForGist();

        expect(text).to.equal('```javascript\ncode\nhere\n```');
      });

      it('should serialize empty code cells', function () {
        collection.push({
          type:  'code',
          value: ''
        });

        var text = collection.serializeForGist();

        expect(text).to.equal('```javascript\n\n```');
      });

      it('should serialize code and text', function () {
        collection.push({
          type:  'code',
          value: 'code\nhere'
        });
        collection.push({
          type:  'text',
          value: 'text\nhere'
        });

        var text = collection.serializeForGist();

        expect(text).to.equal('```javascript\ncode\nhere\n```\n\ntext\nhere');
      });
    });
  });
});
