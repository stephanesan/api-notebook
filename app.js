var express  = require('express');
var app      = module.exports = express();
var path     = require('path');
var passport = require('./lib/passport');

var PORT           = process.env.PORT || 8000;
var STATIC_DIR     = path.join(__dirname, 'build');
var SESSION_SECRET = 'keyboard cat';

app.configure(function () {
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.session({ secret: SESSION_SECRET }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(express.static(STATIC_DIR));
});

app.configure('development', function () {
  app.use(express.errorHandler());
});

app.use(require('./routes'));

// Any other id based URLs should fall through to serving up index.html
app.get(/^\/(\w{20})$/, function (req, res) {
  res.sendfile(path.join(STATIC_DIR, 'index.html'));
});

app.listen(PORT, function () {
  console.log('Server listening on port ' + PORT);
});
