# JSNotebook

## Development

```bash
# Install dependencies
npm install
bower install
# Running tests in the browser (requires the server running for embed tests)
open test/index.html
# Run static check and headless tests
grunt check && grunt test
```

## Environment Variables

Some environment variables are required by the script at compile time for correct functionality.

```
export NOTEBOOK_URL="http://localhost:3000"
export EMBED_SCRIPT_URL="http://localhost:3000/scripts/embed.js"
export GITHUB_CLIENT_ID=""
# export GITHUB_CLIENT_SECRET=""
```

[Register a new application on Github](https://github.com/settings/applications/new), then export the keys in your `.bash_profile`.
