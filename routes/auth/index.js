var express = require('express');
var app     = module.exports = express();

app.use('/github', require('./github'));
