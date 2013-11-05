var connect = require('connect');
var request = require('request');
var app     = connect();

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

  var url = req.url.substr(7);

  // Attach the client secret to any Github access token requests.
  if (/^https?:\/\/github.com\/login\/oauth\/access_token/.test(url)) {
    url += (url.indexOf('?') > -1 ? '&' : '?');
    url += 'client_secret=';
    url += encodeURIComponent(process.env.GITHUB_CLIENT_SECRET);
  }

  var proxy = request(url);

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
