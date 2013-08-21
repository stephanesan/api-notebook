var _          = require('underscore');
var express    = require('express');
var app        = module.exports = express();
var request    = require('request');
var ensureAuth = require('../lib/ensure-authenticated');

_.each({
  '/':          ['get', 'post'],
  '/:id' :      ['get', 'patch', 'delete'],
  '/:id/forks': ['post']
}, function (methods, route) {
  _.each(methods, function (method) {
    app[method](route, ensureAuth, function (req, res) {
      req.pipe(request({
        url: 'https://api.github.com' + req.originalUrl,
        qs:  _.extend(req.query, {
          'access_token': req.user.accessToken
        })
      })).pipe(res);
    });
  });
});
