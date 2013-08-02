(function($){
  // eval must be invoked indirectly to evaluate into global scope
  var evil = eval;
  // Hack - global for results
  var results = [];

  $(function(){
    var _cellIds = 0;
    var _$protoSection = $('#proto-section');
    var _$protoControls = $('#proto-controls');

    function _onTextAreaFocus() {
      var parent = $(this).parents('.cell');
      parent.addClass('active');
    }

    function _onTextAreaBlur() {
      var parent = $(this).parents('.cell');
      parent.removeClass('active');
    }

    // For handling return keypresses
    function _onCodeCellKeypress(e) {
      if (e.keyCode === 13 && e.shiftKey === false) {
        // Otherwise, parse and render results
        e.preventDefault();
        var $currentCell = $(this).parents('.cell');
        renderResults($currentCell);
        addCell($currentCell);
        return false;
      }
    }
    
    // For handling keyup (changing cell mode by entering code block text
    function _onCellKeyup(e) {
      var $el = $(this);
      var $parent = $($el.parents('.cell').get(0));
      var value = e.target.value;
      // If block comment was just started, change cell to text cell
      if (value === '/*') {
        $parent
          .removeClass('cell-code')
          .addClass('cell-text')
          .remove('.cell-results')
          .find('textarea')
            .off('keypress', _onCodeCellKeypress)
            .val(value + "\n\t")
            .trigger('input');
      // If block comment ends, finalize text cell
      } else if ($parent.hasClass('cell-text') && value.substr(-2) === '*/') {
        addCell($parent);
      }
    }

    function renderResults($cell) {
      var cellIndex = window.parseInt($cell.attr('id').substr(5), 10);
      var statement = $cell.find('textarea').val();
      var result;
      var resultText;
      try {
        result = evil(statement);
      } catch(error) {
        result = error;
      }
      results[cellIndex] = result;
      // Implicitly call result.toString()
      resultText =  (typeof result === 'undefined') ? 'undefined' : result;
      $cell.find('.cell-results')
        .text(resultText)
        .removeClass('pending');
    }

    function addCell($currentCell) {
      // Only add cell if current cell is the last in list
      if ($currentCell.attr('id') === 'cell-' + (_cellIds - 1) || _cellIds === 0) {
        // Grab a fersh index
        var cellIndex = _cellIds++;
        // Clone a cell and inject a controls-section
        var $newCell = _$protoSection.clone().attr({id: 'cell-' + cellIndex});
        var $controls = _$protoControls.clone().attr(
          {id: 'cell-controls-' + cellIndex}
        );
        $newCell.prepend($controls);
        $newCell.find('.cell-tag').text(cellIndex);
        $currentCell.after($newCell);
        // initialize stuff
        $newCell
          .removeClass('pending')
          .find('textarea')
            .on('focus', _onTextAreaFocus)
            .on('blur', _onTextAreaBlur)
            .on('keypress', _onCodeCellKeypress)
            .on('keyup', _onCellKeyup)
            .autosize()
            .focus();
      }
    }

    // INIT
    addCell($('#cell-title'));
  });
}(jQuery));
