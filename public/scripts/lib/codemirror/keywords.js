var _ = require('underscore');

// Reserved word list (http://mdn.io/reserved)
module.exports = _.object(('break case catch continue debugger default ' +
               'delete do else false finally for function if in instanceof' +
               'new null return switch throw true try typeof var void while ' +
               'with').split(' '), true);
