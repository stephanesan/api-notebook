var Ghost = module.exports = function (completion, data, text) {
  this.cm         = completion.cm;
  this.data       = data;
  this.completion = completion;

  this.setText(text);
};

Ghost.prototype.removeText = function () {
  if (!this.ghost) { return; }

  this.ghost.clear();
  delete this.ghost;
  delete this.suffix;
};

Ghost.prototype.setText = function (text) {
  var that = this;
  this.removeText();

  if (!text) { return; }

  // At the moment, the ghost is going to assume the prefix text is accurate
  var suffix = this.suffix = text.substr(this.data.to.ch - this.data.from.ch);

  if (!suffix.length) { return; }

  var ghostHint = document.createElement('span');
  ghostHint.className = 'CodeMirror-hint-ghost';
  ghostHint.appendChild(document.createTextNode(suffix));

  // Abusing the bookmark feature since it's the only way without modifying
  // CodeMirror source to achieve the effect we need here.
  this.ghost = this.cm.setBookmark(this.data.to, {
    widget:     ghostHint,
    insertLeft: true
  });

  this.cm.setCursor(this.data.to);
};

Ghost.prototype.accept = function () {
  this.cm.replaceRange(this.suffix, this.data.to, this.data.to);
  this.removeText();
};

Ghost.prototype.remove = function () {
  this.removeText();
};
