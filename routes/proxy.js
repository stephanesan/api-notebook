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

  var qs  = data.qs  = req.query;
  var uri = data.uri = url.parse(decodeURIComponent(req.path.substr(1)));

  // Extends the query string with additonal url data
  _.extend(qs, mergeData[uri.host + uri.pathname]);

  // Github requires we pass basic auth when checking authorizations
  if (!(uri.host + uri.pathname).indexOf('api.github.com/applications')) {
    data.auth = {
      user: process.env.GITHUB_CLIENT_ID,
      pass: process.env.GITHUB_CLIENT_SECRET
    };
  }

  // This works perfectly as far as I can tell locally and proxies all requests
  // and adds the right request data from above, but once deployed to Herkoku a
  // request to `http://stark-brook-6792.herokuapp.com/proxy/
  // https://api.github.com/gists/d6cd2bd5f4580136fdd9` results in it serving
  // `http://developer.github.com/` instead. I also rewrote this using
  // `node-http-proxy` last night, but couldn't get any requests to
  // `https://api.github.com` to work.
  req.pipe(request(data)).pipe(res);
});
