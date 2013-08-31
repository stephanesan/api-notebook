var Ghost = module.exports = function (widget, data, text) {
  var that = this;

  this.cm         = widget.completion.cm;
  this.data       = data;
  this.widget     = widget;
  this.completion = widget.completion;

  this.cm.addKeyMap(this.keyMap = {
    'Tab':   function () { that.accept(); },
    'Right': function () { that.accept(); }
  });

  if (!text) { return this.remove(); }

  // At the moment, the ghost is going to assume the prefix text is accurate
  var suffix = this.suffix = text.substr(this.data.to.ch - this.data.from.ch);

  if (!suffix.length) { return this.remove(); }

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
  if (this.suffix && this.data) {
    this.cm.replaceRange(this.suffix, this.data.to, this.data.to);
  }

  this.remove();
};

Ghost.prototype.remove = function () {
  if (this.ghost) { this.ghost.clear(); }
  this.cm.removeKeyMap(this.keyMap);
  delete this.ghost;
  delete this.suffix;
  delete this.widget.ghost;
};
