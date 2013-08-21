var _              = require('underscore');
var passport       = module.exports = require('passport');
var GitHubStrategy = require('passport-github').Strategy;

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
  scope:        ['gist'],
  clientID:     process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:  '/auth/github/callback'
},
function (accessToken, refreshToken, profile, done) {
  process.nextTick(function () {
    done(null, _.extend(profile, {
      accessToken: accessToken,
      refreshToken: refreshToken
    }));
  });
}));
