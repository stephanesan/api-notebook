var _       = require('underscore');
var url     = require('url');
var connect = require('connect');
var request = require('request');
var app     = connect();

/**
 * Uses a simple object representation of urls to merge additional data with
 * proxied requests. Port this to use RAML ASAP.
 *
 * @type {Object}
 */
var mergeData = {
  'github.com/login/oauth/access_token': {
    'client_id':     process.env.GITHUB_CLIENT_ID,
    'client_secret': process.env.GITHUB_CLIENT_SECRET
  }
};

// Log requests in dev.
app.use(connect.logger('dev'));

// Enables cross-domain requests.
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
  return next();
});

// Serve the regular static directory.
app.use(connect.static('build'));

// Serve a simple HTTP proxy.
app.use(function (req, res, next) {
  if (req.url.substr(0, 7) !== '/proxy/') {
    return next();
  }

  var data  = {};

  var uri   = data.uri = url.parse(req.url.substr(7));
  var qs    = data.qs  = uri.query || {};
  var route = uri.host + uri.pathname;

  // Extends the query string with additonal query data.
  _.extend(qs, mergeData[route]);

  // Remove any `x-forwarded-*` headers set by the upstream proxy (E.g. Heroku)
  // Keeping these headers may cause APIs to do unexpected things, such as
  // Github which redirects requests when `x-forwarded-proto` === `http`.
  _.each(req.headers, function (_, key) {
    if (key.substr(0, 11) === 'x-forwarded') {
      delete req.headers[key];
    }
  });

  var proxy = request(data);

  // Send the proxy error to the client.
  proxy.on('error', function (err) {
    res.writeHead(500);
    return res.end(err.message);
  });

  // Pipe the request data directly into the proxy request and back to the
  // response object. This avoids having to buffer the request body in cases
  // where they could be unexepectedly large and/or slow.
  return req.pipe(proxy).pipe(res);
});

// Create the http app and listen to application port.
app.listen(process.env.PORT || 3000);
