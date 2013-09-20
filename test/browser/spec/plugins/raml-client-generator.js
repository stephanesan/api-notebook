/* global describe, it, beforeEach, afterEach */

describe('RAML Client Generator Plugin', function () {
  var fixture = document.getElementById('fixture');
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

        it('should be able to create multiple request instances', function (done) {
          server.respondWith(
            'GET',
            'http://example.com/test/route',
            [200, {
              'Content-Type': 'application/json'
            }, 'Example Response Text']
          );

          App.Library.async.series([
            App._.bind(sandbox.execute, sandbox, 'var test = Api.example("/test/route");'),
            // Creates a separate request object.
            App._.bind(sandbox.execute, sandbox, 'var another = Api.example("/another/route");'),
            // Tests the original request object.
            function (next) {
              sandbox.execute('test.get();', next);

              // Sandbox async execution.
              return App.nextTick(function () {
                server.respond();
              });
            },
          ], function (err, results) {
            expect(err).to.not.exist;

            App._.each(results, function (exec) {
              expect(exec.isError).to.be.false;
            });

            return done();
          });
        });

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

        it(
          'should be able to attach query string parameters',
          testRequest('("/test/route").query("test=true")', 'get', '/test/route?test=true')
        );

        it(
          'should be able to attach query string as an object',
          testRequest('("/test/route").query({ test: true })', 'get', '/test/route?test=true')
        );
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
        it('should be able to create multiple request instances', function (done) {
          server.respondWith(
            'GET',
            'http://example.com/collection/123/456',
            [200, {
              'Content-Type': 'application/json'
            }, 'Example Response Text']
          );

          App.Library.async.series([
            App._.bind(sandbox.execute, sandbox, 'var test = Api.example.collection.collectionId(123).nestedId(456);'),
            // Creates a separate request object.
            App._.bind(sandbox.execute, sandbox, 'var another = Api.example.collection.collectionId(987).nestedId(654);'),
            // Tests the original request object.
            function (next) {
              sandbox.execute('test.get();', next);

              // Sandbox async execution.
              return App.nextTick(function () {
                server.respond();
              });
            },
          ], function (err, results) {
            expect(err).to.not.exist;

            App._.each(results, function (exec) {
              expect(exec.isError).to.be.false;
            });

            return done();
          });
        });

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

        it(
          'should be able to attach query string parameters',
          testRequest('.collection.query("test=true")', 'get', '/collection?test=true')
        );

        it(
          'should be able to attach query string parameters with variable routes',
          testRequest('.collection.collectionId(123).nestedId(456).query("test=true")', 'get', '/collection/123/456?test=true')
        );

        it(
          'should be able to attach query string as an object',
          testRequest('.collection.query({ test: true })', 'get', '/collection?test=true')
        );
      });
    });

    describe('Completion Support (using `@return`)', function () {
      var view;

      var testAutocomplete = function (text, done) {
        return testCompletion(view.editor, text, done);
      };

      beforeEach(function () {
        functionReturnPlugin.attach(App.middleware);

        view = new App.View.CodeCell({
          sandbox: sandbox
        });

        view.model.collection = {
          indexOf:     sinon.stub().returns(0),
          getNextCode: sinon.stub().returns(undefined),
          getPrevCode: sinon.stub().returns(undefined)
        };

        view.render().appendTo(fixture);
      });

      afterEach(function () {
        functionReturnPlugin.detach(App.middleware);

        view.remove();
        delete window.test;
      });

      it('should do autocomplete the root function', function (done) {
        testAutocomplete('Api.example("/test").', function (results) {
          expect(results).to.include.members(methods)

          return done();
        });
      });

      it('should autocomplete function properties', function (done) {
        testAutocomplete('Api.example.collection.', function (results) {
          expect(results).to.include.members(['get', 'post', 'collectionId']);

          return done();
        });
      });

      it('should autocomplete variable route', function (done) {
        testAutocomplete('Api.example.collection(123).', function (results) {
          expect(results).to.include.members(['get', 'post']);

          return done();
        });
      });

      it('should autocomplete nested variable routes', function (done) {
        testAutocomplete('Api.example.collection.collectionId(123).nestedId(456).', function (results) {
          expect(results).to.contain('get');

          return done();
        });
      });

      it('should autocomplete with combined text and variables', function (done) {
        testAutocomplete('Api.example.mixed(123, 456).', function (results) {
          expect(results).to.contain('get');

          return done();
        });
      });
    });
  });
});
