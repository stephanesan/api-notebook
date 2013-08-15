var express    = require('express');
var app        = module.exports = express();
var ensureAuth = require('../lib/ensure-authenticated');

app.get('/', ensureAuth, function (req, res) {
  return res.send(req.user);
});
