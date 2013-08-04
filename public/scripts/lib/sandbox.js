var frame = document.createElement('iframe');
frame.style.display = 'none';
// Append the iframe to the DOM so we can use it
document.body.appendChild(frame);

// Allow arbitrary running of strings as code
exports.execute = function (code) {
  return frame.contentWindow.eval(code);
};
