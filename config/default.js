module.exports = {
  "app": {
    "sessionSecret": "keyboard cat",
    "staticDir": "public"
  },

  "clients": {
    "github": {
      "callbackRoute": "/github-callback",
      "timeout": 10000,
      "version": "3.0.0"
    }
  }
};