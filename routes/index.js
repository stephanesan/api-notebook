module.exports = function(app, github) {
  require('./auth')(app);
  require('./rest')(app, github);
  require('./views')(app);
};

