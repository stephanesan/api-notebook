/**
 * Simulate a keypress event enough to test CodeMirror.
 *
 * @param  {CodeMirror}    editor
 * @param  {String|Number} code
 * @param  {Object}        props
 */
var fakeKey = function (cm, code, props) {
  if (typeof code === 'string') {
    code = code.charCodeAt(0);
  }

  var e = {
    type: 'keydown',
    keyCode: code,
    preventDefault: function () {},
    stopPropagation: function () {}
  };

  if (props) {
    for (var n in props) {
      e[n] = props[n];
    }
  }

  cm.triggerOnKeyDown(e);
};

var fakeChange = function (editor, text) {
};

/**
 * Test the autocompletion widget on a javascript editor instance.
 *
 * @param  {CodeMirror} editor
 * @param  {String}     value
 * @return {Array}
 */
var testCompletion = function (editor, text) {
  editor.focus();
  editor.setValue(text);
  editor.setCursor(editor.lastLine(), Infinity);
  // Trigger a fake change event to cause autocompletion to occur
  CodeMirror.signal(editor, 'change', editor, {
    origin: '+input',
    to:     editor.getCursor(),
    from:   editor.getCursor(),
    text:   [ text.slice(-1) ]
  });

  return editor.state.completionActive.widget._results;
};
