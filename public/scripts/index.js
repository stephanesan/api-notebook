// Bootstrap any required functionality before launching the application
require('./bootstrap');

// Alias the main app to the window for testing
var App = window.App = require('./views/app');

// Attach the plugins
require('./plugins/function-return')(App.middleware);
require('./plugins/filter-properties')(App.middleware);
