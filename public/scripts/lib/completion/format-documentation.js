var marked   = require('marked');
var renderer = new marked.Renderer();

/**
 * Override the link renderer to always open in a new tab.
 *
 * @param  {String} href
 * @param  {String} title
 * @param  {String} text
 * @return {String}
 */
renderer.link = function (href, title, text) {
  var html = '<a href="' + href + '"';

  if (title) {
    html += ' title="' + title + '"';
  }

  html += ' target="_blank">' + text + '</a>';

  return html;
};

/**
 * Format the standard description object for rendering in the browser.
 *
 * @param  {Object} description
 * @param  {String} currentVariable
 * @return {Object}
 */
module.exports = function (description, currentVariable) {
  var formatted = {};

  if (description['!doc']) {
    formatted.doc = marked(description['!doc'], {
      gfm:        true,
      tables:     true,
      sanitize:   true,
      smartLists: true,
      renderer:   renderer
    });
  }

  if (description['!url']) {
    formatted.url = description['!url'];
  }

  if (description['!type']) {
    formatted.type = description['!type'];

    // Replace the arbitrary function name with the current variable name.
    if (currentVariable && /^fn\(/.test(formatted.type)) {
      formatted.type = currentVariable + formatted.type.substr(2);
    }
  }

  return formatted;
};
