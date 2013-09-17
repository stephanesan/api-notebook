var _    = require('underscore');
var trim = require('trim');

/**
 * Strips input from a passed in position.
 *
 * @param  {String}     string
 * @param  {CodeMirror} cm
 * @param  {Object}     event
 * @return {String}
 */
var stripInput = function (prevPosition, cm, string) {
  var endPosition = { ch: Infinity, line: Infinity };
  var text        = cm.doc.getRange(prevPosition, endPosition);

  // Remove everything after the position
  cm.doc.replaceRange('', prevPosition, endPosition);

  // Trim and/or remove the last line if it is now empty
  var lastLine = trim.right(cm.doc.getLine(cm.doc.lastLine()));

  if (lastLine) {
    cm.doc.setLine(cm.doc.lastLine(), lastLine);
  } else {
    cm.doc.removeLine(cm.doc.lastLine());
  }

  return trim.left(text.substr(string.length));
};

/**
 * Handles setting the whole value of a CodeMirror document.
 *
 * @param  {String}     string
 * @param  {CodeMirror} cm
 * @param  {Object}     event
 * @return {Boolean}
 */
var handleSetValue = function (string, cm, event) {
  var index, line;

  // Iterate through all the input text.
  for (var i = 0; i < event.text.length; i++) {
    index = event.text[i].indexOf(string);
    // Break the loop through all the data if we found what we were looking for
    if (index > -1) {
      line = i + event.from.line;
      break;
    }
  }

  // No line was found.
  if (isNaN(line)) { return false; }

  return stripInput({
    ch: (line === event.from.line ? event.from.ch + index : index),
    line: line
  }, cm, string);
};

/**
 * Handles regular input events from a CodeMirror document instance.
 *
 * @param  {String}     string
 * @param  {CodeMirror} cm
 * @param  {Object}     event
 * @return {Boolean}
 */
var handleInput = function (string, cm, event) {
  var lastCharPos = string.length - 1;
  var currentChar = cm.doc.getLine(event.from.line)[event.from.ch];

  // Checks that the current position is longer than the search string and that
  // the current character is equal to the end of the string.
  if (event.from.ch < lastCharPos || currentChar !== string[lastCharPos]) {
    return false;
  }

  // Grab what should be start character position. Use `event.from` for all
  // calculations since it has the desired behaviour in `+delete` events (in
  // `+input` it would make no difference).
  var prevPosition = _.defaults({
    ch: event.from.ch - string.length + 1
  }, event.from);

  var prevChars = cm.doc.getRange(prevPosition, _.defaults({
    ch: event.from.ch + 1
  }, event.from));

  // Check if the inserted string matches.
  if (prevChars !== string) { return false; }

  return stripInput(prevPosition, cm, string);
};

/**
 * Handles a paste event from the CodeMirror document.
 *
 * @param  {String}     string
 * @param  {CodeMirror} cm
 * @param  {Object}     event
 * @return {Boolean}
 */
var handlePaste = function (string, cm, event) {
  // Try and find if the first character of the input is part of the string.
  var index = string.indexOf(event.text[0].charAt(0));

  // If the index was not found, handle the input as if it were a set value.
  if (index < 0) { return handleSetValue(string, cm, event); }

  var prevPosition = _.defaults({
    ch: event.from.ch - index
  }, event.from);

  var nextPosition = _.defaults({
    ch: event.from.ch - index + string.length
  }, event.from);

  var prevChars = cm.doc.getRange(prevPosition, nextPosition);

  // If the pervious characters don't match our target string, switch to
  // handling the entire paste data.
  if (prevChars !== string) { return handleSetValue(string, cm, event); }

  return stripInput(prevPosition, cm, string);
};

/**
 * Quickly check whether a certain string has been inserted.
 *
 * @param  {String}     string
 * @param  {CodeMirror} cm
 * @param  {Object}     event
 * @return {Boolean}
 */
module.exports = function (string, cm, event) {
  // `setValue` events need to be managed and parsed manually.
  if (event.origin === 'setValue') {
    return handleSetValue(string, cm, event);
  }

  // Paste events are slightly more complicated since part of the existing text
  // could be in the paste and when joined with the existing input, it could
  // create the target string.
  if (event.origin === 'paste') {
    return handlePaste(string, cm, event);
  }

  // Handling input can be done more efficiently than with other methods since
  // we only need to check a couple of character positions.
  if (event.origin === '+input' || event.origin === '+delete') {
    return handleInput(string, cm, event);
  }

  // Finally just return false if it's none of the above.
  return false;
};
