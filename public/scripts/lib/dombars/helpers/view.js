var DOMBars = require('dombars/runtime');

/**
 * Register to DOMBars as the view helper.
 *
 * @param  {Backbone.View} view
 * @return {Node}
 */
DOMBars.registerHelper('view', function (view) {
  if (!view) { return; }

  DOMBars.VM.unsubscribe(function () {
    return view.remove();
  });

  return view.render().el;
});
