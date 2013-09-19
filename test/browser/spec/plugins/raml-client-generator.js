/* global describe, it, beforeEach, afterEach */

describe('RAML Client Generator Plugin', function () {
  var methods = ['get', 'post', 'put', 'patch', 'delete'];
  var sandbox;

  beforeEach(function () {
    sandbox = new App.Sandbox();
    ramlClientGeneratorPlugin.attach(App.middleware);
  });

  afterEach(function () {
    sandbox.remove();
    ramlClientGeneratorPlugin.detach(App.middleware);
  });

  it('should augment execution context with an `Api` method', function (done) {
    sandbox.execute('Api', function (err, exec) {
      expect(exec.result).to.be.a('function');

      return done();
    });
  });

  describe('Example RAML document', function () {
    var server;

    beforeEach(function (done) {
      sandbox.execute('Api("example", "' + NOTEBOOK_URL + '/raml/example.yml");', function (err) {
        server = sinon.fakeServer.create();
        return done(err);
      });
    });

    afterEach(function () {
      server.restore();
    });

    var testRequest = function (chain, method, route) {
      return function (done) {
        server.respondWith(
          method.toUpperCase(),
          'http://example.com' + route,
          [200, {
            'Content-Type': 'application/json'
          }, 'Example Response Text']
        );

        sandbox.execute('Api.example' + chain + '.' + method + '();', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.result).to.include.keys('responseText', 'statusText');
          expect(exec.result.statusText).to.equal('OK');
          expect(exec.result.responseText).to.equal('Example Response Text');
          return done();
        });

        // Sandbox `execute` method is async.
        App.nextTick(function () {
          server.respond();
        });
      };
    };

    describe('Root Function', function () {
      it('should be able to execute the root variable as a function', function (done) {
        sandbox.execute('Api.example("/test");', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.result).to.include.keys(methods);
          return done();
        });
      });

      it('should allow interpolation of the passed in string', function (done) {
        sandbox.execute('Api.example("/{test}", { test: "there" });', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.result).to.include.keys(methods);
          return done();
        });
      });

      describe('Making Requests', function () {
        var testFunctionRequest = function (route, context, method, properRoute) {
          if (arguments.length < 4) {
            properRoute = route;
          }

          return function (done) {
            return testRequest(
              '("' + route + '", ' + JSON.stringify(context) + ')', method, properRoute
            )(done);
          };
        };

        describe('Regular Strings', function () {
          App._.each(methods, function (method) {
            it(
              'should make ' + method.toUpperCase() + ' requests',
              testFunctionRequest('/test/route', undefined, method)
            );
          });
        });

        describe('Template Strings', function () {
          App._.each(methods, function (method) {
            it(
              'should make ' + method.toUpperCase() + ' requests',
              testFunctionRequest('/{test}/{variable}/{test}', {
                test: 'here',
                variable: 'there'
              }, method, '/here/there/here')
            );
          });
        });
      });
    });

    describe('Predefined Routes', function () {
      it('should have defined a normal route', function (done) {
        sandbox.execute('Api.example.collection;', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.result).to.be.a('function');
          expect(exec.result).to.include.keys('get', 'post');
          return done();
        });
      });

      it('should handle route name clashes with variables', function (done) {
        sandbox.execute('Api.example.collection("test");', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.result).to.include.keys('get', 'post')
            .and.not.include.keys('put', 'patch', 'delete');
          return done();
        });
      });

      it('should be able to nest routes', function (done) {
        sandbox.execute('Api.example.collection.collectionId;', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.result).to.be.a('function');
          return done();
        });
      });

      it('should be able to nest routes under variable routes', function (done ){
        sandbox.execute('Api.example.collection.collectionId(123).nestedId;', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.result).to.be.a('function');
          return done();
        });
      });

      it('should be able to add routes with combined text and variables', function (done) {
        sandbox.execute('Api.example.mixed;', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.result).to.be.a('function');
          return done();
        });
      });

      it('should return an error when not passing the variable', function (done) {
        sandbox.execute('Api.example.collection.collectionId();', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.isError).to.be.true;
          expect(exec.result.message).to.include('Insufficient parameters');
          return done();
        });
      });

      it('should return an error when passing insufficient parameters', function (done) {
        sandbox.execute('Api.example.mixed("test");', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.isError).to.be.true;
          expect(exec.result.message).to.include('Insufficient parameters');
          return done();
        });
      });

      describe('Making Requests', function () {
        it(
          'should respond to `collection.get()`',
          testRequest('.collection', 'get', '/collection')
        );

        it(
          'should respond to `collection.post()`',
          testRequest('.collection', 'post', '/collection')
        );

        it(
          'should respond to `collection.collectionId(123).get()`',
          testRequest('.collection.collectionId(123)', 'get', '/collection/123')
        );

        it(
          'should respond to `collection("test").get()`',
          testRequest('.collection("test")', 'get', '/test')
        );

        it(
          'should respond to `collection("test").post()`',
          testRequest('.collection("test")', 'post', '/test')
        );

        it(
          'should respond to `collection.collectionId(123).nestedId(456).get()`',
          testRequest(
            '.collection.collectionId(123).nestedId(456)', 'get', '/collection/123/456'
          )
        );

        it(
          'should respond to `mixed(123, 456).get()`',
          testRequest('.mixed(123, 456)', 'get', '/mixed123456')
        );
      });
    });
  });
});
