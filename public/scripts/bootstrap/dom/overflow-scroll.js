var Backbone = require('backbone');

var scrollTop = function (e, el) {
  if (e.deltaY === 0) { return; }

  // Attempting to scroll up, but the scroll position is already there.
  if (e.deltaY < 0 && el.scrollTop === 0) {
    return;
  }

  // Attempting to scroll down, but the scroll position is already there.
  if (e.deltaY > 0 && el.scrollTop === el.scrollHeight - el.clientHeight) {
    return;
  }

  e.preventDefault();
  el.scrollTop += e.deltaY;
};

var scrollLeft = function (e, el) {
  if (e.deltaX === 0) { return; }

  // Attempting to scroll left, but the scroll position is already there.
  if (e.deltaX < 0 && el.scrollLeft === 0) {
    return;
  }

  // Attempting to scroll right, but the scroll position is already there.
  if (e.deltaX > 0 && el.scrollLeft === el.scrollWidth - el.clientWidth) {
    return;
  }

  e.preventDefault();
  el.scrollLeft += e.deltaX;
};

Backbone.$(document)
  .on('wheel', '[data-overflow-scroll]', function (e, el) {
    scrollTop(e, el);
    scrollLeft(e, el);
  });
