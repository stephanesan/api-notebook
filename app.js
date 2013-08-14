var express = require('express');
var express  = require('express');
var app      = module.exports = express();
var path     = require('path');
var passport = require('./lib/passport');

var PORT           = process.env.PORT || 8000;
var SESSION_SECRET = 'keyboard cat';

app.configure(function() {
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: SESSION_SECRET }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(express.static(path.join(__dirname, 'build')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.use(require('./routes'));

app.listen(PORT, function () {
  console.log('Server listening on port ' + PORT);
});
