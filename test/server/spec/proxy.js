var nock    = require('nock');
var request = require('../request');

describe('Proxy', function () {
  it('should proxy http requests', function (done) {
    nock('http://example.com')
      .get('/')
      .reply(200, 'Hello World!', {
        'Content-Type': 'application/json',
        'Content-Length': '12'
      });

    request
      .get('/proxy/http://example.com')
      .expect('Content-Type', /json/)
      .expect('Content-Length', '12')
      .expect('Hello World!')
      .expect(200, done);
  });

  it('should pass through query string params', function (done) {
    nock('http://example.com')
      .get('/test?query=string')
      .reply(200, 'Hello World!', {
        'Content-Type': 'application/json',
        'Content-Length': '12'
      });

    request
      .get('/proxy/http://example.com/test?query=string')
      .expect('Content-Type', /json/)
      .expect('Content-Length', '12')
      .expect('Hello World!')
      .expect(200, done);
  });

  it('should pass through request headers', function (done) {
    nock('http://example.com')
      .matchHeader('User-Agent', /Mozilla\/.*/)
      .get('/')
      .reply(200, 'Hello World!', {
        'Content-Type': 'application/json',
        'Content-Length': '12'
      });

    request
      .get('/proxy/http://example.com')
      .set('User-Agent', 'Mozilla/5.0')
      .expect('Content-Type', /json/)
      .expect('Content-Length', '12')
      .expect('Hello World!')
      .expect(200, done);
  });
});
