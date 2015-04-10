# API Notebook

Interactive API notebook - [demo](http://apinotebook.com).

## Development

```
# Install dependencies
npm install
npm install -g grunt-cli
npm install -g phantomjs

# Start development server
grunt

# Run tests in the browser (requires the server to be running)
open test/index.html

# Run headless tests
grunt test
```

Remember to add a new config file (E.g. `config/development.json`) to get up and running. For example, here is my development config (with secret keys omitted, you'll have to find your own set).

```json
{
  "application": {
    "url": "http://localhost:3000"
  },
  "plugins": {
    "ramlClient": {
      "oauth1": {
        "https://api.twitter.com/oauth/authorize": {
          "consumerKey": "...",
          "consumerSecret": "..."
        }
      },
      "oauth2": {
        "https://github.com/login/oauth/authorize": {
          "scopes": ["user", "public_repo", "repo:status", "notifications", "gist"],
          "clientId": "...",
          "clientSecret": "..."
        },
        "https://www.box.com/api/oauth2/authorize": {
          "clientId": "...",
          "clientSecret": "...",
          "redirectUri": "https://api-notebook.anypoint.mulesoft.com/authenticate/oauth.html"
        }
      }
    },
    "proxy": {
      "url": "/proxy"
    },
    "github": {
      "clientId": "...",
      "clientSecret": "..."
    }
  }
}
```

## Configuration

Project configuration is through [node-config](https://github.com/lorenwest/node-config). To add or override config options, just add a file for your environment (E.g. `development.json`). All plugin config options should be stored under the `plugins` key, while other options are depicted in the `example.json` and `default.json` files.

To use the GitHub plugin functionality, [register a new application on Github](https://github.com/settings/applications/new) and set your keys in under `plugins.github`.
