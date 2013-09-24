/* global describe, it, beforeEach, afterEach */

describe('RAML Client Generator Plugin', function () {
  var fixture      = document.getElementById('fixture');
  var methods      = ['get', 'head', 'post', 'put', 'patch', 'delete'];
  var methodBodies = App._.without(methods, 'get', 'head');
  var sandbox;

  beforeEach(function () {
    sandbox = new App.Sandbox();
    ramlClientGeneratorPlugin.attach(App.middleware);
  });

  afterEach(function () {
    sandbox.remove();
    ramlClientGeneratorPlugin.detach(App.middleware);
  });

  it('should augment execution context with an `API` method', function (done) {
    sandbox.execute('API', function (err, exec) {
      expect(exec.result).to.be.an('object');

      return done();
    });
  });

  describe('Example RAML document', function () {
    var server;

    beforeEach(function (done) {
      sandbox.execute('API.createClient("example", "' + NOTEBOOK_URL + '/raml/example.yml");', function (err) {
        server = sinon.fakeServer.create();
        return done(err);
      });
    });

    afterEach(function () {
      server.restore();
    });

    var fakeRequest = function (execute, method, route, beforeRespond) {
      return function (done) {
        server.respondWith(function (request) {
          var response = [
            200,
            {
              'Content-Type': 'application/json'
            },
            'Example Response Text'
          ];

          if (beforeRespond) {
            response = beforeRespond(request, response) || response;
          }

          // Only respond when the request matches.
          if (request.method === method && request.url === 'http://example.com' + route) {
            return request.respond.apply(request, response);
          }
        });

        sandbox.execute(execute, function (err, exec) {
          expect(exec.isError).to.be.false;
          expect(exec.result).to.include.keys('responseText', 'statusText');
          return done(err, exec);
        });

        // Sandbox `execute` method is async.
        App.nextTick(function () {
          server.respond();
        });
      };
    };

    var testRequest = function (chain, method, route) {
      return fakeRequest(
        'API.example' + chain + '.' + method + '();', method, route
      );
    };

    var testRequestBody = function (chain, method, route, data) {
      return function (done) {
        return fakeRequest(
          'API.example' + chain + '.' + method + '(' + JSON.stringify(data) + ');', method, route, function (request, response) {
            response[2] = request.requestBody;
          }
        )(function (err, exec) {
          expect(exec.result.responseText).to.equal(data);
          return done(err);
        });
      };
    };

    var testRequestHeaders = function (chain, method, route, headers) {
      return function (done) {
        return fakeRequest(
          'API.example' + chain + '.' + method + '();', method, route, function (request, response) {
            response[1] = request.requestHeaders;
          }
        )(function (err, exec) {
          App._.each(headers, function (value, header) {
            expect(exec.result.getResponseHeader(header)).to.equal(value);
          });
          return done(err);
        });
      };
    };

    describe('Root Function', function () {
      it('should be able to execute the root variable as a function', function (done) {
        sandbox.execute('API.example("/test");', function (err, exec) {
          expect(err).to.not.exist;
          expect(exec.result).to.include.keys(methods);
          return done();
        });
      });

      it('should allow interpolation of the passed in string', function (done) {
        sandbox.execute('API.example("/{test}", { test: "there" });', function (err, exec) {
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

          return testRequest(
            '("' + route + '", ' + JSON.stringify(context) + ')', method, properRoute
          );
        };

        describe('Regular Strings', function () {
          App._.each(methods, function (method) {
            it(
              'should make ' + method + ' requests',
              testFunctionRequest('/test/route', undefined, method)
            );
          });
        });

        describe('Template Strings', function () {
          App._.each(methods, function (method) {
            it(
              'should make ' + method + ' requests',
              testFunctionRequest('/{test}/{variable}/{test}', {
                test: 'here',
                variable: 'there'
              }, method, '/here/there/here')
            );
          });
        });

        describe('Custom Query Strings', function () {
          describe('Strings', function () {
            App._.each(methods, function (method) {
              it(
                'should be able to attach query strings to ' + method + ' requests',
                testRequest('("/test/route").query("test=true")', method, '/test/route?test=true')
              );
            });
          });

          describe('Objects', function () {
            App._.each(methods, function (method) {
              it(
                'should be able to attach query strings to ' + method + ' requests',
                testRequest('("/test/route").query({ test: true })', method, '/test/route?test=true')
              );
            });
          });
        });

        describe('Custom Callbacks', function () {
          App._.each(methods, function (method) {
            xit(
              'should be able to pass custom callbacks to ' + method + ' requests',
              fakeRequest(
                'API.example("/test/route").' + method + '(' + (App._.contains(methodBodies, method) ? 'null, ' : '') + 'async())',
                method,
                '/test/route'
              )
            );
          });
        });

        describe('Custom Request Bodies', function () {
          App._.each(methodBodies, function (method) {
            it(
              'should be able to pass custom request bodies with ' + method + ' requests',
              testRequestBody(
                '("/test/route")', method, '/test/route', 'Test data'
              )
            );
          });
        });

        describe('Custom Headers', function () {
          App._.each(methods, function (method) {
            it(
              'should be able to attach custom headers to ' + method + ' requests',
              testRequestHeaders(
                '("/test/route").headers({ "X-Test-Header": "Test" })',
                method,
                '/test/route',
                {
                  'X-Test-Header': 'Test'
                }
              )
            );
          });
        });

        describe('Custom Headers and Query String', function () {
          App._.each(methods, function (method) {
            it(
              'should be able to attach custom headers and queries to ' + method + ' requests',
              testRequestHeaders(
                '("/test/route").headers({ "X-Test-Header": "Test" }).query("test=true")',
                method,
                '/test/route?test=true',
                {
                  'X-Test-Header': 'Test'
                }
              )
            );
          });
        });
      });
    });

    describe('Predefined Routes', function () {
      it('should have defined a normal route', function (done) {
        sandbox.execute('API.example.collection;', function (err, exec) {
          expect(exec.result).to.be.a('function');
          expect(exec.result).to.include.keys('get', 'post');
          return done(err);
        });
      });

      it('should handle route name clashes with variables', function (done) {
        sandbox.execute('API.example.collection("test");', function (err, exec) {
          expect(exec.result).to.include.keys('get', 'post')
            .and.not.include.keys('put', 'patch', 'delete');
          return done(err);
        });
      });

      it('should be able to nest routes', function (done) {
        sandbox.execute('API.example.collection.collectionId;', function (err, exec) {
          expect(exec.result).to.be.a('function');
          return done(err);
        });
      });

      it('should be able to nest routes under variable routes', function (done ){
        sandbox.execute('API.example.collection.collectionId("123").nestedId;', function (err, exec) {
          expect(exec.result).to.be.a('function');
          return done(err);
        });
      });

      it('should be able to add routes with combined text and variables', function (done) {
        sandbox.execute('API.example.mixed;', function (err, exec) {
          expect(exec.result).to.be.a('function');
          return done(err);
        });
      });

      it('should return an error when not passing the variable', function (done) {
        sandbox.execute('API.example.collection.collectionId();', function (err, exec) {
          expect(exec.isError).to.be.true;
          expect(exec.result.message).to.include('Insufficient parameters');
          return done(err);
        });
      });

      it('should return an error when passing insufficient parameters', function (done) {
        sandbox.execute('API.example.mixed("test");', function (err, exec) {
          expect(exec.isError).to.be.true;
          expect(exec.result.message).to.include('Insufficient parameters');
          return done(err);
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
          'should respond to `collection.collectionId("123").get()`',
          testRequest('.collection.collectionId("123")', 'get', '/collection/123')
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
          'should respond to `collection.collectionId("123").nestedId("456").get()`',
          testRequest(
            '.collection.collectionId("123").nestedId("456")', 'get', '/collection/123/456'
          )
        );

        it(
          'should respond to `mixed("123", "456").get()`',
          testRequest('.mixed("123", "456")', 'get', '/mixed123456')
        );

        describe('Custom Query Strings', function () {
          describe('Strings', function () {
            App._.each(methods, function (method) {
              it(
                'should be able to attach query strings to ' + method + ' requests',
                testRequest(
                  '.collection.collectionId("123").query("test=true")',
                  method,
                  '/collection/123?test=true'
                )
              );
            });
          });

          describe('Objects', function () {
            App._.each(methods, function (method) {
              it(
                'should be able to attach query strings to ' + method + ' requests',
                testRequest(
                  '.collection.collectionId("123").query({ test: true })',
                  method,
                  '/collection/123?test=true'
                )
              );
            });
          });
        });

        describe('Custom Callbacks', function () {
          App._.each(methods, function (method) {
            xit(
              'should be able to pass custom callbacks to ' + method + ' requests',
              fakeRequest(
                'API.example.collection.collectionId("123").' + method + '(' + (App._.contains(methodBodies, method) ? 'null, ' : '') + 'async())',
                method,
                '/collection/123'
              )
            );
          });
        });

        describe('Custom Request Bodies', function () {
          App._.each(methodBodies, function (method) {
            it(
              'should be able to pass custom request bodies with ' + method + ' requests',
              testRequestBody(
                '.collection.collectionId("123")', method, '/collection/123', 'Test data'
              )
            );
          });
        });

        describe('Custom Headers', function () {
          App._.each(methods, function (method) {
            it(
              'should be able to attach custom headers to ' + method + ' requests',
              testRequestHeaders(
                '.collection.collectionId("123").headers({ "X-Test-Header": "Test" })',
                method,
                '/collection/123',
                {
                  'X-Test-Header': 'Test'
                }
              )
            );
          });
        });

        describe('Custom Headers and Query String', function () {
          App._.each(methods, function (method) {
            it(
              'should be able to attach custom headers and query to ' + method + ' requests',
              testRequestHeaders(
                '.collection.collectionId("123").headers({ "X-Test-Header": "Test" }).query("test=true")',
                method,
                '/collection/123?test=true',
                {
                  'X-Test-Header': 'Test'
                }
              )
            );
          });
        });

        describe('Validation Rules', function () {
          // An object representation of the tests to run with pass and failure
          // test cases.
          var validationTest = {
            string: {
              basic: {
                pass: ['test', undefined],
                fail: [123]
              },
              enum: {
                pass: ['test'],
                fail: ['string', 123]
              },
              pattern: {
                pass: ['test'],
                fail: ['string', 123]
              },
              minLength: {
                pass: ['string'],
                fail: ['test', 123]
              },
              maxLength: {
                pass: ['test'],
                fail: ['string', 123]
              },
              required: {
                pass: ['test'],
                fail: [undefined, null, 123]
              }
            },
            number: {
              basic: {
                pass: [123.5, undefined],
                fail: ['123']
              },
              minimum: {
                pass: [10.5],
                fail: ['3', 3.5]
              },
              maximum: {
                pass: [3.5],
                fail: ['10', 10.5]
              },
              required: {
                pass: [123.5],
                fail: [undefined, null, '123']
              }
            },
            integer: {
              basic: {
                pass: [123, undefined],
                fail: ['123', 123.5]
              },
              minimum: {
                pass: [10],
                fail: ['3', 3, 7.5]
              },
              maximum: {
                pass: [3],
                fail: ['10', 2.5, 10]
              },
              required: {
                pass: [123],
                fail: [undefined, null, '123', 123.5]
              }
            },
            date: {
              basic: {
                pass: [new Date(), undefined],
                fail: [123456, '123456']
              },
              required: {
                pass: [new Date()],
                fail: [null, undefined, 123456, '123456']
              }
            },
            boolean: {
              basic: {
                pass: [true, false, undefined],
                fail: [1, 0, '', 'test']
              },
              required: {
                pass: [true, false],
                fail: [null, undefined, 1, 0, '', 'test']
              }
            }
          };

          var stringify = function (value) {
            if (App._.isDate(value)) {
              return 'new Date("' + value + '")';
            }

            return JSON.stringify(value);
          };

          App._.each(validationTest, function (tests, route) {
            App._.each(tests, function (test, resource) {
              App._.each(test.pass, function (value) {
                it('should validate ' + resource + ' ' + route + ' with ' + stringify(value), function (done) {
                  sandbox.execute(
                    'API.example.validation.' + route + '.' + resource + '(' + stringify(value) + ');',
                    function (err, exec) {
                      expect(exec.isError).to.be.false;
                      expect(exec.result).to.have.keys(methods.concat('query', 'headers'));
                      return done(err);
                    }
                  );
                });
              });

              App._.each(test.fail, function (value) {
                it('should fail to validate ' + resource + ' ' + route + ' with ' + stringify(value), function (done) {
                  sandbox.execute(
                    'API.example.validation.' + route + '.' + resource + '(' + stringify(value) + ');',
                    function (err, exec) {
                      expect(exec.isError).to.be.true;
                      expect(exec.result).to.be.an.instanceof(Error);
                      return done(err);
                    }
                  );
                });
              });
            });
          });
        });
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
      });

      it('should do autocomplete the root function', function (done) {
        testAutocomplete('API.example("/test").', function (results) {
          expect(results).to.include.members(methods.concat('query', 'headers'));

          return done();
        });
      });

      it('should autocomplete function properties', function (done) {
        testAutocomplete('API.example.collection.', function (results) {
          expect(results).to.include.members(['get', 'post', 'collectionId', 'query', 'headers']);

          return done();
        });
      });

      it('should autocomplete variable route', function (done) {
        testAutocomplete('API.example.collection("123").', function (results) {
          expect(results).to.include.members(['get', 'post', 'query', 'headers']);

          return done();
        });
      });

      it('should autocomplete nested variable routes', function (done) {
        testAutocomplete('API.example.collection.collectionId("123").nestedId("456").', function (results) {
          expect(results).to.include.members(['get', 'query', 'headers']);

          return done();
        });
      });

      it('should autocomplete with combined text and variables', function (done) {
        testAutocomplete('API.example.mixed("123", "456").', function (results) {
          expect(results).to.include.members(['get', 'query', 'headers']);

          return done();
        });
      });

      it('should not repeat query or other routes after using query', function (done) {
        testAutocomplete('API.example.collection.query("test=true").', function (results) {
          expect(results).to.not.include.members(['collectionId', 'query']);

          return done();
        });
      });

      it('should not repeat headers or other routes after using headers', function (done) {
        testAutocomplete('API.example.collection.headers({ test: true }).', function (results) {
          expect(results).to.not.include.members(['collectionId', 'headers']);

          return done();
        });
      });

      it('should not repeat either headers or query after using both', function (done) {
        testAutocomplete('API.example.collection.headers({ test: true }).query("test=true").', function (results) {
          expect(results).to.not.include.members(['collectionId', 'headers', 'query']);

          return done();
        });
      });
    });
  });
});
