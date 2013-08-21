module.exports = function (req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  // Requires authentication
  res.send(401);
};
