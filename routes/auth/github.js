var express  = require('express');
var app      = module.exports = express();
var passport = require('passport');

app.get('/', passport.authenticate('github'));

// Stop
app.get('/callback', passport.authenticate('github'), function (req, res) {
  res.send(
    '<script>' +
      // Calls a function on the original opening window for authentication
      'window.opener.authenticate(null, ' + JSON.stringify(req.user) + ');' +
      'window.close();' +
    '</script>'
  );
});
