require('./bootstrap');

// Require the main notebook view, which will delegate everything
new (require('./views/notebook'))({
  collection: new (require('./collections/notebook'))()
}).render().appendTo(document.body);
