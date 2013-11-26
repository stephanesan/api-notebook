var DOMBars = require('dombars/runtime');

module.exports = function (view) {
  if (!view) { return; }

  DOMBars.VM.unsubscribe(function () {
    return view.remove();
  });

  return view.render().el;
};
