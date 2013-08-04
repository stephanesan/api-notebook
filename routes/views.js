// ===========
// VIEW ROUTES
// ===========

module.exports = function (app) {

  /*
    Render index
  */
  app.get('/', function(req, res){
    res.render('index', {user: req.user});
  });

  /*
    Render user account information.
  */
  app.get('/account', app.ensureAuthenticated, function(req, res){
    res.render('account', { user: req.user });
  });
};