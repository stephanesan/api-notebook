/* global App */
var _        = App._;
var Backbone = App.Library.Backbone;

/**
 * Create an api client cell that can load the selected api document.
 *
 * @param  {Cell}     cell
 * @param  {String}   invoke
 * @return {Function}
 */
var createApiClientCell = function (cell, invoke) {
  return function (err, api) {
    if (err) { return; }

    var url      = api.ramlUrl;
    var variable = App.Library.changeCase.camelCase(api.title);
    var code     = [
      '// Read about the ' + api.title + ' at ' + api.portalUrl,
      'API.createClient(\'' + variable + '\', \'' + url + '\');'
    ].join('\n');

    var view = cell.notebook[invoke + 'CodeView'](cell.el, code).execute();

    cell.focus();

    return view;
  };
};

/**
 * Load all the API definitions and return the items as an array.
 *
 * @param {Function} done
 */
var loadAPIDefinitions = function (done) {
  return App.middleware.trigger('ajax', {
    url: 'http://api.apihub.com/v1/apis?specFormat=RAML'
  }, function (err, xhr) {
    return done(err, JSON.parse(xhr.responseText).items);
  });
};

/**
 * Show RAML definitions to users in a modal, and upon selection pass the
 * selected definition back to the callback.
 *
 * @param {Function} done
 */
var selectAPIDefinition = function (done) {
  return App.middleware.trigger('ui:modal', {
    title: 'Insert an API Client',
    content: function (done) {
      return loadAPIDefinitions(function (err, items) {
        if (err) { return done(err); }

        return done(null, '<div class="modal-instructions">' +
          'Insert an API client from a RAML specification.' +
          ' <a href="http://raml.org/" target="_blank">' +
          'Learn more about RAML</a>.' +
          '</div>' +
          '<ul class="item-list">' +
          _.map(items, function (item) {
          var link = [
            '<a href="#" class="btn btn-primary btn-small" ',
            'data-raml="' + item.specs.RAML.url + '" ',
            'data-title="' + item.title + '" ',
            'data-portal="' + item.apihubPortal + '">',
            'Add',
            '</a>'
          ].join('');

          return '<li>' +
            '<div class="item-action">' + link + '</div>' +
            '<div class="item-description">' + item.title +
            '<a href="#" class="item-details-link" data-details>details</a>' +
            '<div class="item-details">' + item.description + '</div>' +
            '</div>' +
            '</li>';
        }).join('') + '</li>');
      });
    },
    show: function (modal) {
      Backbone.$(modal.el)
        .on('click', '[data-details]', function (e) {
          e.preventDefault();

          var classList = e.target.parentNode.parentNode.classList;

          if (!classList.contains('item-details-visible')) {
            classList.add('item-details-visible');
          } else {
            classList.remove('item-details-visible');
          }
        })
        .on('click', '[data-raml]', function (e) {
          e.preventDefault();

          // Close the modal behind ourselves.
          modal.close();

          return done(null, {
            title:     e.target.getAttribute('data-title'),
            ramlUrl:   e.target.getAttribute('data-raml'),
            portalUrl: e.target.getAttribute('data-portal')
          });
        });
    }
  });
};

/**
 * Inserts a new code cell above with a RAML API client and executes it.
 */
App.View.EditorCell.prototype.newRAMLAbove = function () {
  return selectAPIDefinition(createApiClientCell(this, 'prepend'));
};

/**
 * Inserts a new code cell below with a RAML API client and executes it.
 */
App.View.EditorCell.prototype.newRAMLBelow = function () {
  return selectAPIDefinition(createApiClientCell(this, 'append'));
};

/**
 * Insert a RAML document using the cell buttons.
 *
 * @type {String}
 */
App.View.CellButtons.controls.push({
  label:   'Insert API Client',
  command: 'newRAML'
});
