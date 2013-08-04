// Client ID = a7f8014691fcc748aced
// Client Secret = ea758e7cde897016e56dd816c901d82c82568964
/*jshint node: true, devel: true*/

// node-github : https://github.com/ajaxorg/node-github/
//               http://ajaxorg.github.io/node-github/
// passportjs  : http://passportjs.org/


var express = require('express')
  , engine = require('ejs-locals')
  , passport = require('passport')
  , util = require('util')
  , GitHubStrategy = require('passport-github').Strategy;

var PORT = 8000;

var GITHUB_CLIENT_ID = "a7f8014691fcc748aced";
var GITHUB_CLIENT_SECRET = "ea758e7cde897016e56dd816c901d82c82568964";

var GitHubApi = require("github");

var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    timeout: 15000
  });


// ============
// AUTH METHODS
// ============


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

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
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://localhost:8000/github-callback",
    scope: ["gist"]
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


var app = express();

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
  app.use(express.session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});


// ============
// AUTH ROUTES
// ============


app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHubwill redirect the user
//   back to this application at /auth/github/callback
app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
});

// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/github-callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


// ===========
// VIEW ROUTES
// ===========


/*
  Render index
*/
app.get('/', function(req, res){
  res.render('index', {user: req.user});
});


/*
  Render user account information.
*/
app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});


// ===========
// REST ROUTES
// ===========


/*
  Retrieve all gists for logged-in user.
*/
app.get('/gists', ensureAuthenticated, function(req, res) {
  github.gists.getAll({}, function(error, gistData) {
    res.send(gistData);
  });
});

/*
  Create a Gist for logged-in user
*/
app.post('/gists', ensureAuthenticated, function(req, res) {
  var body = req.body;
  var files = {};
  var gist = {};
  var public = (typeof body.public === 'boolean') ? body.public : true;

  files[body.gistName] = {
    content: body.gistBody
  };
  gist = {
    description: body.gistDescription,
    public: public,
    files: files
  };

  github.gists.create(gist, function(error, gistData) {
    if (error) {
      console.error('error creating gist', error);
      res.send(error);
    } else {
      res.send(gistData);
    }

  });
});

/*
  Update a GIST with a given ID.
  Logged in user must have write access to the Gist.
  TODO Use passed in ID
*/
app.put('/gists/:id', ensureAuthenticated, function(req, res) {
  github.gists.create({
    id: req.params.id,
    "files": {
      "testgist.txt": {
        "content": "testing creating a gist over api"
      }
    }
  }, function(error, gistData) {
    if (error) {
      console.error('error updating gist', error);
      res.rend(error);
    } else {
      res.send(gistData);
    }
  });
});

/*
  Delete a GIST with a given ID.
  Logged in user must have write access to the Gist.
  TODO Use passed in ID
*/
app.delete('/gists/:id', ensureAuthenticated, function(req, res) {
  github.gists.create({
    id: req.params.id
  }, function(error, gistData) {
    res.send(gistData);
  });
});


// =========
// START APP
// =========


app.listen(PORT);
console.log('Localhost server listening on port ' + PORT);
