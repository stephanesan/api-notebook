module.exports = {
  application: {
    url:           'http://localhost:3000',
    title:         'Notebook Site',
    oauthCallback: '/authenticate/oauth.html'
  },
  pkg: require('../package.json'),
  embed: {
    script: 'http://localhost:3000/scripts/embed.js'
  },
  plugins: {}
}
