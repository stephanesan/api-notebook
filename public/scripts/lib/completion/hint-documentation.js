var _        = require('underscore');
var marked   = require('marked');
var Backbone = require('backbone');
var state    = require('../../state/state');


/**
 * Create a floating documentation widget next to the current hint widget.
 *
 * @constructor
 * @param  {Hints}    hints
 * @param  {Object}   description
 * @return {HintDocs}
 */
var HintDocs = module.exports = function (hints, description) {
  if (!description || (!description['!type'] && !description['!doc'])) {
    return this;
  }

  var tooltip = this.tooltip = document.createElement('div');
  tooltip.className = 'CodeMirror-hint-documentation';
  tooltip.setAttribute('data-overflow-scroll', 'true');

  this.hints       = hints;
  this.description = description;

  if (description['!type']) {
    var typeEl = tooltip.appendChild(document.createElement('div'));
    typeEl.className = 'CodeMirror-hint-documentation-type';
    typeEl.appendChild(document.createTextNode(description['!type']));
  }

  if (description['!doc']) {
    var docEl = tooltip.appendChild(document.createElement('div'));
    docEl.className = 'CodeMirror-hint-documentation-doc';

    // Compile documentation as markdown before rendering.
    docEl.innerHTML = marked(description['!doc'], {
      gfm: true,
      tables: true,
      sanitize: true,
      smartLists: true
    });

    if (description['!url']) {
      docEl.appendChild(document.createTextNode(' — '));

      var infoEl = docEl.appendChild(document.createElement('a'));
      infoEl.href      = description['!url'];
      infoEl.target    = '_blank';
      infoEl.className = 'CodeMirror-hint-documentation-doc-url';
      infoEl.appendChild(document.createTextNode('Read more'));
    }
  }

  document.body.appendChild(tooltip);

  this.reposition();
  this.listenTo(this.hints, 'reposition', this.reposition, this);
};

/**
 * Extend the documentation tooltip with events.
 */
_.extend(HintDocs.prototype, Backbone.Events);

/**
 * Reposition the documentation tooltip beside the hints menu.
 */
HintDocs.prototype.reposition = function () {
  var hints     = this.hints.hints;
  var box       = hints.getBoundingClientRect();
  var tooltip   = this.tooltip;
  var margin    = parseInt(window.getComputedStyle(tooltip).margin, 10);
  var winWidth  = state.get('viewportWidth');
  var docHeight = state.get('documentHeight');

  tooltip.style.top    = hints.offsetTop - margin + 'px';
  tooltip.style.left   = box.right + 'px';
  tooltip.style.right  = 'auto';
  tooltip.style.bottom = 'auto';

  if (winWidth - box.right < box.left) {
    tooltip.style.left  = 'auto';
    tooltip.style.right = winWidth - box.left + 'px';
  }

  if (hints.className.indexOf('CodeMirror-hints-top') > -1) {
    var bottom = docHeight - window.scrollY - box.bottom - margin;

    tooltip.style.top    = 'auto';
    tooltip.style.bottom = bottom + 'px';
  }
};

/**
 * Remove the hint documentation from the DOM.
 */
HintDocs.prototype.remove = function () {
  this.stopListening(this.hints);

  if (this.tooltip) {
    document.body.removeChild(this.tooltip);
    delete this.tooltip;
  }
};
