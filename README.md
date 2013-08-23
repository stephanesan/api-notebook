# JSNotebook


```bash
npm install
npm start
```

Github API proxy implements these REST routes:

`POST /gists` - Create a gist.
`PUT /gists/:id` - Edit a specific gist.
`DELETE /gists/:id` - Remove a specific gist.
`GET /gists` - Retrieve all gists for logged-in user).
`GET /gists/:id` - Retrieve a specific gist.

Authentication is done via a browser by navigating to
[http://localhost:8000/auth/github](http://localhost:8000/auth/github).
A cookie-based session is established. Calls to the REST API can be made via the
browser after authentication. Test API using e.g.
[REST console](https://chrome.google.com/webstore/detail/rest-console/cokgbflfommojglbmbpenpphppikmonn?hl=en).


## Environment Variables

```
export NOTEBOOK_URL="" # Set this before building the scripts
export GITHUB_CLIENT_ID=""
export GITHUB_CLIENT_SECRET=""
```

[Register a new application on Github](https://github.com/settings/applications/new), then export the keys in your `.bash_profile`.

## Embeddable Widget

Simple use, requires only a single script tag on the embedding page. However, we probably need to change selector to element id or similar since selector is hardly cross-browser. Be aware that since all attributes will come out as strings, you can't pass through custom styles or anything more advanced.

```html
<script src="embed.js" data-selector="body" data-id="abc"></script>
```

More advanced use case allows for programmatic creation of notebooks.

```javascript
new Notebook(el, {
  id: document.getElementById('notebook'),
  content: '# Fallback Markdown Content',
  style: {
    minWidth: '320px',
    minHeight: '200px'
  }
})
```


## Deployment

To deploy to Heroku, just run the deploy script in the Makefile. You will probably have to set your the environment variables on Heroku, as well as update the git endpoint in the Makefile.
