var express  = require('express');
var app      = module.exports = express();
var passport = require('passport');

app.get('/', passport.authenticate('github'));

app.get('/callback', passport.authenticate('github'), function (req, res) {
  res.redirect('/');
});
