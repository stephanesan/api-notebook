// Client ID = a7f8014691fcc748aced
// Client Secret = ea758e7cde897016e56dd816c901d82c82568964
/*jshint node: true, devel: true*/

// node-github : https://github.com/ajaxorg/node-github/
//               http://ajaxorg.github.io/node-github/
// passportjs  : http://passportjs.org/


var CONFIG = require('config'),
    express = require('express'),
    engine = require('ejs-locals'),
    passport = require('passport'),
    path = require('path'),
    util = require('util'),
    GitHubStrategy = require('passport-github').Strategy;

var GitHubApi = require("github");

var github = new GitHubApi({
    // required
    version: CONFIG.clients.github.version,
    // optional
    timeout: CONFIG.clients.github.timeout
  });

// Some things should never change.
CONFIG.makeImmutable(CONFIG.app, 'host');
CONFIG.makeImmutable(CONFIG.app, 'post');
CONFIG.makeImmutable(CONFIG.app, 'staticDir');

// App instance
var app = express();

// ============
// AUTH METHODS
// ============

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
app.ensureAuthenticated = function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
};

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete GitHub profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
passport.use(new GitHubStrategy({
    clientID      : CONFIG.clients.github.clientId,
    clientSecret  : CONFIG.clients.github.clientSecret,
    callbackURL   : "http://" + CONFIG.app.host + ":" + CONFIG.app.port +
                    CONFIG.clients.github.callbackRoute,
    scope         : ["gist"]
  },
  function(accessToken, refreshToken, profile, done) {
    github.authenticate({
      type: "oauth",
      token: accessToken
    });
    // asynchronous verification, for effect...
    process.nextTick(function () {
      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      return done(null, profile);
    });
  }
));

// =================
// APP CONFIGURATION
// =================

// configure Express
app.configure(function() {

  // use ejs-locals for all ejs templates:
  app.engine('ejs', engine);

  app.set('views',__dirname + '/views');
  app.set('view engine', 'ejs');

  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: CONFIG.app.sessionSecret }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, CONFIG.app.staticDir)));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

// ======
// ROUTES
// ======

require('./routes')(app, github);

// =========
// START APP
// =========

app.listen(CONFIG.app.port);
console.log('Localhost server listening on port ' + CONFIG.app.port);
