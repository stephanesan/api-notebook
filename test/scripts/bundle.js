(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* global mocha, chai */
mocha.setup('bdd');
mocha.reporter('html');

window.expect       = chai.expect;
window.NOTEBOOK_URL = {"url":"https://mulesoft.github.io/api-notebook/","title":"API Notebook","oauthCallback":"/authenticate/oauth.html"}.url;
window.FIXTURES_URL = window.NOTEBOOK_URL + '/test/fixtures';

},{}],2:[function(require,module,exports){
/**
 * Extend a destination object with any number of properties and any number of
 * source object. This will override from left to right.
 *
 * @param  {Object} obj
 * @param  {Object} ...
 * @return {Object}
 */
window.extend = function (obj /*, ...source */) {
  var sources = Array.prototype.slice.call(arguments, 1);

  for (var i = 0; i < sources.length; i++) {
    for (var prop in sources[i]) {
      obj[prop] = sources[i][prop];
    }
  }

  return obj;
};

/**
 * Simulate a keypress event enough to test CodeMirror.
 *
 * @param  {CodeMirror}    editor
 * @param  {String|Number} code
 * @param  {Object}        props
 */
window.fakeKey = function (cm, code, props) {
  if (typeof code === 'string') {
    code = code.charCodeAt(0);
  }

  var e = extend({
    type: 'keydown',
    keyCode: code,
    preventDefault: function () {},
    stopPropagation: function () {}
  }, props);

  cm.triggerOnKeyDown(e);
};

/**
 * Test the autocompletion widget on a javascript editor instance.
 *
 * @param  {CodeMirror} editor
 * @param  {String}     value
 * @return {Array}
 */
window.testCompletion = function (editor, text, done) {
  // Listens to an event triggered by the widget
  editor.on('refreshCompletion', function refresh (cm, results) {
    editor.off('refreshCompletion', refresh);
    return done(App._.pluck(results, 'value'));
  });

  // Set the correct positioning
  editor.focus();
  editor.setValue(text);
  editor.setCursor(editor.lastLine(), Infinity);

  var cursor = editor.getCursor();

  // Trigger a fake change event to cause autocompletion to occur
  App.CodeMirror.Editor.signal(editor, 'change', editor, {
    origin: '+input',
    to:     extend({}, cursor),
    from:   extend({}, cursor, { ch: cursor.ch - 1 }),
    text:   [text.slice(-1)]
  });
};

/**
 * Simulate events using JavaScript.
 *
 * @return {Function}
 */
window.simulateEvent = (function () {
  var eventMatchers = {
    'HTMLEvents': /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll|focusin|focusout)$/,
    'MouseEvents': /^(?:click|dblclick|mouse(?:enter|leave|down|up|over|move|out))$/,
    'KeyboardEvent': /^(?:key(?:down|press|up))$/
  };

  var defaultOptions = {
    pointerX:   0,
    pointerY:   0,
    button:     0,
    ctrlKey:    false,
    altKey:     false,
    shiftKey:   false,
    metaKey:    false,
    bubbles:    true,
    cancelable: true
  };

  return function (element, eventName, options) {
    options = extend({}, defaultOptions, options || {});

    var eventType = null;
    var oEvent;

    // Check the event name against the available types.
    for (var name in eventMatchers) {
      if (eventMatchers[name].test(eventName)) {
        eventType = name;
        break;
      }
    }

    if (!eventType) {
      throw new SyntaxError(
        'Only HTMLEvents, MouseEvents and KeyboardEvent interfaces are supported'
      );
    }

    if (document.createEvent) {
      oEvent = document.createEvent(eventType);

      if (eventType === 'HTMLEvents') {
        oEvent.initEvent(eventName, options.bubbles, options.cancelable);
      } else if (eventType === 'KeyboardEvent') {
        oEvent.initKeyboardEvent(
          eventName,
          options.bubbles,
          options.cancelable,
          document.defaultView,
          options.char,
          options.key,
          options.location,
          '', // Fix `modifiersListArg`
          options.repeat,
          options.locale
        );
      } else {
        oEvent.initMouseEvent(
          eventName,
          options.bubbles,
          options.cancelable,
          document.defaultView,
          options.button,
          options.pointerX,
          options.pointerY,
          options.pointerX,
          options.pointerY,
          options.ctrlKey,
          options.altKey,
          options.shiftKey,
          options.metaKey,
          options.button,
          element
        );
      }

      element.dispatchEvent(oEvent);
    } else {
      // Alias position options.
      options.clientX = options.pointerX;
      options.clientY = options.pointerY;

      oEvent = extend(document.createEventObject(), options);
      element.fireEvent('on' + eventName, oEvent);
    }

    return element;
  };
})();

},{}]},{},[1,2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL3Rlc3Qvc2NyaXB0cy9jb21tb24uanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL3Rlc3Qvc2NyaXB0cy9oZWxwZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qIGdsb2JhbCBtb2NoYSwgY2hhaSAqL1xubW9jaGEuc2V0dXAoJ2JkZCcpO1xubW9jaGEucmVwb3J0ZXIoJ2h0bWwnKTtcblxud2luZG93LmV4cGVjdCAgICAgICA9IGNoYWkuZXhwZWN0O1xud2luZG93Lk5PVEVCT09LX1VSTCA9IHtcInVybFwiOlwiaHR0cHM6Ly9tdWxlc29mdC5naXRodWIuaW8vYXBpLW5vdGVib29rL1wiLFwidGl0bGVcIjpcIkFQSSBOb3RlYm9va1wiLFwib2F1dGhDYWxsYmFja1wiOlwiL2F1dGhlbnRpY2F0ZS9vYXV0aC5odG1sXCJ9LnVybDtcbndpbmRvdy5GSVhUVVJFU19VUkwgPSB3aW5kb3cuTk9URUJPT0tfVVJMICsgJy90ZXN0L2ZpeHR1cmVzJztcbiIsIi8qKlxuICogRXh0ZW5kIGEgZGVzdGluYXRpb24gb2JqZWN0IHdpdGggYW55IG51bWJlciBvZiBwcm9wZXJ0aWVzIGFuZCBhbnkgbnVtYmVyIG9mXG4gKiBzb3VyY2Ugb2JqZWN0LiBUaGlzIHdpbGwgb3ZlcnJpZGUgZnJvbSBsZWZ0IHRvIHJpZ2h0LlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqXG4gKiBAcGFyYW0gIHtPYmplY3R9IC4uLlxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG53aW5kb3cuZXh0ZW5kID0gZnVuY3Rpb24gKG9iaiAvKiwgLi4uc291cmNlICovKSB7XG4gIHZhciBzb3VyY2VzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IHNvdXJjZXMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZXNbaV0pIHtcbiAgICAgIG9ialtwcm9wXSA9IHNvdXJjZXNbaV1bcHJvcF07XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbi8qKlxuICogU2ltdWxhdGUgYSBrZXlwcmVzcyBldmVudCBlbm91Z2ggdG8gdGVzdCBDb2RlTWlycm9yLlxuICpcbiAqIEBwYXJhbSAge0NvZGVNaXJyb3J9ICAgIGVkaXRvclxuICogQHBhcmFtICB7U3RyaW5nfE51bWJlcn0gY29kZVxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICAgcHJvcHNcbiAqL1xud2luZG93LmZha2VLZXkgPSBmdW5jdGlvbiAoY20sIGNvZGUsIHByb3BzKSB7XG4gIGlmICh0eXBlb2YgY29kZSA9PT0gJ3N0cmluZycpIHtcbiAgICBjb2RlID0gY29kZS5jaGFyQ29kZUF0KDApO1xuICB9XG5cbiAgdmFyIGUgPSBleHRlbmQoe1xuICAgIHR5cGU6ICdrZXlkb3duJyxcbiAgICBrZXlDb2RlOiBjb2RlLFxuICAgIHByZXZlbnREZWZhdWx0OiBmdW5jdGlvbiAoKSB7fSxcbiAgICBzdG9wUHJvcGFnYXRpb246IGZ1bmN0aW9uICgpIHt9XG4gIH0sIHByb3BzKTtcblxuICBjbS50cmlnZ2VyT25LZXlEb3duKGUpO1xufTtcblxuLyoqXG4gKiBUZXN0IHRoZSBhdXRvY29tcGxldGlvbiB3aWRnZXQgb24gYSBqYXZhc2NyaXB0IGVkaXRvciBpbnN0YW5jZS5cbiAqXG4gKiBAcGFyYW0gIHtDb2RlTWlycm9yfSBlZGl0b3JcbiAqIEBwYXJhbSAge1N0cmluZ30gICAgIHZhbHVlXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xud2luZG93LnRlc3RDb21wbGV0aW9uID0gZnVuY3Rpb24gKGVkaXRvciwgdGV4dCwgZG9uZSkge1xuICAvLyBMaXN0ZW5zIHRvIGFuIGV2ZW50IHRyaWdnZXJlZCBieSB0aGUgd2lkZ2V0XG4gIGVkaXRvci5vbigncmVmcmVzaENvbXBsZXRpb24nLCBmdW5jdGlvbiByZWZyZXNoIChjbSwgcmVzdWx0cykge1xuICAgIGVkaXRvci5vZmYoJ3JlZnJlc2hDb21wbGV0aW9uJywgcmVmcmVzaCk7XG4gICAgcmV0dXJuIGRvbmUoQXBwLl8ucGx1Y2socmVzdWx0cywgJ3ZhbHVlJykpO1xuICB9KTtcblxuICAvLyBTZXQgdGhlIGNvcnJlY3QgcG9zaXRpb25pbmdcbiAgZWRpdG9yLmZvY3VzKCk7XG4gIGVkaXRvci5zZXRWYWx1ZSh0ZXh0KTtcbiAgZWRpdG9yLnNldEN1cnNvcihlZGl0b3IubGFzdExpbmUoKSwgSW5maW5pdHkpO1xuXG4gIHZhciBjdXJzb3IgPSBlZGl0b3IuZ2V0Q3Vyc29yKCk7XG5cbiAgLy8gVHJpZ2dlciBhIGZha2UgY2hhbmdlIGV2ZW50IHRvIGNhdXNlIGF1dG9jb21wbGV0aW9uIHRvIG9jY3VyXG4gIEFwcC5Db2RlTWlycm9yLkVkaXRvci5zaWduYWwoZWRpdG9yLCAnY2hhbmdlJywgZWRpdG9yLCB7XG4gICAgb3JpZ2luOiAnK2lucHV0JyxcbiAgICB0bzogICAgIGV4dGVuZCh7fSwgY3Vyc29yKSxcbiAgICBmcm9tOiAgIGV4dGVuZCh7fSwgY3Vyc29yLCB7IGNoOiBjdXJzb3IuY2ggLSAxIH0pLFxuICAgIHRleHQ6ICAgW3RleHQuc2xpY2UoLTEpXVxuICB9KTtcbn07XG5cbi8qKlxuICogU2ltdWxhdGUgZXZlbnRzIHVzaW5nIEphdmFTY3JpcHQuXG4gKlxuICogQHJldHVybiB7RnVuY3Rpb259XG4gKi9cbndpbmRvdy5zaW11bGF0ZUV2ZW50ID0gKGZ1bmN0aW9uICgpIHtcbiAgdmFyIGV2ZW50TWF0Y2hlcnMgPSB7XG4gICAgJ0hUTUxFdmVudHMnOiAvXig/OmxvYWR8dW5sb2FkfGFib3J0fGVycm9yfHNlbGVjdHxjaGFuZ2V8c3VibWl0fHJlc2V0fGZvY3VzfGJsdXJ8cmVzaXplfHNjcm9sbHxmb2N1c2lufGZvY3Vzb3V0KSQvLFxuICAgICdNb3VzZUV2ZW50cyc6IC9eKD86Y2xpY2t8ZGJsY2xpY2t8bW91c2UoPzplbnRlcnxsZWF2ZXxkb3dufHVwfG92ZXJ8bW92ZXxvdXQpKSQvLFxuICAgICdLZXlib2FyZEV2ZW50JzogL14oPzprZXkoPzpkb3dufHByZXNzfHVwKSkkL1xuICB9O1xuXG4gIHZhciBkZWZhdWx0T3B0aW9ucyA9IHtcbiAgICBwb2ludGVyWDogICAwLFxuICAgIHBvaW50ZXJZOiAgIDAsXG4gICAgYnV0dG9uOiAgICAgMCxcbiAgICBjdHJsS2V5OiAgICBmYWxzZSxcbiAgICBhbHRLZXk6ICAgICBmYWxzZSxcbiAgICBzaGlmdEtleTogICBmYWxzZSxcbiAgICBtZXRhS2V5OiAgICBmYWxzZSxcbiAgICBidWJibGVzOiAgICB0cnVlLFxuICAgIGNhbmNlbGFibGU6IHRydWVcbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24gKGVsZW1lbnQsIGV2ZW50TmFtZSwgb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBleHRlbmQoe30sIGRlZmF1bHRPcHRpb25zLCBvcHRpb25zIHx8IHt9KTtcblxuICAgIHZhciBldmVudFR5cGUgPSBudWxsO1xuICAgIHZhciBvRXZlbnQ7XG5cbiAgICAvLyBDaGVjayB0aGUgZXZlbnQgbmFtZSBhZ2FpbnN0IHRoZSBhdmFpbGFibGUgdHlwZXMuXG4gICAgZm9yICh2YXIgbmFtZSBpbiBldmVudE1hdGNoZXJzKSB7XG4gICAgICBpZiAoZXZlbnRNYXRjaGVyc1tuYW1lXS50ZXN0KGV2ZW50TmFtZSkpIHtcbiAgICAgICAgZXZlbnRUeXBlID0gbmFtZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFldmVudFR5cGUpIHtcbiAgICAgIHRocm93IG5ldyBTeW50YXhFcnJvcihcbiAgICAgICAgJ09ubHkgSFRNTEV2ZW50cywgTW91c2VFdmVudHMgYW5kIEtleWJvYXJkRXZlbnQgaW50ZXJmYWNlcyBhcmUgc3VwcG9ydGVkJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoZG9jdW1lbnQuY3JlYXRlRXZlbnQpIHtcbiAgICAgIG9FdmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KGV2ZW50VHlwZSk7XG5cbiAgICAgIGlmIChldmVudFR5cGUgPT09ICdIVE1MRXZlbnRzJykge1xuICAgICAgICBvRXZlbnQuaW5pdEV2ZW50KGV2ZW50TmFtZSwgb3B0aW9ucy5idWJibGVzLCBvcHRpb25zLmNhbmNlbGFibGUpO1xuICAgICAgfSBlbHNlIGlmIChldmVudFR5cGUgPT09ICdLZXlib2FyZEV2ZW50Jykge1xuICAgICAgICBvRXZlbnQuaW5pdEtleWJvYXJkRXZlbnQoXG4gICAgICAgICAgZXZlbnROYW1lLFxuICAgICAgICAgIG9wdGlvbnMuYnViYmxlcyxcbiAgICAgICAgICBvcHRpb25zLmNhbmNlbGFibGUsXG4gICAgICAgICAgZG9jdW1lbnQuZGVmYXVsdFZpZXcsXG4gICAgICAgICAgb3B0aW9ucy5jaGFyLFxuICAgICAgICAgIG9wdGlvbnMua2V5LFxuICAgICAgICAgIG9wdGlvbnMubG9jYXRpb24sXG4gICAgICAgICAgJycsIC8vIEZpeCBgbW9kaWZpZXJzTGlzdEFyZ2BcbiAgICAgICAgICBvcHRpb25zLnJlcGVhdCxcbiAgICAgICAgICBvcHRpb25zLmxvY2FsZVxuICAgICAgICApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb0V2ZW50LmluaXRNb3VzZUV2ZW50KFxuICAgICAgICAgIGV2ZW50TmFtZSxcbiAgICAgICAgICBvcHRpb25zLmJ1YmJsZXMsXG4gICAgICAgICAgb3B0aW9ucy5jYW5jZWxhYmxlLFxuICAgICAgICAgIGRvY3VtZW50LmRlZmF1bHRWaWV3LFxuICAgICAgICAgIG9wdGlvbnMuYnV0dG9uLFxuICAgICAgICAgIG9wdGlvbnMucG9pbnRlclgsXG4gICAgICAgICAgb3B0aW9ucy5wb2ludGVyWSxcbiAgICAgICAgICBvcHRpb25zLnBvaW50ZXJYLFxuICAgICAgICAgIG9wdGlvbnMucG9pbnRlclksXG4gICAgICAgICAgb3B0aW9ucy5jdHJsS2V5LFxuICAgICAgICAgIG9wdGlvbnMuYWx0S2V5LFxuICAgICAgICAgIG9wdGlvbnMuc2hpZnRLZXksXG4gICAgICAgICAgb3B0aW9ucy5tZXRhS2V5LFxuICAgICAgICAgIG9wdGlvbnMuYnV0dG9uLFxuICAgICAgICAgIGVsZW1lbnRcbiAgICAgICAgKTtcbiAgICAgIH1cblxuICAgICAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG9FdmVudCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEFsaWFzIHBvc2l0aW9uIG9wdGlvbnMuXG4gICAgICBvcHRpb25zLmNsaWVudFggPSBvcHRpb25zLnBvaW50ZXJYO1xuICAgICAgb3B0aW9ucy5jbGllbnRZID0gb3B0aW9ucy5wb2ludGVyWTtcblxuICAgICAgb0V2ZW50ID0gZXh0ZW5kKGRvY3VtZW50LmNyZWF0ZUV2ZW50T2JqZWN0KCksIG9wdGlvbnMpO1xuICAgICAgZWxlbWVudC5maXJlRXZlbnQoJ29uJyArIGV2ZW50TmFtZSwgb0V2ZW50KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfTtcbn0pKCk7XG4iXX0=
