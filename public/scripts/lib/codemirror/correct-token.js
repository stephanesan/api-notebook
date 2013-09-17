/**
 * Grabs and corrects the grabbed token. Useful really only for sanitising a
 * `.` as a property. This helps when we need to do completion on the initial
 * `.` that is types.
 *
 * @param  {CodeMirror} cm
 * @param  {Object}     pos
 * @return {Object}
 */
module.exports = function (cm, pos) {
  var token = cm.getTokenAt(pos);

  token.state = CodeMirror.innerMode(cm.getMode(), token.state).state;

  if (token.string === '.') {
    token = {
      start:  token.end,
      end:    token.end,
      string: '',
      type:   'property',
      state:  token.state
    };
  }

  return token;
};
