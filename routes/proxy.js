var _       = require('underscore');
var express = require('express');
var app     = module.exports = express();
var url     = require('url');
var request = require('request');

/**
 * Uses a simple object representation of urls to merge additional data with
 * proxied requests. Port this to use RAML ASAP.
 *
 * @type {Object}
 */
var mergeData = {
  'github.com/login/oauth/access_token': {
    'client_id':     process.env.GITHUB_CLIENT_ID,
    'client_secret': process.env.GITHUB_CLIENT_SECRET
  }
};

app.all('*', function (req, res, next) {
  var data = {};
  data.qs  = req.query;
  data.uri = decodeURIComponent(req.path.substr(1));

  var parse = url.parse(data.uri);

  // Extends the query string with additonal url data
  _.extend(data.qs, mergeData[parse.host + parse.pathname]);

  // Github requires we pass basic auth when checking authorizations
  if (!(parse.host + parse.pathname).indexOf('api.github.com/applications')) {
    data.auth = {
      user: process.env.GITHUB_CLIENT_ID,
      pass: process.env.GITHUB_CLIENT_SECRET
    };
  }

  req.pipe(request(data)).pipe(res);
});
