!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.Notebook=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){

/**
 * Properties to ignore appending "px".
 */

var ignore = {
  columnCount: true,
  fillOpacity: true,
  fontWeight: true,
  lineHeight: true,
  opacity: true,
  orphans: true,
  widows: true,
  zIndex: true,
  zoom: true
};

/**
 * Set `el` css values.
 *
 * @param {Element} el
 * @param {Object} obj
 * @return {Element}
 * @api public
 */

module.exports = function(el, obj){
  for (var key in obj) {
    var val = obj[key];
    if ('number' == typeof val && !ignore[key]) val += 'px';
    el.style[key] = val;
  }
  return el;
};

},{}],2:[function(_dereq_,module,exports){

var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

module.exports = function forEach (obj, fn, ctx) {
    if (toString.call(fn) !== '[object Function]') {
        throw new TypeError('iterator must be a function');
    }
    var l = obj.length;
    if (l === +l) {
        for (var i = 0; i < l; i++) {
            fn.call(ctx, obj[i], i, obj);
        }
    } else {
        for (var k in obj) {
            if (hasOwn.call(obj, k)) {
                fn.call(ctx, obj[k], k, obj);
            }
        }
    }
};


},{}],3:[function(_dereq_,module,exports){
/*! Kamino v0.0.1 | http://github.com/Cyril-sf/kamino.js | Copyright 2012, Kit Cambridge | http://kit.mit-license.org */
(function(window) {
  // Convenience aliases.
  var getClass = {}.toString, isProperty, forEach, undef;

  Kamino = {};
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = Kamino;
    }
    exports.Kamino = Kamino;
  } else {
    window['Kamino'] = Kamino;
  }

  Kamino.VERSION = '0.1.0';

  KaminoException = function() {
    this.name = "KaminoException";
    this.number = 25;
    this.message = "Uncaught Error: DATA_CLONE_ERR: Kamino Exception 25";
  };

  // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
  var isExtended = new Date(-3509827334573292);
  try {
    // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
    // results for certain dates in Opera >= 10.53.
    isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() == 1 &&
      // Safari < 2.0.2 stores the internal millisecond time value correctly,
      // but clips the values returned by the date methods to the range of
      // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
      isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
  } catch (exception) {}

  // IE <= 7 doesn't support accessing string characters using square
  // bracket notation. IE 8 only supports this for primitives.
  var charIndexBuggy = "A"[0] != "A";

  // Define additional utility methods if the `Date` methods are buggy.
  if (!isExtended) {
    var floor = Math.floor;
    // A mapping between the months of the year and the number of days between
    // January 1st and the first of the respective month.
    var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    // Internal: Calculates the number of days between the Unix epoch and the
    // first day of the given month.
    var getDay = function (year, month) {
      return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
    };
  }

  // Internal: Determines if a property is a direct property of the given
  // object. Delegates to the native `Object#hasOwnProperty` method.
  if (!(isProperty = {}.hasOwnProperty)) {
    isProperty = function (property) {
      var members = {}, constructor;
      if ((members.__proto__ = null, members.__proto__ = {
        // The *proto* property cannot be set multiple times in recent
        // versions of Firefox and SeaMonkey.
        "toString": 1
      }, members).toString != getClass) {
        // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
        // supports the mutable *proto* property.
        isProperty = function (property) {
          // Capture and break the object's prototype chain (see section 8.6.2
          // of the ES 5.1 spec). The parenthesized expression prevents an
          // unsafe transformation by the Closure Compiler.
          var original = this.__proto__, result = property in (this.__proto__ = null, this);
          // Restore the original prototype chain.
          this.__proto__ = original;
          return result;
        };
      } else {
        // Capture a reference to the top-level `Object` constructor.
        constructor = members.constructor;
        // Use the `constructor` property to simulate `Object#hasOwnProperty` in
        // other environments.
        isProperty = function (property) {
          var parent = (this.constructor || constructor).prototype;
          return property in this && !(property in parent && this[property] === parent[property]);
        };
      }
      members = null;
      return isProperty.call(this, property);
    };
  }

  // Internal: Normalizes the `for...in` iteration algorithm across
  // environments. Each enumerated key is yielded to a `callback` function.
  forEach = function (object, callback) {
    var size = 0, Properties, members, property, forEach;

    // Tests for bugs in the current environment's `for...in` algorithm. The
    // `valueOf` property inherits the non-enumerable flag from
    // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
    (Properties = function () {
      this.valueOf = 0;
    }).prototype.valueOf = 0;

    // Iterate over a new instance of the `Properties` class.
    members = new Properties();
    for (property in members) {
      // Ignore all properties inherited from `Object.prototype`.
      if (isProperty.call(members, property)) {
        size++;
      }
    }
    Properties = members = null;

    // Normalize the iteration algorithm.
    if (!size) {
      // A list of non-enumerable properties inherited from `Object.prototype`.
      members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
      // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
      // properties.
      forEach = function (object, callback) {
        var isFunction = getClass.call(object) == "[object Function]", property, length;
        for (property in object) {
          // Gecko <= 1.0 enumerates the `prototype` property of functions under
          // certain conditions; IE does not.
          if (!(isFunction && property == "prototype") && isProperty.call(object, property)) {
            callback(property);
          }
        }
        // Manually invoke the callback for each non-enumerable property.
        for (length = members.length; property = members[--length]; isProperty.call(object, property) && callback(property));
      };
    } else if (size == 2) {
      // Safari <= 2.0.4 enumerates shadowed properties twice.
      forEach = function (object, callback) {
        // Create a set of iterated properties.
        var members = {}, isFunction = getClass.call(object) == "[object Function]", property;
        for (property in object) {
          // Store each property name to prevent double enumeration. The
          // `prototype` property of functions is not enumerated due to cross-
          // environment inconsistencies.
          if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
            callback(property);
          }
        }
      };
    } else {
      // No bugs detected; use the standard `for...in` algorithm.
      forEach = function (object, callback) {
        var isFunction = getClass.call(object) == "[object Function]", property, isConstructor;
        for (property in object) {
          if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
            callback(property);
          }
        }
        // Manually invoke the callback for the `constructor` property due to
        // cross-environment inconsistencies.
        if (isConstructor || isProperty.call(object, (property = "constructor"))) {
          callback(property);
        }
      };
    }
    return forEach(object, callback);
  };

  // Public: Serializes a JavaScript `value` as a string. The optional
  // `filter` argument may specify either a function that alters how object and
  // array members are serialized, or an array of strings and numbers that
  // indicates which properties should be serialized. The optional `width`
  // argument may be either a string or number that specifies the indentation
  // level of the output.

  // Internal: A map of control characters and their escaped equivalents.
  var Escapes = {
    "\\": "\\\\",
    '"': '\\"',
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "\t": "\\t"
  };

  // Internal: Converts `value` into a zero-padded string such that its
  // length is at least equal to `width`. The `width` must be <= 6.
  var toPaddedString = function (width, value) {
    // The `|| 0` expression is necessary to work around a bug in
    // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
    return ("000000" + (value || 0)).slice(-width);
  };

  // Internal: Double-quotes a string `value`, replacing all ASCII control
  // characters (characters with code unit values between 0 and 31) with
  // their escaped equivalents. This is an implementation of the
  // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
  var quote = function (value) {
    var result = '"', index = 0, symbol;
    for (; symbol = value.charAt(index); index++) {
      // Escape the reverse solidus, double quote, backspace, form feed, line
      // feed, carriage return, and tab characters.
      result += '\\"\b\f\n\r\t'.indexOf(symbol) > -1 ? Escapes[symbol] :
        // If the character is a control character, append its Unicode escape
        // sequence; otherwise, append the character as-is.
        (Escapes[symbol] = symbol < " " ? "\\u00" + toPaddedString(2, symbol.charCodeAt(0).toString(16)) : symbol);
    }
    return result + '"';
  };

  // Internal: detects if an object is a DOM element.
  // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
  var isElement = function(o) {
    return (
      typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
      o && typeof o === "object" && o.nodeType === 1 && typeof o.nodeName==="string"
    );
  };

  // Internal: Recursively serializes an object. Implements the
  // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
  var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
    var value = object[property], originalClassName, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, any, result,
        regExpSource, regExpModifiers = "";
    if( value instanceof Error || value instanceof Function) {
      throw new KaminoException();
    }
    if( isElement( value ) ) {
      throw new KaminoException();
    }
    if (typeof value == "object" && value) {
      originalClassName = getClass.call(value);
      if (originalClassName == "[object Date]" && !isProperty.call(value, "toJSON")) {
        if (value > -1 / 0 && value < 1 / 0) {
          value = value.toUTCString().replace("GMT", "UTC");
        } else {
          value = null;
        }
      } else if (typeof value.toJSON == "function" && ((originalClassName != "[object Number]" && originalClassName != "[object String]" && originalClassName != "[object Array]") || isProperty.call(value, "toJSON"))) {
        // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
        // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
        // ignores all `toJSON` methods on these objects unless they are
        // defined directly on an instance.
        value = value.toJSON(property);
      }
    }
    if (callback) {
      // If a replacement function was provided, call it to obtain the value
      // for serialization.
      value = callback.call(object, property, value);
    }
    if (value === null) {
      return "null";
    }
    if (value === undefined) {
      return undefined;
    }
    className = getClass.call(value);
    if (className == "[object Boolean]") {
      // Booleans are represented literally.
      return "" + value;
    } else if (className == "[object Number]") {
      // Kamino numbers must be finite. `Infinity` and `NaN` are serialized as
      // `"null"`.
      if( value === Number.POSITIVE_INFINITY ) {
        return "Infinity";
      } else if( value === Number.NEGATIVE_INFINITY ) {
        return "NInfinity";
      } else if( isNaN( value ) ) {
        return "NaN";
      }
      return "" + value;
    } else if (className == "[object RegExp]") {
      // Strings are double-quoted and escaped.
      regExpSource = value.source;
      regExpModifiers += value.ignoreCase ? "i" : "";
      regExpModifiers += value.global ? "g" : "";
      regExpModifiers += value.multiline ? "m" : "";

      regExpSource = quote(charIndexBuggy ? regExpSource.split("") : regExpSource);
      regExpModifiers = quote(charIndexBuggy ? regExpModifiers.split("") : regExpModifiers);

      // Adds the RegExp prefix.
      value = '^' + regExpSource + regExpModifiers;

      return value;
    } else if (className == "[object String]") {
      // Strings are double-quoted and escaped.
      value = quote(charIndexBuggy ? value.split("") : value);

      if( originalClassName == "[object Date]") {
        // Adds the Date prefix.
        value = '%' + value;
      }

      return value;
    }
    // Recursively serialize objects and arrays.
    if (typeof value == "object") {
      // Check for cyclic structures. This is a linear search; performance
      // is inversely proportional to the number of unique nested objects.
      for (length = stack.length; length--;) {
        if (stack[length] === value) {
          return "&" + length;
        }
      }
      // Add the object to the stack of traversed objects.
      stack.push(value);
      results = [];
      // Save the current indentation level and indent one additional level.
      prefix = indentation;
      indentation += whitespace;
      if (className == "[object Array]") {
        // Recursively serialize array elements.
        for (index = 0, length = value.length; index < length; any || (any = true), index++) {
          element = serialize(index, value, callback, properties, whitespace, indentation, stack);
          results.push(element === undef ? "null" : element);
        }
        result = any ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
      } else {
        // Recursively serialize object members. Members are selected from
        // either a user-specified list of property names, or the object
        // itself.
        forEach(properties || value, function (property) {
          var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
          if (element !== undef) {
            // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
            // is not the empty string, let `member` {quote(property) + ":"}
            // be the concatenation of `member` and the `space` character."
            // The "`space` character" refers to the literal space
            // character, not the `space` {width} argument provided to
            // `JSON.stringify`.
            results.push(quote(charIndexBuggy ? property.split("") : property) + ":" + (whitespace ? " " : "") + element);
          }
          any || (any = true);
        });
        result = any ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
      }
      return result;
    }
  };

  // Public: `Kamino.stringify`. See ES 5.1 section 15.12.3.
  Kamino.stringify = function (source, filter, width) {
    var whitespace, callback, properties;
    if (typeof filter == "function" || typeof filter == "object" && filter) {
      if (getClass.call(filter) == "[object Function]") {
        callback = filter;
      } else if (getClass.call(filter) == "[object Array]") {
        // Convert the property names array into a makeshift set.
        properties = {};
        for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((getClass.call(value) == "[object String]" || getClass.call(value) == "[object Number]") && (properties[value] = 1)));
      }
    }
    if (width) {
      if (getClass.call(width) == "[object Number]") {
        // Convert the `width` to an integer and create a string containing
        // `width` number of space characters.
        if ((width -= width % 1) > 0) {
          for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
        }
      } else if (getClass.call(width) == "[object String]") {
        whitespace = width.length <= 10 ? width : width.slice(0, 10);
      }
    }
    // Opera <= 7.54u2 discards the values associated with empty string keys
    // (`""`) only if they are used directly within an object member list
    // (e.g., `!("" in { "": 1})`).
    return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
  };

  // Public: Parses a source string.
  var fromCharCode = String.fromCharCode;

  // Internal: A map of escaped control characters and their unescaped
  // equivalents.
  var Unescapes = {
    "\\": "\\",
    '"': '"',
    "/": "/",
    "b": "\b",
    "t": "\t",
    "n": "\n",
    "f": "\f",
    "r": "\r"
  };

  // Internal: Stores the parser state.
  var Index, Source, stack;

  // Internal: Resets the parser state and throws a `SyntaxError`.
  var abort = function() {
    Index = Source = null;
    throw SyntaxError();
  };

  var parseString = function(prefix) {
    prefix = prefix || "";
    var source = Source, length = source.length, value, symbol, begin, position;
    // Advance to the next character and parse a Kamino string at the
    // current position. String tokens are prefixed with the sentinel
    // `@` character to distinguish them from punctuators.
    for (value = prefix, Index++; Index < length;) {
      symbol = source[Index];
      if (symbol < " ") {
        // Unescaped ASCII control characters are not permitted.
        abort();
      } else if (symbol == "\\") {
        // Parse escaped Kamino control characters, `"`, `\`, `/`, and
        // Unicode escape sequences.
        symbol = source[++Index];
        if ('\\"/btnfr'.indexOf(symbol) > -1) {
          // Revive escaped control characters.
          value += Unescapes[symbol];
          Index++;
        } else if (symbol == "u") {
          // Advance to the first character of the escape sequence.
          begin = ++Index;
          // Validate the Unicode escape sequence.
          for (position = Index + 4; Index < position; Index++) {
            symbol = source[Index];
            // A valid sequence comprises four hexdigits that form a
            // single hexadecimal value.
            if (!(symbol >= "0" && symbol <= "9" || symbol >= "a" && symbol <= "f" || symbol >= "A" && symbol <= "F")) {
              // Invalid Unicode escape sequence.
              abort();
            }
          }
          // Revive the escaped character.
          value += fromCharCode("0x" + source.slice(begin, Index));
        } else {
          // Invalid escape sequence.
          abort();
        }
      } else {
        if (symbol == '"') {
          // An unescaped double-quote character marks the end of the
          // string.
          break;
        }
        // Append the original character as-is.
        value += symbol;
        Index++;
      }
    }
    if (source[Index] == '"') {
      Index++;
      // Return the revived string.
      return value;
    }
    // Unterminated string.
    abort();
  };

  // Internal: Returns the next token, or `"$"` if the parser has reached
  // the end of the source string. A token may be a string, number, `null`
  // literal, `NaN` literal or Boolean literal.
  var lex = function () {
    var source = Source, length = source.length, symbol, value, begin, position, sign,
        dateString, regExpSource, regExpModifiers;
    while (Index < length) {
      symbol = source[Index];
      if ("\t\r\n ".indexOf(symbol) > -1) {
        // Skip whitespace tokens, including tabs, carriage returns, line
        // feeds, and space characters.
        Index++;
      } else if ("{}[]:,".indexOf(symbol) > -1) {
        // Parse a punctuator token at the current position.
        Index++;
        return symbol;
      } else if (symbol == '"') {
        // Parse strings.
        return parseString("@");
      } else if (symbol == '%') {
        // Parse dates.
        Index++;
        symbol = source[Index];
        if(symbol == '"') {
          dateString = parseString();
          return new Date( dateString );
        }
        abort();
      } else if (symbol == '^') {
        // Parse regular expressions.
        Index++;
        symbol = source[Index];
        if(symbol == '"') {
          regExpSource = parseString();

          symbol = source[Index];
          if(symbol == '"') {
            regExpModifiers = parseString();

            return new RegExp( regExpSource, regExpModifiers );
          }
        }
        abort();
      } else if (symbol == '&') {
        // Parse object references.
        Index++;
        symbol = source[Index];
        if (symbol >= "0" && symbol <= "9") {
          Index++;
          return stack[symbol];
        }
        abort();
      } else {
        // Parse numbers and literals.
        begin = Index;
        // Advance the scanner's position past the sign, if one is
        // specified.
        if (symbol == "-") {
          sign = true;
          symbol = source[++Index];
        }
        // Parse an integer or floating-point value.
        if (symbol >= "0" && symbol <= "9") {
          // Leading zeroes are interpreted as octal literals.
          if (symbol == "0" && (symbol = source[Index + 1], symbol >= "0" && symbol <= "9")) {
            // Illegal octal literal.
            abort();
          }
          sign = false;
          // Parse the integer component.
          for (; Index < length && (symbol = source[Index], symbol >= "0" && symbol <= "9"); Index++);
          // Floats cannot contain a leading decimal point; however, this
          // case is already accounted for by the parser.
          if (source[Index] == ".") {
            position = ++Index;
            // Parse the decimal component.
            for (; position < length && (symbol = source[position], symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              // Illegal trailing decimal.
              abort();
            }
            Index = position;
          }
          // Parse exponents.
          symbol = source[Index];
          if (symbol == "e" || symbol == "E") {
            // Skip past the sign following the exponent, if one is
            // specified.
            symbol = source[++Index];
            if (symbol == "+" || symbol == "-") {
              Index++;
            }
            // Parse the exponential component.
            for (position = Index; position < length && (symbol = source[position], symbol >= "0" && symbol <= "9"); position++);
            if (position == Index) {
              // Illegal empty exponent.
              abort();
            }
            Index = position;
          }
          // Coerce the parsed value to a JavaScript number.
          return +source.slice(begin, Index);
        }
        // A negative sign may only precede numbers.
        if (sign) {
          abort();
        }
        // `true`, `false`, `Infinity`, `-Infinity`, `NaN` and `null` literals.
        if (source.slice(Index, Index + 4) == "true") {
          Index += 4;
          return true;
        } else if (source.slice(Index, Index + 5) == "false") {
          Index += 5;
          return false;
        } else if (source.slice(Index, Index + 8) == "Infinity") {
          Index += 8;
          return Infinity;
        } else if (source.slice(Index, Index + 9) == "NInfinity") {
          Index += 9;
          return -Infinity;
        } else if (source.slice(Index, Index + 3) == "NaN") {
          Index += 3;
          return NaN;
        } else if (source.slice(Index, Index + 4) == "null") {
          Index += 4;
          return null;
        }
        // Unrecognized token.
        abort();
      }
    }
    // Return the sentinel `$` character if the parser has reached the end
    // of the source string.
    return "$";
  };

  // Internal: Parses a Kamino `value` token.
  var get = function (value) {
    var results, any, key;
    if (value == "$") {
      // Unexpected end of input.
      abort();
    }
    if (typeof value == "string") {
      if (value[0] == "@") {
        // Remove the sentinel `@` character.
        return value.slice(1);
      }
      // Parse object and array literals.
      if (value == "[") {
        // Parses a Kamino array, returning a new JavaScript array.
        results = [];
        stack[stack.length] = results;
        for (;; any || (any = true)) {
          value = lex();
          // A closing square bracket marks the end of the array literal.
          if (value == "]") {
            break;
          }
          // If the array literal contains elements, the current token
          // should be a comma separating the previous element from the
          // next.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "]") {
                // Unexpected trailing `,` in array literal.
                abort();
              }
            } else {
              // A `,` must separate each array element.
              abort();
            }
          }
          // Elisions and leading commas are not permitted.
          if (value == ",") {
            abort();
          }
          results.push(get(typeof value == "string" && charIndexBuggy ? value.split("") : value));
        }
        return results;
      } else if (value == "{") {
        // Parses a Kamino object, returning a new JavaScript object.
        results = {};
        stack[stack.length] = results;
        for (;; any || (any = true)) {
          value = lex();
          // A closing curly brace marks the end of the object literal.
          if (value == "}") {
            break;
          }
          // If the object literal contains members, the current token
          // should be a comma separator.
          if (any) {
            if (value == ",") {
              value = lex();
              if (value == "}") {
                // Unexpected trailing `,` in object literal.
                abort();
              }
            } else {
              // A `,` must separate each object member.
              abort();
            }
          }
          // Leading commas are not permitted, object property names must be
          // double-quoted strings, and a `:` must separate each property
          // name and value.
          if (value == "," || typeof value != "string" || value[0] != "@" || lex() != ":") {
            abort();
          }
          var result = lex();
          results[value.slice(1)] = get(typeof result == "string" && charIndexBuggy ? result.split("") : result);
        }
        return results;
      }
      // Unexpected token encountered.
      abort();
    }
    return value;
  };

  // Internal: Updates a traversed object member.
  var update = function(source, property, callback) {
    var element = walk(source, property, callback);
    if (element === undef) {
      delete source[property];
    } else {
      source[property] = element;
    }
  };

  // Internal: Recursively traverses a parsed Kamino object, invoking the
  // `callback` function for each value. This is an implementation of the
  // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
  var walk = function (source, property, callback) {
    var value = source[property], length;
    if (typeof value == "object" && value) {
      if (getClass.call(value) == "[object Array]") {
        for (length = value.length; length--;) {
          update(value, length, callback);
        }
      } else {
        // `forEach` can't be used to traverse an array in Opera <= 8.54,
        // as `Object#hasOwnProperty` returns `false` for array indices
        // (e.g., `![1, 2, 3].hasOwnProperty("0")`).
        forEach(value, function (property) {
          update(value, property, callback);
        });
      }
    }
    return callback.call(source, property, value);
  };

  // Public: `Kamino.parse`. See ES 5.1 section 15.12.2.
  Kamino.parse = function (source, callback) {
    var result, value;
    Index = 0;
    Source = "" + source;
    stack = [];
    if (charIndexBuggy) {
      Source = source.split("");
    }
    result = get(lex());
    // If a Kamino string contains multiple tokens, it is invalid.
    if (lex() != "$") {
      abort();
    }
    // Reset the parser state.
    Index = Source = null;
    return callback && getClass.call(callback) == "[object Function]" ? walk((value = {}, value[""] = result, value), "", callback) : result;
  };

  Kamino.clone = function(source) {
    return Kamino.parse( Kamino.stringify(source) );
  };
})(this);

},{}],4:[function(_dereq_,module,exports){
(function (global){
var css     = _dereq_('css-component');
var each    = _dereq_('foreach');
var Kamino  = _dereq_('kamino');
var __slice = Array.prototype.slice;

// Set the location to load the notebook from
var NOTEBOOK_URL = {"url":"https://mulesoft.github.io/api-notebook/","title":"API Notebook","oauthCallback":"/authenticate/oauth.html"}.url;

/**
 * Extend any object with the properties from other objects, overriding of left
 * to right.
 *
 * @param  {Object} obj Root object to copy properties to.
 * @param  {Object} ... Any number of source objects that properties will be
 *                      copied from.
 * @return {Object}
 */
var extend = function (obj /*, ...source */) {
  each(__slice.call(arguments, 1), function (source) {
    for (var prop in source) {
      if (Object.prototype.hasOwnProperty.call(source, prop)) {
        obj[prop] = source[prop];
      }
    }
  });

  return obj;
};

/**
 * Getting all the data atrributes of an element. Works cross-browser.
 *
 * @param  {Element} el
 * @return {Object}
 */
var getDataAttributes = function (el) {
  var obj  = {};

  if (el.dataset) {
    return extend(obj, el.dataset);
  }

  var upperCase = function (_, $0) { return $0.toUpperCase(); };

  var attrs = el.attributes;
  for (var i = 0, l = attrs.length; i < l; i++) {
    var attr = attrs.item(i);
    if (attr.nodeName.substr(0, 5) === 'data-') {
      var name = attr.nodeName.substr(5).replace(/\-(\w)/, upperCase);

      obj[name] = attr.nodeValue;
    }
  }

  return obj;
};

/**
 * Copy of all the default options for a new Notebook instance.
 *
 * @type {Object}
 */
var defaultOptions = {
  id:      null, // Initial id to pull content from
  content: null, // Fallback content in case of no id
  style:   {},   // Set styles on the iframe
  alias:   {}    // Alias objects into the frame once available
};

/**
 * Copy of the default iframe style options.
 *
 * @type {Object}
 */
var defaultStyles = {
  width:       '100%',
  border:      'none',
  display:     'block',
  marginLeft:  'auto',
  marginRight: 'auto',
  padding:     '0',
  overflow:    'hidden'
};

/**
 * Creates an embeddable version of the notebook for general consumption.
 *
 * @param  {(Element|Function)} el
 * @param  {Object}             options
 * @return {Notebook}
 */
var Notebook = module.exports = function (el, options, styles) {
  if (!(this instanceof Notebook)) {
    return new Notebook(el, options, styles);
  }

  var notebook = this;

  notebook._makeFrame(el, extend({}, defaultOptions, options));
  notebook._styleFrame(extend({}, defaultStyles, styles));

  // Listen to the ready event and set a flag for future ready functions.
  notebook.once('ready', function () {
    var notebook = this;

    // Set a "private" ready flag to ensure that any future register ready
    // functions are executed immediately.
    this._ready = true;

    // Iterate over the currently registered "ready" functions.
    if (this._readyFunctions) {
      each(this._readyFunctions, function (fn) {
        fn.call(notebook);
      });
    }

    // Delete the ready functions array since the functions shouldn't be used
    // anymore.
    delete this._readyFunctions;
  });
};

/**
 * Keep track of all created notebooks and allow configuration after creation.
 *
 * @type {Array}
 */
Notebook.instances = [];

/**
 * Keep track of all registered subscriptions and unsubscriptions.
 *
 * @type {Array}
 */
Notebook.subscriptions   = [];
Notebook.unsubscriptions = [];

/**
 * Pass a subscription method to every notebook. It will be called for all
 * notebook instances, new and old.
 *
 * @param {Function} fn
 */
Notebook.subscribe = function (fn) {
  Notebook.subscriptions.push(fn);

  each(Notebook.instances, fn);
};

/**
 * Pass an unsubscribe method to every notebook instance for removal.
 *
 * @param {Function} fn
 */
Notebook.unsubscribe = function (fn) {
  Notebook.unsubscriptions.push(fn);
};

/**
 * Generate an iframe to house the embeddable widget and append to the
 * designated element in the DOM.
 *
 * @param  {Element|Function} el
 * @return {Notebook}
 */
Notebook.prototype._makeFrame = function (el, options) {
  var that  = this;
  var src   = NOTEBOOK_URL + '/embed.html';
  var frame = this.el = document.createElement('iframe');

  // Configure base frame options.
  frame.src       = src;
  frame.className = options.className || '';
  frame.scrolling = 'no';

  // Extend basic configuration options.
  options.config = extend({
    id:       options.id,
    url:      window.location.href,
    embedded: true,
    content:  options.content
  }, options.config);

  // When the app is ready to receive events, send configuration data and let
  // the frame know that we are ready to execute.
  this.once('ready', function () {
    this.trigger('ready', options);

    this.once('rendered', function () {
      Notebook.instances.push(that);
      each(Notebook.subscriptions, function (fn) {
        fn(that);
      });
    });
  });

  // When a new height comes through, update the iframe height. Use the inline
  // height tag since css should take a higher precendence (which allows simple
  // height overrides to work alongside this).
  this.on('height', function (height) {
    var top    = parseInt(this.el.style.paddingTop,    10);
    var bottom = parseInt(this.el.style.paddingBottom, 10);

    this.el.height = (height + top + bottom);
  });

  // Set up a single message listener that will trigger events from the frame
  global.addEventListener('message', this._messageListener = function (e) {
    if (e.source !== frame.contentWindow) { return; }

    that._frameEvent = e;
    that.trigger.apply(that, Kamino.parse(e.data));
  }, false);

  if (typeof el.appendChild === 'function') {
    el.appendChild(frame);
  } else {
    el(frame);
  }

  this.window = frame.contentWindow;

  return this;
};

/**
 * Sets the inline styles of the frame.
 *
 * @param  {Object}   style
 * @return {Notebook}
 */
Notebook.prototype._styleFrame = function (styles) {
  css(this.el, styles);
  return this;
};

/**
 * Evaluate text in the context of the notebook frame.
 *
 * @param {String}   evil
 * @param {Function} done
 */
Notebook.prototype.exec = function (evil, done) {
  this.once('exec', function (result) {
    return done && done(result);
  });

  this.trigger('exec', evil);
};


/**
 * Returns a variable from the embedded page.
 *
 * @param {String}   key
 * @param {Function} done
 */
Notebook.prototype.getVariable = function (key, done) {
  this.exec(key, done);
};

/**
 * Removes the frame from the DOM.
 *
 * @return {Notebook}
 */
Notebook.prototype._removeFrame = function () {
  global.removeEventListener('message', this._messageListener);
  this.el.parentNode.removeChild(this.el);
  delete this.el;

  return this;
};

/**
 * Removes any notebook associated data from the embedding frame.
 *
 * @return {Notebook}
 */
Notebook.prototype.remove = function () {
  for (var i = 0; i < Notebook.instances.length; i++) {
    if (Notebook.instances[i] === this) {
      /* jshint -W083 */
      each(Notebook.unsubscriptions, function (fn) {
        fn(Notebook.instances[i]);
      });

      i--;
      Notebook.instances.pop();
    }
  }

  this.off();

  return this._removeFrame();
};

/**
 * Listen to events triggered by the frame.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @return {Notebook}
 */
Notebook.prototype.on = function (name, fn) {
  this._events = this._events || {};
  var events = (this._events[name] = this._events[name] || []);
  events.push(fn);

  return this;
};

/**
 * Listen to an event being triggered by the frame once.
 *
 * @param  {String}   name
 * @param  {Function} fn
 * @return {Notebook}
 */
Notebook.prototype.once = function (name, fn) {
  var that = this;
  return this.on(name, function cb () {
    that.off(name, cb);
    fn.apply(this, arguments);
    fn = null;
  });
};

/**
 * Remove an event listener from the frame.
 *
 * @param  {String}   name
 * @param  {Function} [fn]
 * @return {Notebook}
 */
Notebook.prototype.off = function (name, fn) {
  if (!this._events || !this._events[name]) { return this; }

  if (!fn) {
    if (!name) {
      delete this._events;
    } else {
      delete this._events[name];
    }

    return this;
  }

  var events = this._events[name];
  for (var i = 0; i < events.length; i++) {
    if (events[i] === fn) {
      events.splice(i, 1);
      i--;
    }
  }

  if (!events.length) { delete this._events[name]; }

  return this;
};

/**
 * Trigger an event on the frame. Read: Sends an event to the frames postMessage
 * handler.
 *
 * @param  {String}   name
 * @param  {*}        ...  Any additional data you wish the send with the event
 * @return {Notebook}
 */
Notebook.prototype.trigger = function (name /*, ..args */) {
  var that = this;
  var args;

  if (this._frameEvent) {
    delete that._frameEvent;
    args = __slice.call(arguments, 1);
    if (this._events && this._events[name]) {
      // Slice a copy of the events since we might be removing an event from
      // within an event callback. In which case it would break the loop.
      each(this._events[name].slice(), function (fn) {
        fn.apply(that, args);
      });
    }
    return this;
  }

  args = __slice.call(arguments, 0);
  this.el.contentWindow.postMessage(Kamino.stringify(args), NOTEBOOK_URL);
  return this;
};

/**
 * Shorthand for setting a config option.
 */
Notebook.prototype.config = function () {
  this.trigger.apply(this, ['config'].concat(__slice.call(arguments)));
};

/**
 * Shorthand for passing messages to the application.
 */
Notebook.prototype.message = function () {
  this.trigger.apply(this, ['message'].concat(__slice.call(arguments)));
};

/**
 * Refresh the iframe.
 */
Notebook.prototype.refresh = function () {
  this.message('refresh');
};

/**
 * Execute a function when the notebook is ready to be interacted with.
 *
 * @param {Function} fn
 */
Notebook.prototype.ready = function (fn) {
  if (this._ready) {
    return fn.call(this);
  }

  (this._readyFunctions || (this._readyFunctions = [])).push(fn);
};

/**
 * Attempts to automatically create the initial notebook by scanning for the
 * correct script tag and using the data from it to generate the notebook.
 *
 * @param {NodeList} scripts
 */
(function (scripts) {
  var script;

  for (var i = 0, l = scripts.length; i < l; i++) {
    // Allows the script to be loaded asynchronously if we provide this
    // attribute with the script tag.
    if (scripts[i].hasAttribute('data-notebook')) {
      script = scripts[i];
      break;
    }
  }

  if (!script) {
    return;
  }

  // By default we'll create the notebook in the same element as the script.
  var el = script.parentNode;

  // Allow the notebook attribute to point to another element.
  if (script.getAttribute('data-notebook')) {
    el = document.getElementById(script.getAttribute('data-notebook'));
  }

  // Remove the `data-notebook` attribute for future loads.
  script.removeAttribute('data-notebook');

  // Create the notebook instance and append.
  return new Notebook(el, getDataAttributes(script));
})(document.getElementsByTagName('script'));

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"css-component":1,"foreach":2,"kamino":3}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvYmxha2VlbWJyZXkvUHJvamVjdHMvYXBpLW5vdGVib29rL25vZGVfbW9kdWxlcy9jc3MtY29tcG9uZW50L2luZGV4LmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2FwaS1ub3RlYm9vay9ub2RlX21vZHVsZXMvZm9yZWFjaC9pbmRleC5qcyIsIi9Vc2Vycy9ibGFrZWVtYnJleS9Qcm9qZWN0cy9hcGktbm90ZWJvb2svbm9kZV9tb2R1bGVzL2thbWluby9saWIva2FtaW5vLmpzIiwiL1VzZXJzL2JsYWtlZW1icmV5L1Byb2plY3RzL2FwaS1ub3RlYm9vay9wdWJsaWMvc2NyaXB0cy9lbWJlZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNydEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlxuLyoqXG4gKiBQcm9wZXJ0aWVzIHRvIGlnbm9yZSBhcHBlbmRpbmcgXCJweFwiLlxuICovXG5cbnZhciBpZ25vcmUgPSB7XG4gIGNvbHVtbkNvdW50OiB0cnVlLFxuICBmaWxsT3BhY2l0eTogdHJ1ZSxcbiAgZm9udFdlaWdodDogdHJ1ZSxcbiAgbGluZUhlaWdodDogdHJ1ZSxcbiAgb3BhY2l0eTogdHJ1ZSxcbiAgb3JwaGFuczogdHJ1ZSxcbiAgd2lkb3dzOiB0cnVlLFxuICB6SW5kZXg6IHRydWUsXG4gIHpvb206IHRydWVcbn07XG5cbi8qKlxuICogU2V0IGBlbGAgY3NzIHZhbHVlcy5cbiAqXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtFbGVtZW50fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsLCBvYmope1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgdmFyIHZhbCA9IG9ialtrZXldO1xuICAgIGlmICgnbnVtYmVyJyA9PSB0eXBlb2YgdmFsICYmICFpZ25vcmVba2V5XSkgdmFsICs9ICdweCc7XG4gICAgZWwuc3R5bGVba2V5XSA9IHZhbDtcbiAgfVxuICByZXR1cm4gZWw7XG59O1xuIiwiXG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZm9yRWFjaCAob2JqLCBmbiwgY3R4KSB7XG4gICAgaWYgKHRvU3RyaW5nLmNhbGwoZm4pICE9PSAnW29iamVjdCBGdW5jdGlvbl0nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2l0ZXJhdG9yIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgIH1cbiAgICB2YXIgbCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGwgPT09ICtsKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICAgICAgICBmbi5jYWxsKGN0eCwgb2JqW2ldLCBpLCBvYmopO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yICh2YXIgayBpbiBvYmopIHtcbiAgICAgICAgICAgIGlmIChoYXNPd24uY2FsbChvYmosIGspKSB7XG4gICAgICAgICAgICAgICAgZm4uY2FsbChjdHgsIG9ialtrXSwgaywgb2JqKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbiIsIi8qISBLYW1pbm8gdjAuMC4xIHwgaHR0cDovL2dpdGh1Yi5jb20vQ3lyaWwtc2Yva2FtaW5vLmpzIHwgQ29weXJpZ2h0IDIwMTIsIEtpdCBDYW1icmlkZ2UgfCBodHRwOi8va2l0Lm1pdC1saWNlbnNlLm9yZyAqL1xuKGZ1bmN0aW9uKHdpbmRvdykge1xuICAvLyBDb252ZW5pZW5jZSBhbGlhc2VzLlxuICB2YXIgZ2V0Q2xhc3MgPSB7fS50b1N0cmluZywgaXNQcm9wZXJ0eSwgZm9yRWFjaCwgdW5kZWY7XG5cbiAgS2FtaW5vID0ge307XG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IEthbWlubztcbiAgICB9XG4gICAgZXhwb3J0cy5LYW1pbm8gPSBLYW1pbm87XG4gIH0gZWxzZSB7XG4gICAgd2luZG93WydLYW1pbm8nXSA9IEthbWlubztcbiAgfVxuXG4gIEthbWluby5WRVJTSU9OID0gJzAuMS4wJztcblxuICBLYW1pbm9FeGNlcHRpb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm5hbWUgPSBcIkthbWlub0V4Y2VwdGlvblwiO1xuICAgIHRoaXMubnVtYmVyID0gMjU7XG4gICAgdGhpcy5tZXNzYWdlID0gXCJVbmNhdWdodCBFcnJvcjogREFUQV9DTE9ORV9FUlI6IEthbWlubyBFeGNlcHRpb24gMjVcIjtcbiAgfTtcblxuICAvLyBUZXN0IHRoZSBgRGF0ZSNnZXRVVEMqYCBtZXRob2RzLiBCYXNlZCBvbiB3b3JrIGJ5IEBZYWZmbGUuXG4gIHZhciBpc0V4dGVuZGVkID0gbmV3IERhdGUoLTM1MDk4MjczMzQ1NzMyOTIpO1xuICB0cnkge1xuICAgIC8vIFRoZSBgZ2V0VVRDRnVsbFllYXJgLCBgTW9udGhgLCBhbmQgYERhdGVgIG1ldGhvZHMgcmV0dXJuIG5vbnNlbnNpY2FsXG4gICAgLy8gcmVzdWx0cyBmb3IgY2VydGFpbiBkYXRlcyBpbiBPcGVyYSA+PSAxMC41My5cbiAgICBpc0V4dGVuZGVkID0gaXNFeHRlbmRlZC5nZXRVVENGdWxsWWVhcigpID09IC0xMDkyNTIgJiYgaXNFeHRlbmRlZC5nZXRVVENNb250aCgpID09PSAwICYmIGlzRXh0ZW5kZWQuZ2V0VVRDRGF0ZSgpID09IDEgJiZcbiAgICAgIC8vIFNhZmFyaSA8IDIuMC4yIHN0b3JlcyB0aGUgaW50ZXJuYWwgbWlsbGlzZWNvbmQgdGltZSB2YWx1ZSBjb3JyZWN0bHksXG4gICAgICAvLyBidXQgY2xpcHMgdGhlIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgZGF0ZSBtZXRob2RzIHRvIHRoZSByYW5nZSBvZlxuICAgICAgLy8gc2lnbmVkIDMyLWJpdCBpbnRlZ2VycyAoWy0yICoqIDMxLCAyICoqIDMxIC0gMV0pLlxuICAgICAgaXNFeHRlbmRlZC5nZXRVVENIb3VycygpID09IDEwICYmIGlzRXh0ZW5kZWQuZ2V0VVRDTWludXRlcygpID09IDM3ICYmIGlzRXh0ZW5kZWQuZ2V0VVRDU2Vjb25kcygpID09IDYgJiYgaXNFeHRlbmRlZC5nZXRVVENNaWxsaXNlY29uZHMoKSA9PSA3MDg7XG4gIH0gY2F0Y2ggKGV4Y2VwdGlvbikge31cblxuICAvLyBJRSA8PSA3IGRvZXNuJ3Qgc3VwcG9ydCBhY2Nlc3Npbmcgc3RyaW5nIGNoYXJhY3RlcnMgdXNpbmcgc3F1YXJlXG4gIC8vIGJyYWNrZXQgbm90YXRpb24uIElFIDggb25seSBzdXBwb3J0cyB0aGlzIGZvciBwcmltaXRpdmVzLlxuICB2YXIgY2hhckluZGV4QnVnZ3kgPSBcIkFcIlswXSAhPSBcIkFcIjtcblxuICAvLyBEZWZpbmUgYWRkaXRpb25hbCB1dGlsaXR5IG1ldGhvZHMgaWYgdGhlIGBEYXRlYCBtZXRob2RzIGFyZSBidWdneS5cbiAgaWYgKCFpc0V4dGVuZGVkKSB7XG4gICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgICAvLyBBIG1hcHBpbmcgYmV0d2VlbiB0aGUgbW9udGhzIG9mIHRoZSB5ZWFyIGFuZCB0aGUgbnVtYmVyIG9mIGRheXMgYmV0d2VlblxuICAgIC8vIEphbnVhcnkgMXN0IGFuZCB0aGUgZmlyc3Qgb2YgdGhlIHJlc3BlY3RpdmUgbW9udGguXG4gICAgdmFyIE1vbnRocyA9IFswLCAzMSwgNTksIDkwLCAxMjAsIDE1MSwgMTgxLCAyMTIsIDI0MywgMjczLCAzMDQsIDMzNF07XG4gICAgLy8gSW50ZXJuYWw6IENhbGN1bGF0ZXMgdGhlIG51bWJlciBvZiBkYXlzIGJldHdlZW4gdGhlIFVuaXggZXBvY2ggYW5kIHRoZVxuICAgIC8vIGZpcnN0IGRheSBvZiB0aGUgZ2l2ZW4gbW9udGguXG4gICAgdmFyIGdldERheSA9IGZ1bmN0aW9uICh5ZWFyLCBtb250aCkge1xuICAgICAgcmV0dXJuIE1vbnRoc1ttb250aF0gKyAzNjUgKiAoeWVhciAtIDE5NzApICsgZmxvb3IoKHllYXIgLSAxOTY5ICsgKG1vbnRoID0gKyhtb250aCA+IDEpKSkgLyA0KSAtIGZsb29yKCh5ZWFyIC0gMTkwMSArIG1vbnRoKSAvIDEwMCkgKyBmbG9vcigoeWVhciAtIDE2MDEgKyBtb250aCkgLyA0MDApO1xuICAgIH07XG4gIH1cblxuICAvLyBJbnRlcm5hbDogRGV0ZXJtaW5lcyBpZiBhIHByb3BlcnR5IGlzIGEgZGlyZWN0IHByb3BlcnR5IG9mIHRoZSBnaXZlblxuICAvLyBvYmplY3QuIERlbGVnYXRlcyB0byB0aGUgbmF0aXZlIGBPYmplY3QjaGFzT3duUHJvcGVydHlgIG1ldGhvZC5cbiAgaWYgKCEoaXNQcm9wZXJ0eSA9IHt9Lmhhc093blByb3BlcnR5KSkge1xuICAgIGlzUHJvcGVydHkgPSBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgIHZhciBtZW1iZXJzID0ge30sIGNvbnN0cnVjdG9yO1xuICAgICAgaWYgKChtZW1iZXJzLl9fcHJvdG9fXyA9IG51bGwsIG1lbWJlcnMuX19wcm90b19fID0ge1xuICAgICAgICAvLyBUaGUgKnByb3RvKiBwcm9wZXJ0eSBjYW5ub3QgYmUgc2V0IG11bHRpcGxlIHRpbWVzIGluIHJlY2VudFxuICAgICAgICAvLyB2ZXJzaW9ucyBvZiBGaXJlZm94IGFuZCBTZWFNb25rZXkuXG4gICAgICAgIFwidG9TdHJpbmdcIjogMVxuICAgICAgfSwgbWVtYmVycykudG9TdHJpbmcgIT0gZ2V0Q2xhc3MpIHtcbiAgICAgICAgLy8gU2FmYXJpIDw9IDIuMC4zIGRvZXNuJ3QgaW1wbGVtZW50IGBPYmplY3QjaGFzT3duUHJvcGVydHlgLCBidXRcbiAgICAgICAgLy8gc3VwcG9ydHMgdGhlIG11dGFibGUgKnByb3RvKiBwcm9wZXJ0eS5cbiAgICAgICAgaXNQcm9wZXJ0eSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xuICAgICAgICAgIC8vIENhcHR1cmUgYW5kIGJyZWFrIHRoZSBvYmplY3QncyBwcm90b3R5cGUgY2hhaW4gKHNlZSBzZWN0aW9uIDguNi4yXG4gICAgICAgICAgLy8gb2YgdGhlIEVTIDUuMSBzcGVjKS4gVGhlIHBhcmVudGhlc2l6ZWQgZXhwcmVzc2lvbiBwcmV2ZW50cyBhblxuICAgICAgICAgIC8vIHVuc2FmZSB0cmFuc2Zvcm1hdGlvbiBieSB0aGUgQ2xvc3VyZSBDb21waWxlci5cbiAgICAgICAgICB2YXIgb3JpZ2luYWwgPSB0aGlzLl9fcHJvdG9fXywgcmVzdWx0ID0gcHJvcGVydHkgaW4gKHRoaXMuX19wcm90b19fID0gbnVsbCwgdGhpcyk7XG4gICAgICAgICAgLy8gUmVzdG9yZSB0aGUgb3JpZ2luYWwgcHJvdG90eXBlIGNoYWluLlxuICAgICAgICAgIHRoaXMuX19wcm90b19fID0gb3JpZ2luYWw7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIENhcHR1cmUgYSByZWZlcmVuY2UgdG8gdGhlIHRvcC1sZXZlbCBgT2JqZWN0YCBjb25zdHJ1Y3Rvci5cbiAgICAgICAgY29uc3RydWN0b3IgPSBtZW1iZXJzLmNvbnN0cnVjdG9yO1xuICAgICAgICAvLyBVc2UgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgdG8gc2ltdWxhdGUgYE9iamVjdCNoYXNPd25Qcm9wZXJ0eWAgaW5cbiAgICAgICAgLy8gb3RoZXIgZW52aXJvbm1lbnRzLlxuICAgICAgICBpc1Byb3BlcnR5ID0gZnVuY3Rpb24gKHByb3BlcnR5KSB7XG4gICAgICAgICAgdmFyIHBhcmVudCA9ICh0aGlzLmNvbnN0cnVjdG9yIHx8IGNvbnN0cnVjdG9yKS5wcm90b3R5cGU7XG4gICAgICAgICAgcmV0dXJuIHByb3BlcnR5IGluIHRoaXMgJiYgIShwcm9wZXJ0eSBpbiBwYXJlbnQgJiYgdGhpc1twcm9wZXJ0eV0gPT09IHBhcmVudFtwcm9wZXJ0eV0pO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgbWVtYmVycyA9IG51bGw7XG4gICAgICByZXR1cm4gaXNQcm9wZXJ0eS5jYWxsKHRoaXMsIHByb3BlcnR5KTtcbiAgICB9O1xuICB9XG5cbiAgLy8gSW50ZXJuYWw6IE5vcm1hbGl6ZXMgdGhlIGBmb3IuLi5pbmAgaXRlcmF0aW9uIGFsZ29yaXRobSBhY3Jvc3NcbiAgLy8gZW52aXJvbm1lbnRzLiBFYWNoIGVudW1lcmF0ZWQga2V5IGlzIHlpZWxkZWQgdG8gYSBgY2FsbGJhY2tgIGZ1bmN0aW9uLlxuICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICB2YXIgc2l6ZSA9IDAsIFByb3BlcnRpZXMsIG1lbWJlcnMsIHByb3BlcnR5LCBmb3JFYWNoO1xuXG4gICAgLy8gVGVzdHMgZm9yIGJ1Z3MgaW4gdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQncyBgZm9yLi4uaW5gIGFsZ29yaXRobS4gVGhlXG4gICAgLy8gYHZhbHVlT2ZgIHByb3BlcnR5IGluaGVyaXRzIHRoZSBub24tZW51bWVyYWJsZSBmbGFnIGZyb21cbiAgICAvLyBgT2JqZWN0LnByb3RvdHlwZWAgaW4gb2xkZXIgdmVyc2lvbnMgb2YgSUUsIE5ldHNjYXBlLCBhbmQgTW96aWxsYS5cbiAgICAoUHJvcGVydGllcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMudmFsdWVPZiA9IDA7XG4gICAgfSkucHJvdG90eXBlLnZhbHVlT2YgPSAwO1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIGEgbmV3IGluc3RhbmNlIG9mIHRoZSBgUHJvcGVydGllc2AgY2xhc3MuXG4gICAgbWVtYmVycyA9IG5ldyBQcm9wZXJ0aWVzKCk7XG4gICAgZm9yIChwcm9wZXJ0eSBpbiBtZW1iZXJzKSB7XG4gICAgICAvLyBJZ25vcmUgYWxsIHByb3BlcnRpZXMgaW5oZXJpdGVkIGZyb20gYE9iamVjdC5wcm90b3R5cGVgLlxuICAgICAgaWYgKGlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkpIHtcbiAgICAgICAgc2l6ZSsrO1xuICAgICAgfVxuICAgIH1cbiAgICBQcm9wZXJ0aWVzID0gbWVtYmVycyA9IG51bGw7XG5cbiAgICAvLyBOb3JtYWxpemUgdGhlIGl0ZXJhdGlvbiBhbGdvcml0aG0uXG4gICAgaWYgKCFzaXplKSB7XG4gICAgICAvLyBBIGxpc3Qgb2Ygbm9uLWVudW1lcmFibGUgcHJvcGVydGllcyBpbmhlcml0ZWQgZnJvbSBgT2JqZWN0LnByb3RvdHlwZWAuXG4gICAgICBtZW1iZXJzID0gW1widmFsdWVPZlwiLCBcInRvU3RyaW5nXCIsIFwidG9Mb2NhbGVTdHJpbmdcIiwgXCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLCBcImlzUHJvdG90eXBlT2ZcIiwgXCJoYXNPd25Qcm9wZXJ0eVwiLCBcImNvbnN0cnVjdG9yXCJdO1xuICAgICAgLy8gSUUgPD0gOCwgTW96aWxsYSAxLjAsIGFuZCBOZXRzY2FwZSA2LjIgaWdub3JlIHNoYWRvd2VkIG5vbi1lbnVtZXJhYmxlXG4gICAgICAvLyBwcm9wZXJ0aWVzLlxuICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IFwiW29iamVjdCBGdW5jdGlvbl1cIiwgcHJvcGVydHksIGxlbmd0aDtcbiAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAvLyBHZWNrbyA8PSAxLjAgZW51bWVyYXRlcyB0aGUgYHByb3RvdHlwZWAgcHJvcGVydHkgb2YgZnVuY3Rpb25zIHVuZGVyXG4gICAgICAgICAgLy8gY2VydGFpbiBjb25kaXRpb25zOyBJRSBkb2VzIG5vdC5cbiAgICAgICAgICBpZiAoIShpc0Z1bmN0aW9uICYmIHByb3BlcnR5ID09IFwicHJvdG90eXBlXCIpICYmIGlzUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KSkge1xuICAgICAgICAgICAgY2FsbGJhY2socHJvcGVydHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBNYW51YWxseSBpbnZva2UgdGhlIGNhbGxiYWNrIGZvciBlYWNoIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5LlxuICAgICAgICBmb3IgKGxlbmd0aCA9IG1lbWJlcnMubGVuZ3RoOyBwcm9wZXJ0eSA9IG1lbWJlcnNbLS1sZW5ndGhdOyBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgY2FsbGJhY2socHJvcGVydHkpKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChzaXplID09IDIpIHtcbiAgICAgIC8vIFNhZmFyaSA8PSAyLjAuNCBlbnVtZXJhdGVzIHNoYWRvd2VkIHByb3BlcnRpZXMgdHdpY2UuXG4gICAgICBmb3JFYWNoID0gZnVuY3Rpb24gKG9iamVjdCwgY2FsbGJhY2spIHtcbiAgICAgICAgLy8gQ3JlYXRlIGEgc2V0IG9mIGl0ZXJhdGVkIHByb3BlcnRpZXMuXG4gICAgICAgIHZhciBtZW1iZXJzID0ge30sIGlzRnVuY3Rpb24gPSBnZXRDbGFzcy5jYWxsKG9iamVjdCkgPT0gXCJbb2JqZWN0IEZ1bmN0aW9uXVwiLCBwcm9wZXJ0eTtcbiAgICAgICAgZm9yIChwcm9wZXJ0eSBpbiBvYmplY3QpIHtcbiAgICAgICAgICAvLyBTdG9yZSBlYWNoIHByb3BlcnR5IG5hbWUgdG8gcHJldmVudCBkb3VibGUgZW51bWVyYXRpb24uIFRoZVxuICAgICAgICAgIC8vIGBwcm90b3R5cGVgIHByb3BlcnR5IG9mIGZ1bmN0aW9ucyBpcyBub3QgZW51bWVyYXRlZCBkdWUgdG8gY3Jvc3MtXG4gICAgICAgICAgLy8gZW52aXJvbm1lbnQgaW5jb25zaXN0ZW5jaWVzLlxuICAgICAgICAgIGlmICghKGlzRnVuY3Rpb24gJiYgcHJvcGVydHkgPT0gXCJwcm90b3R5cGVcIikgJiYgIWlzUHJvcGVydHkuY2FsbChtZW1iZXJzLCBwcm9wZXJ0eSkgJiYgKG1lbWJlcnNbcHJvcGVydHldID0gMSkgJiYgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgcHJvcGVydHkpKSB7XG4gICAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBObyBidWdzIGRldGVjdGVkOyB1c2UgdGhlIHN0YW5kYXJkIGBmb3IuLi5pbmAgYWxnb3JpdGhtLlxuICAgICAgZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmplY3QsIGNhbGxiYWNrKSB7XG4gICAgICAgIHZhciBpc0Z1bmN0aW9uID0gZ2V0Q2xhc3MuY2FsbChvYmplY3QpID09IFwiW29iamVjdCBGdW5jdGlvbl1cIiwgcHJvcGVydHksIGlzQ29uc3RydWN0b3I7XG4gICAgICAgIGZvciAocHJvcGVydHkgaW4gb2JqZWN0KSB7XG4gICAgICAgICAgaWYgKCEoaXNGdW5jdGlvbiAmJiBwcm9wZXJ0eSA9PSBcInByb3RvdHlwZVwiKSAmJiBpc1Byb3BlcnR5LmNhbGwob2JqZWN0LCBwcm9wZXJ0eSkgJiYgIShpc0NvbnN0cnVjdG9yID0gcHJvcGVydHkgPT09IFwiY29uc3RydWN0b3JcIikpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHByb3BlcnR5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWFudWFsbHkgaW52b2tlIHRoZSBjYWxsYmFjayBmb3IgdGhlIGBjb25zdHJ1Y3RvcmAgcHJvcGVydHkgZHVlIHRvXG4gICAgICAgIC8vIGNyb3NzLWVudmlyb25tZW50IGluY29uc2lzdGVuY2llcy5cbiAgICAgICAgaWYgKGlzQ29uc3RydWN0b3IgfHwgaXNQcm9wZXJ0eS5jYWxsKG9iamVjdCwgKHByb3BlcnR5ID0gXCJjb25zdHJ1Y3RvclwiKSkpIHtcbiAgICAgICAgICBjYWxsYmFjayhwcm9wZXJ0eSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBmb3JFYWNoKG9iamVjdCwgY2FsbGJhY2spO1xuICB9O1xuXG4gIC8vIFB1YmxpYzogU2VyaWFsaXplcyBhIEphdmFTY3JpcHQgYHZhbHVlYCBhcyBhIHN0cmluZy4gVGhlIG9wdGlvbmFsXG4gIC8vIGBmaWx0ZXJgIGFyZ3VtZW50IG1heSBzcGVjaWZ5IGVpdGhlciBhIGZ1bmN0aW9uIHRoYXQgYWx0ZXJzIGhvdyBvYmplY3QgYW5kXG4gIC8vIGFycmF5IG1lbWJlcnMgYXJlIHNlcmlhbGl6ZWQsIG9yIGFuIGFycmF5IG9mIHN0cmluZ3MgYW5kIG51bWJlcnMgdGhhdFxuICAvLyBpbmRpY2F0ZXMgd2hpY2ggcHJvcGVydGllcyBzaG91bGQgYmUgc2VyaWFsaXplZC4gVGhlIG9wdGlvbmFsIGB3aWR0aGBcbiAgLy8gYXJndW1lbnQgbWF5IGJlIGVpdGhlciBhIHN0cmluZyBvciBudW1iZXIgdGhhdCBzcGVjaWZpZXMgdGhlIGluZGVudGF0aW9uXG4gIC8vIGxldmVsIG9mIHRoZSBvdXRwdXQuXG5cbiAgLy8gSW50ZXJuYWw6IEEgbWFwIG9mIGNvbnRyb2wgY2hhcmFjdGVycyBhbmQgdGhlaXIgZXNjYXBlZCBlcXVpdmFsZW50cy5cbiAgdmFyIEVzY2FwZXMgPSB7XG4gICAgXCJcXFxcXCI6IFwiXFxcXFxcXFxcIixcbiAgICAnXCInOiAnXFxcXFwiJyxcbiAgICBcIlxcYlwiOiBcIlxcXFxiXCIsXG4gICAgXCJcXGZcIjogXCJcXFxcZlwiLFxuICAgIFwiXFxuXCI6IFwiXFxcXG5cIixcbiAgICBcIlxcclwiOiBcIlxcXFxyXCIsXG4gICAgXCJcXHRcIjogXCJcXFxcdFwiXG4gIH07XG5cbiAgLy8gSW50ZXJuYWw6IENvbnZlcnRzIGB2YWx1ZWAgaW50byBhIHplcm8tcGFkZGVkIHN0cmluZyBzdWNoIHRoYXQgaXRzXG4gIC8vIGxlbmd0aCBpcyBhdCBsZWFzdCBlcXVhbCB0byBgd2lkdGhgLiBUaGUgYHdpZHRoYCBtdXN0IGJlIDw9IDYuXG4gIHZhciB0b1BhZGRlZFN0cmluZyA9IGZ1bmN0aW9uICh3aWR0aCwgdmFsdWUpIHtcbiAgICAvLyBUaGUgYHx8IDBgIGV4cHJlc3Npb24gaXMgbmVjZXNzYXJ5IHRvIHdvcmsgYXJvdW5kIGEgYnVnIGluXG4gICAgLy8gT3BlcmEgPD0gNy41NHUyIHdoZXJlIGAwID09IC0wYCwgYnV0IGBTdHJpbmcoLTApICE9PSBcIjBcImAuXG4gICAgcmV0dXJuIChcIjAwMDAwMFwiICsgKHZhbHVlIHx8IDApKS5zbGljZSgtd2lkdGgpO1xuICB9O1xuXG4gIC8vIEludGVybmFsOiBEb3VibGUtcXVvdGVzIGEgc3RyaW5nIGB2YWx1ZWAsIHJlcGxhY2luZyBhbGwgQVNDSUkgY29udHJvbFxuICAvLyBjaGFyYWN0ZXJzIChjaGFyYWN0ZXJzIHdpdGggY29kZSB1bml0IHZhbHVlcyBiZXR3ZWVuIDAgYW5kIDMxKSB3aXRoXG4gIC8vIHRoZWlyIGVzY2FwZWQgZXF1aXZhbGVudHMuIFRoaXMgaXMgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlXG4gIC8vIGBRdW90ZSh2YWx1ZSlgIG9wZXJhdGlvbiBkZWZpbmVkIGluIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG4gIHZhciBxdW90ZSA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciByZXN1bHQgPSAnXCInLCBpbmRleCA9IDAsIHN5bWJvbDtcbiAgICBmb3IgKDsgc3ltYm9sID0gdmFsdWUuY2hhckF0KGluZGV4KTsgaW5kZXgrKykge1xuICAgICAgLy8gRXNjYXBlIHRoZSByZXZlcnNlIHNvbGlkdXMsIGRvdWJsZSBxdW90ZSwgYmFja3NwYWNlLCBmb3JtIGZlZWQsIGxpbmVcbiAgICAgIC8vIGZlZWQsIGNhcnJpYWdlIHJldHVybiwgYW5kIHRhYiBjaGFyYWN0ZXJzLlxuICAgICAgcmVzdWx0ICs9ICdcXFxcXCJcXGJcXGZcXG5cXHJcXHQnLmluZGV4T2Yoc3ltYm9sKSA+IC0xID8gRXNjYXBlc1tzeW1ib2xdIDpcbiAgICAgICAgLy8gSWYgdGhlIGNoYXJhY3RlciBpcyBhIGNvbnRyb2wgY2hhcmFjdGVyLCBhcHBlbmQgaXRzIFVuaWNvZGUgZXNjYXBlXG4gICAgICAgIC8vIHNlcXVlbmNlOyBvdGhlcndpc2UsIGFwcGVuZCB0aGUgY2hhcmFjdGVyIGFzLWlzLlxuICAgICAgICAoRXNjYXBlc1tzeW1ib2xdID0gc3ltYm9sIDwgXCIgXCIgPyBcIlxcXFx1MDBcIiArIHRvUGFkZGVkU3RyaW5nKDIsIHN5bWJvbC5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KSkgOiBzeW1ib2wpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0ICsgJ1wiJztcbiAgfTtcblxuICAvLyBJbnRlcm5hbDogZGV0ZWN0cyBpZiBhbiBvYmplY3QgaXMgYSBET00gZWxlbWVudC5cbiAgLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8zODQyODYvamF2YXNjcmlwdC1pc2RvbS1ob3ctZG8teW91LWNoZWNrLWlmLWEtamF2YXNjcmlwdC1vYmplY3QtaXMtYS1kb20tb2JqZWN0XG4gIHZhciBpc0VsZW1lbnQgPSBmdW5jdGlvbihvKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIHR5cGVvZiBIVE1MRWxlbWVudCA9PT0gXCJvYmplY3RcIiA/IG8gaW5zdGFuY2VvZiBIVE1MRWxlbWVudCA6IC8vRE9NMlxuICAgICAgbyAmJiB0eXBlb2YgbyA9PT0gXCJvYmplY3RcIiAmJiBvLm5vZGVUeXBlID09PSAxICYmIHR5cGVvZiBvLm5vZGVOYW1lPT09XCJzdHJpbmdcIlxuICAgICk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZXMgYW4gb2JqZWN0LiBJbXBsZW1lbnRzIHRoZVxuICAvLyBgU3RyKGtleSwgaG9sZGVyKWAsIGBKTyh2YWx1ZSlgLCBhbmQgYEpBKHZhbHVlKWAgb3BlcmF0aW9ucy5cbiAgdmFyIHNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChwcm9wZXJ0eSwgb2JqZWN0LCBjYWxsYmFjaywgcHJvcGVydGllcywgd2hpdGVzcGFjZSwgaW5kZW50YXRpb24sIHN0YWNrKSB7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XSwgb3JpZ2luYWxDbGFzc05hbWUsIGNsYXNzTmFtZSwgeWVhciwgbW9udGgsIGRhdGUsIHRpbWUsIGhvdXJzLCBtaW51dGVzLCBzZWNvbmRzLCBtaWxsaXNlY29uZHMsIHJlc3VsdHMsIGVsZW1lbnQsIGluZGV4LCBsZW5ndGgsIHByZWZpeCwgYW55LCByZXN1bHQsXG4gICAgICAgIHJlZ0V4cFNvdXJjZSwgcmVnRXhwTW9kaWZpZXJzID0gXCJcIjtcbiAgICBpZiggdmFsdWUgaW5zdGFuY2VvZiBFcnJvciB8fCB2YWx1ZSBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICB0aHJvdyBuZXcgS2FtaW5vRXhjZXB0aW9uKCk7XG4gICAgfVxuICAgIGlmKCBpc0VsZW1lbnQoIHZhbHVlICkgKSB7XG4gICAgICB0aHJvdyBuZXcgS2FtaW5vRXhjZXB0aW9uKCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgdmFsdWUgPT0gXCJvYmplY3RcIiAmJiB2YWx1ZSkge1xuICAgICAgb3JpZ2luYWxDbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKTtcbiAgICAgIGlmIChvcmlnaW5hbENsYXNzTmFtZSA9PSBcIltvYmplY3QgRGF0ZV1cIiAmJiAhaXNQcm9wZXJ0eS5jYWxsKHZhbHVlLCBcInRvSlNPTlwiKSkge1xuICAgICAgICBpZiAodmFsdWUgPiAtMSAvIDAgJiYgdmFsdWUgPCAxIC8gMCkge1xuICAgICAgICAgIHZhbHVlID0gdmFsdWUudG9VVENTdHJpbmcoKS5yZXBsYWNlKFwiR01UXCIsIFwiVVRDXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlb2YgdmFsdWUudG9KU09OID09IFwiZnVuY3Rpb25cIiAmJiAoKG9yaWdpbmFsQ2xhc3NOYW1lICE9IFwiW29iamVjdCBOdW1iZXJdXCIgJiYgb3JpZ2luYWxDbGFzc05hbWUgIT0gXCJbb2JqZWN0IFN0cmluZ11cIiAmJiBvcmlnaW5hbENsYXNzTmFtZSAhPSBcIltvYmplY3QgQXJyYXldXCIpIHx8IGlzUHJvcGVydHkuY2FsbCh2YWx1ZSwgXCJ0b0pTT05cIikpKSB7XG4gICAgICAgIC8vIFByb3RvdHlwZSA8PSAxLjYuMSBhZGRzIG5vbi1zdGFuZGFyZCBgdG9KU09OYCBtZXRob2RzIHRvIHRoZVxuICAgICAgICAvLyBgTnVtYmVyYCwgYFN0cmluZ2AsIGBEYXRlYCwgYW5kIGBBcnJheWAgcHJvdG90eXBlcy4gSlNPTiAzXG4gICAgICAgIC8vIGlnbm9yZXMgYWxsIGB0b0pTT05gIG1ldGhvZHMgb24gdGhlc2Ugb2JqZWN0cyB1bmxlc3MgdGhleSBhcmVcbiAgICAgICAgLy8gZGVmaW5lZCBkaXJlY3RseSBvbiBhbiBpbnN0YW5jZS5cbiAgICAgICAgdmFsdWUgPSB2YWx1ZS50b0pTT04ocHJvcGVydHkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgIC8vIElmIGEgcmVwbGFjZW1lbnQgZnVuY3Rpb24gd2FzIHByb3ZpZGVkLCBjYWxsIGl0IHRvIG9idGFpbiB0aGUgdmFsdWVcbiAgICAgIC8vIGZvciBzZXJpYWxpemF0aW9uLlxuICAgICAgdmFsdWUgPSBjYWxsYmFjay5jYWxsKG9iamVjdCwgcHJvcGVydHksIHZhbHVlKTtcbiAgICB9XG4gICAgaWYgKHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gXCJudWxsXCI7XG4gICAgfVxuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBjbGFzc05hbWUgPSBnZXRDbGFzcy5jYWxsKHZhbHVlKTtcbiAgICBpZiAoY2xhc3NOYW1lID09IFwiW29iamVjdCBCb29sZWFuXVwiKSB7XG4gICAgICAvLyBCb29sZWFucyBhcmUgcmVwcmVzZW50ZWQgbGl0ZXJhbGx5LlxuICAgICAgcmV0dXJuIFwiXCIgKyB2YWx1ZTtcbiAgICB9IGVsc2UgaWYgKGNsYXNzTmFtZSA9PSBcIltvYmplY3QgTnVtYmVyXVwiKSB7XG4gICAgICAvLyBLYW1pbm8gbnVtYmVycyBtdXN0IGJlIGZpbml0ZS4gYEluZmluaXR5YCBhbmQgYE5hTmAgYXJlIHNlcmlhbGl6ZWQgYXNcbiAgICAgIC8vIGBcIm51bGxcImAuXG4gICAgICBpZiggdmFsdWUgPT09IE51bWJlci5QT1NJVElWRV9JTkZJTklUWSApIHtcbiAgICAgICAgcmV0dXJuIFwiSW5maW5pdHlcIjtcbiAgICAgIH0gZWxzZSBpZiggdmFsdWUgPT09IE51bWJlci5ORUdBVElWRV9JTkZJTklUWSApIHtcbiAgICAgICAgcmV0dXJuIFwiTkluZmluaXR5XCI7XG4gICAgICB9IGVsc2UgaWYoIGlzTmFOKCB2YWx1ZSApICkge1xuICAgICAgICByZXR1cm4gXCJOYU5cIjtcbiAgICAgIH1cbiAgICAgIHJldHVybiBcIlwiICsgdmFsdWU7XG4gICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gXCJbb2JqZWN0IFJlZ0V4cF1cIikge1xuICAgICAgLy8gU3RyaW5ncyBhcmUgZG91YmxlLXF1b3RlZCBhbmQgZXNjYXBlZC5cbiAgICAgIHJlZ0V4cFNvdXJjZSA9IHZhbHVlLnNvdXJjZTtcbiAgICAgIHJlZ0V4cE1vZGlmaWVycyArPSB2YWx1ZS5pZ25vcmVDYXNlID8gXCJpXCIgOiBcIlwiO1xuICAgICAgcmVnRXhwTW9kaWZpZXJzICs9IHZhbHVlLmdsb2JhbCA/IFwiZ1wiIDogXCJcIjtcbiAgICAgIHJlZ0V4cE1vZGlmaWVycyArPSB2YWx1ZS5tdWx0aWxpbmUgPyBcIm1cIiA6IFwiXCI7XG5cbiAgICAgIHJlZ0V4cFNvdXJjZSA9IHF1b3RlKGNoYXJJbmRleEJ1Z2d5ID8gcmVnRXhwU291cmNlLnNwbGl0KFwiXCIpIDogcmVnRXhwU291cmNlKTtcbiAgICAgIHJlZ0V4cE1vZGlmaWVycyA9IHF1b3RlKGNoYXJJbmRleEJ1Z2d5ID8gcmVnRXhwTW9kaWZpZXJzLnNwbGl0KFwiXCIpIDogcmVnRXhwTW9kaWZpZXJzKTtcblxuICAgICAgLy8gQWRkcyB0aGUgUmVnRXhwIHByZWZpeC5cbiAgICAgIHZhbHVlID0gJ14nICsgcmVnRXhwU291cmNlICsgcmVnRXhwTW9kaWZpZXJzO1xuXG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfSBlbHNlIGlmIChjbGFzc05hbWUgPT0gXCJbb2JqZWN0IFN0cmluZ11cIikge1xuICAgICAgLy8gU3RyaW5ncyBhcmUgZG91YmxlLXF1b3RlZCBhbmQgZXNjYXBlZC5cbiAgICAgIHZhbHVlID0gcXVvdGUoY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5zcGxpdChcIlwiKSA6IHZhbHVlKTtcblxuICAgICAgaWYoIG9yaWdpbmFsQ2xhc3NOYW1lID09IFwiW29iamVjdCBEYXRlXVwiKSB7XG4gICAgICAgIC8vIEFkZHMgdGhlIERhdGUgcHJlZml4LlxuICAgICAgICB2YWx1ZSA9ICclJyArIHZhbHVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiKSB7XG4gICAgICAvLyBDaGVjayBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoaXMgaXMgYSBsaW5lYXIgc2VhcmNoOyBwZXJmb3JtYW5jZVxuICAgICAgLy8gaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mIHVuaXF1ZSBuZXN0ZWQgb2JqZWN0cy5cbiAgICAgIGZvciAobGVuZ3RoID0gc3RhY2subGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgaWYgKHN0YWNrW2xlbmd0aF0gPT09IHZhbHVlKSB7XG4gICAgICAgICAgcmV0dXJuIFwiJlwiICsgbGVuZ3RoO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBBZGQgdGhlIG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgICBzdGFjay5wdXNoKHZhbHVlKTtcbiAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgIC8vIFNhdmUgdGhlIGN1cnJlbnQgaW5kZW50YXRpb24gbGV2ZWwgYW5kIGluZGVudCBvbmUgYWRkaXRpb25hbCBsZXZlbC5cbiAgICAgIHByZWZpeCA9IGluZGVudGF0aW9uO1xuICAgICAgaW5kZW50YXRpb24gKz0gd2hpdGVzcGFjZTtcbiAgICAgIGlmIChjbGFzc05hbWUgPT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBhcnJheSBlbGVtZW50cy5cbiAgICAgICAgZm9yIChpbmRleCA9IDAsIGxlbmd0aCA9IHZhbHVlLmxlbmd0aDsgaW5kZXggPCBsZW5ndGg7IGFueSB8fCAoYW55ID0gdHJ1ZSksIGluZGV4KyspIHtcbiAgICAgICAgICBlbGVtZW50ID0gc2VyaWFsaXplKGluZGV4LCB2YWx1ZSwgY2FsbGJhY2ssIHByb3BlcnRpZXMsIHdoaXRlc3BhY2UsIGluZGVudGF0aW9uLCBzdGFjayk7XG4gICAgICAgICAgcmVzdWx0cy5wdXNoKGVsZW1lbnQgPT09IHVuZGVmID8gXCJudWxsXCIgOiBlbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSBhbnkgPyAod2hpdGVzcGFjZSA/IFwiW1xcblwiICsgaW5kZW50YXRpb24gKyByZXN1bHRzLmpvaW4oXCIsXFxuXCIgKyBpbmRlbnRhdGlvbikgKyBcIlxcblwiICsgcHJlZml4ICsgXCJdXCIgOiAoXCJbXCIgKyByZXN1bHRzLmpvaW4oXCIsXCIpICsgXCJdXCIpKSA6IFwiW11cIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIFJlY3Vyc2l2ZWx5IHNlcmlhbGl6ZSBvYmplY3QgbWVtYmVycy4gTWVtYmVycyBhcmUgc2VsZWN0ZWQgZnJvbVxuICAgICAgICAvLyBlaXRoZXIgYSB1c2VyLXNwZWNpZmllZCBsaXN0IG9mIHByb3BlcnR5IG5hbWVzLCBvciB0aGUgb2JqZWN0XG4gICAgICAgIC8vIGl0c2VsZi5cbiAgICAgICAgZm9yRWFjaChwcm9wZXJ0aWVzIHx8IHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICB2YXIgZWxlbWVudCA9IHNlcmlhbGl6ZShwcm9wZXJ0eSwgdmFsdWUsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBpbmRlbnRhdGlvbiwgc3RhY2spO1xuICAgICAgICAgIGlmIChlbGVtZW50ICE9PSB1bmRlZikge1xuICAgICAgICAgICAgLy8gQWNjb3JkaW5nIHRvIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjM6IFwiSWYgYGdhcGAge3doaXRlc3BhY2V9XG4gICAgICAgICAgICAvLyBpcyBub3QgdGhlIGVtcHR5IHN0cmluZywgbGV0IGBtZW1iZXJgIHtxdW90ZShwcm9wZXJ0eSkgKyBcIjpcIn1cbiAgICAgICAgICAgIC8vIGJlIHRoZSBjb25jYXRlbmF0aW9uIG9mIGBtZW1iZXJgIGFuZCB0aGUgYHNwYWNlYCBjaGFyYWN0ZXIuXCJcbiAgICAgICAgICAgIC8vIFRoZSBcImBzcGFjZWAgY2hhcmFjdGVyXCIgcmVmZXJzIHRvIHRoZSBsaXRlcmFsIHNwYWNlXG4gICAgICAgICAgICAvLyBjaGFyYWN0ZXIsIG5vdCB0aGUgYHNwYWNlYCB7d2lkdGh9IGFyZ3VtZW50IHByb3ZpZGVkIHRvXG4gICAgICAgICAgICAvLyBgSlNPTi5zdHJpbmdpZnlgLlxuICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHF1b3RlKGNoYXJJbmRleEJ1Z2d5ID8gcHJvcGVydHkuc3BsaXQoXCJcIikgOiBwcm9wZXJ0eSkgKyBcIjpcIiArICh3aGl0ZXNwYWNlID8gXCIgXCIgOiBcIlwiKSArIGVsZW1lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhbnkgfHwgKGFueSA9IHRydWUpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzdWx0ID0gYW55ID8gKHdoaXRlc3BhY2UgPyBcIntcXG5cIiArIGluZGVudGF0aW9uICsgcmVzdWx0cy5qb2luKFwiLFxcblwiICsgaW5kZW50YXRpb24pICsgXCJcXG5cIiArIHByZWZpeCArIFwifVwiIDogKFwie1wiICsgcmVzdWx0cy5qb2luKFwiLFwiKSArIFwifVwiKSkgOiBcInt9XCI7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfTtcblxuICAvLyBQdWJsaWM6IGBLYW1pbm8uc3RyaW5naWZ5YC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMuXG4gIEthbWluby5zdHJpbmdpZnkgPSBmdW5jdGlvbiAoc291cmNlLCBmaWx0ZXIsIHdpZHRoKSB7XG4gICAgdmFyIHdoaXRlc3BhY2UsIGNhbGxiYWNrLCBwcm9wZXJ0aWVzO1xuICAgIGlmICh0eXBlb2YgZmlsdGVyID09IFwiZnVuY3Rpb25cIiB8fCB0eXBlb2YgZmlsdGVyID09IFwib2JqZWN0XCIgJiYgZmlsdGVyKSB7XG4gICAgICBpZiAoZ2V0Q2xhc3MuY2FsbChmaWx0ZXIpID09IFwiW29iamVjdCBGdW5jdGlvbl1cIikge1xuICAgICAgICBjYWxsYmFjayA9IGZpbHRlcjtcbiAgICAgIH0gZWxzZSBpZiAoZ2V0Q2xhc3MuY2FsbChmaWx0ZXIpID09IFwiW29iamVjdCBBcnJheV1cIikge1xuICAgICAgICAvLyBDb252ZXJ0IHRoZSBwcm9wZXJ0eSBuYW1lcyBhcnJheSBpbnRvIGEgbWFrZXNoaWZ0IHNldC5cbiAgICAgICAgcHJvcGVydGllcyA9IHt9O1xuICAgICAgICBmb3IgKHZhciBpbmRleCA9IDAsIGxlbmd0aCA9IGZpbHRlci5sZW5ndGgsIHZhbHVlOyBpbmRleCA8IGxlbmd0aDsgdmFsdWUgPSBmaWx0ZXJbaW5kZXgrK10sICgoZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkgPT0gXCJbb2JqZWN0IFN0cmluZ11cIiB8fCBnZXRDbGFzcy5jYWxsKHZhbHVlKSA9PSBcIltvYmplY3QgTnVtYmVyXVwiKSAmJiAocHJvcGVydGllc1t2YWx1ZV0gPSAxKSkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAod2lkdGgpIHtcbiAgICAgIGlmIChnZXRDbGFzcy5jYWxsKHdpZHRoKSA9PSBcIltvYmplY3QgTnVtYmVyXVwiKSB7XG4gICAgICAgIC8vIENvbnZlcnQgdGhlIGB3aWR0aGAgdG8gYW4gaW50ZWdlciBhbmQgY3JlYXRlIGEgc3RyaW5nIGNvbnRhaW5pbmdcbiAgICAgICAgLy8gYHdpZHRoYCBudW1iZXIgb2Ygc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgaWYgKCh3aWR0aCAtPSB3aWR0aCAlIDEpID4gMCkge1xuICAgICAgICAgIGZvciAod2hpdGVzcGFjZSA9IFwiXCIsIHdpZHRoID4gMTAgJiYgKHdpZHRoID0gMTApOyB3aGl0ZXNwYWNlLmxlbmd0aCA8IHdpZHRoOyB3aGl0ZXNwYWNlICs9IFwiIFwiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChnZXRDbGFzcy5jYWxsKHdpZHRoKSA9PSBcIltvYmplY3QgU3RyaW5nXVwiKSB7XG4gICAgICAgIHdoaXRlc3BhY2UgPSB3aWR0aC5sZW5ndGggPD0gMTAgPyB3aWR0aCA6IHdpZHRoLnNsaWNlKDAsIDEwKTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gT3BlcmEgPD0gNy41NHUyIGRpc2NhcmRzIHRoZSB2YWx1ZXMgYXNzb2NpYXRlZCB3aXRoIGVtcHR5IHN0cmluZyBrZXlzXG4gICAgLy8gKGBcIlwiYCkgb25seSBpZiB0aGV5IGFyZSB1c2VkIGRpcmVjdGx5IHdpdGhpbiBhbiBvYmplY3QgbWVtYmVyIGxpc3RcbiAgICAvLyAoZS5nLiwgYCEoXCJcIiBpbiB7IFwiXCI6IDF9KWApLlxuICAgIHJldHVybiBzZXJpYWxpemUoXCJcIiwgKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gc291cmNlLCB2YWx1ZSksIGNhbGxiYWNrLCBwcm9wZXJ0aWVzLCB3aGl0ZXNwYWNlLCBcIlwiLCBbXSk7XG4gIH07XG5cbiAgLy8gUHVibGljOiBQYXJzZXMgYSBzb3VyY2Ugc3RyaW5nLlxuICB2YXIgZnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcblxuICAvLyBJbnRlcm5hbDogQSBtYXAgb2YgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMgYW5kIHRoZWlyIHVuZXNjYXBlZFxuICAvLyBlcXVpdmFsZW50cy5cbiAgdmFyIFVuZXNjYXBlcyA9IHtcbiAgICBcIlxcXFxcIjogXCJcXFxcXCIsXG4gICAgJ1wiJzogJ1wiJyxcbiAgICBcIi9cIjogXCIvXCIsXG4gICAgXCJiXCI6IFwiXFxiXCIsXG4gICAgXCJ0XCI6IFwiXFx0XCIsXG4gICAgXCJuXCI6IFwiXFxuXCIsXG4gICAgXCJmXCI6IFwiXFxmXCIsXG4gICAgXCJyXCI6IFwiXFxyXCJcbiAgfTtcblxuICAvLyBJbnRlcm5hbDogU3RvcmVzIHRoZSBwYXJzZXIgc3RhdGUuXG4gIHZhciBJbmRleCwgU291cmNlLCBzdGFjaztcblxuICAvLyBJbnRlcm5hbDogUmVzZXRzIHRoZSBwYXJzZXIgc3RhdGUgYW5kIHRocm93cyBhIGBTeW50YXhFcnJvcmAuXG4gIHZhciBhYm9ydCA9IGZ1bmN0aW9uKCkge1xuICAgIEluZGV4ID0gU291cmNlID0gbnVsbDtcbiAgICB0aHJvdyBTeW50YXhFcnJvcigpO1xuICB9O1xuXG4gIHZhciBwYXJzZVN0cmluZyA9IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgIHByZWZpeCA9IHByZWZpeCB8fCBcIlwiO1xuICAgIHZhciBzb3VyY2UgPSBTb3VyY2UsIGxlbmd0aCA9IHNvdXJjZS5sZW5ndGgsIHZhbHVlLCBzeW1ib2wsIGJlZ2luLCBwb3NpdGlvbjtcbiAgICAvLyBBZHZhbmNlIHRvIHRoZSBuZXh0IGNoYXJhY3RlciBhbmQgcGFyc2UgYSBLYW1pbm8gc3RyaW5nIGF0IHRoZVxuICAgIC8vIGN1cnJlbnQgcG9zaXRpb24uIFN0cmluZyB0b2tlbnMgYXJlIHByZWZpeGVkIHdpdGggdGhlIHNlbnRpbmVsXG4gICAgLy8gYEBgIGNoYXJhY3RlciB0byBkaXN0aW5ndWlzaCB0aGVtIGZyb20gcHVuY3R1YXRvcnMuXG4gICAgZm9yICh2YWx1ZSA9IHByZWZpeCwgSW5kZXgrKzsgSW5kZXggPCBsZW5ndGg7KSB7XG4gICAgICBzeW1ib2wgPSBzb3VyY2VbSW5kZXhdO1xuICAgICAgaWYgKHN5bWJvbCA8IFwiIFwiKSB7XG4gICAgICAgIC8vIFVuZXNjYXBlZCBBU0NJSSBjb250cm9sIGNoYXJhY3RlcnMgYXJlIG5vdCBwZXJtaXR0ZWQuXG4gICAgICAgIGFib3J0KCk7XG4gICAgICB9IGVsc2UgaWYgKHN5bWJvbCA9PSBcIlxcXFxcIikge1xuICAgICAgICAvLyBQYXJzZSBlc2NhcGVkIEthbWlubyBjb250cm9sIGNoYXJhY3RlcnMsIGBcImAsIGBcXGAsIGAvYCwgYW5kXG4gICAgICAgIC8vIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlcy5cbiAgICAgICAgc3ltYm9sID0gc291cmNlWysrSW5kZXhdO1xuICAgICAgICBpZiAoJ1xcXFxcIi9idG5mcicuaW5kZXhPZihzeW1ib2wpID4gLTEpIHtcbiAgICAgICAgICAvLyBSZXZpdmUgZXNjYXBlZCBjb250cm9sIGNoYXJhY3RlcnMuXG4gICAgICAgICAgdmFsdWUgKz0gVW5lc2NhcGVzW3N5bWJvbF07XG4gICAgICAgICAgSW5kZXgrKztcbiAgICAgICAgfSBlbHNlIGlmIChzeW1ib2wgPT0gXCJ1XCIpIHtcbiAgICAgICAgICAvLyBBZHZhbmNlIHRvIHRoZSBmaXJzdCBjaGFyYWN0ZXIgb2YgdGhlIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICBiZWdpbiA9ICsrSW5kZXg7XG4gICAgICAgICAgLy8gVmFsaWRhdGUgdGhlIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleCArIDQ7IEluZGV4IDwgcG9zaXRpb247IEluZGV4KyspIHtcbiAgICAgICAgICAgIHN5bWJvbCA9IHNvdXJjZVtJbmRleF07XG4gICAgICAgICAgICAvLyBBIHZhbGlkIHNlcXVlbmNlIGNvbXByaXNlcyBmb3VyIGhleGRpZ2l0cyB0aGF0IGZvcm0gYVxuICAgICAgICAgICAgLy8gc2luZ2xlIGhleGFkZWNpbWFsIHZhbHVlLlxuICAgICAgICAgICAgaWYgKCEoc3ltYm9sID49IFwiMFwiICYmIHN5bWJvbCA8PSBcIjlcIiB8fCBzeW1ib2wgPj0gXCJhXCIgJiYgc3ltYm9sIDw9IFwiZlwiIHx8IHN5bWJvbCA+PSBcIkFcIiAmJiBzeW1ib2wgPD0gXCJGXCIpKSB7XG4gICAgICAgICAgICAgIC8vIEludmFsaWQgVW5pY29kZSBlc2NhcGUgc2VxdWVuY2UuXG4gICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFJldml2ZSB0aGUgZXNjYXBlZCBjaGFyYWN0ZXIuXG4gICAgICAgICAgdmFsdWUgKz0gZnJvbUNoYXJDb2RlKFwiMHhcIiArIHNvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBJbnZhbGlkIGVzY2FwZSBzZXF1ZW5jZS5cbiAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc3ltYm9sID09ICdcIicpIHtcbiAgICAgICAgICAvLyBBbiB1bmVzY2FwZWQgZG91YmxlLXF1b3RlIGNoYXJhY3RlciBtYXJrcyB0aGUgZW5kIG9mIHRoZVxuICAgICAgICAgIC8vIHN0cmluZy5cbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICAvLyBBcHBlbmQgdGhlIG9yaWdpbmFsIGNoYXJhY3RlciBhcy1pcy5cbiAgICAgICAgdmFsdWUgKz0gc3ltYm9sO1xuICAgICAgICBJbmRleCsrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoc291cmNlW0luZGV4XSA9PSAnXCInKSB7XG4gICAgICBJbmRleCsrO1xuICAgICAgLy8gUmV0dXJuIHRoZSByZXZpdmVkIHN0cmluZy5cbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgLy8gVW50ZXJtaW5hdGVkIHN0cmluZy5cbiAgICBhYm9ydCgpO1xuICB9O1xuXG4gIC8vIEludGVybmFsOiBSZXR1cm5zIHRoZSBuZXh0IHRva2VuLCBvciBgXCIkXCJgIGlmIHRoZSBwYXJzZXIgaGFzIHJlYWNoZWRcbiAgLy8gdGhlIGVuZCBvZiB0aGUgc291cmNlIHN0cmluZy4gQSB0b2tlbiBtYXkgYmUgYSBzdHJpbmcsIG51bWJlciwgYG51bGxgXG4gIC8vIGxpdGVyYWwsIGBOYU5gIGxpdGVyYWwgb3IgQm9vbGVhbiBsaXRlcmFsLlxuICB2YXIgbGV4ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzb3VyY2UgPSBTb3VyY2UsIGxlbmd0aCA9IHNvdXJjZS5sZW5ndGgsIHN5bWJvbCwgdmFsdWUsIGJlZ2luLCBwb3NpdGlvbiwgc2lnbixcbiAgICAgICAgZGF0ZVN0cmluZywgcmVnRXhwU291cmNlLCByZWdFeHBNb2RpZmllcnM7XG4gICAgd2hpbGUgKEluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICBzeW1ib2wgPSBzb3VyY2VbSW5kZXhdO1xuICAgICAgaWYgKFwiXFx0XFxyXFxuIFwiLmluZGV4T2Yoc3ltYm9sKSA+IC0xKSB7XG4gICAgICAgIC8vIFNraXAgd2hpdGVzcGFjZSB0b2tlbnMsIGluY2x1ZGluZyB0YWJzLCBjYXJyaWFnZSByZXR1cm5zLCBsaW5lXG4gICAgICAgIC8vIGZlZWRzLCBhbmQgc3BhY2UgY2hhcmFjdGVycy5cbiAgICAgICAgSW5kZXgrKztcbiAgICAgIH0gZWxzZSBpZiAoXCJ7fVtdOixcIi5pbmRleE9mKHN5bWJvbCkgPiAtMSkge1xuICAgICAgICAvLyBQYXJzZSBhIHB1bmN0dWF0b3IgdG9rZW4gYXQgdGhlIGN1cnJlbnQgcG9zaXRpb24uXG4gICAgICAgIEluZGV4Kys7XG4gICAgICAgIHJldHVybiBzeW1ib2w7XG4gICAgICB9IGVsc2UgaWYgKHN5bWJvbCA9PSAnXCInKSB7XG4gICAgICAgIC8vIFBhcnNlIHN0cmluZ3MuXG4gICAgICAgIHJldHVybiBwYXJzZVN0cmluZyhcIkBcIik7XG4gICAgICB9IGVsc2UgaWYgKHN5bWJvbCA9PSAnJScpIHtcbiAgICAgICAgLy8gUGFyc2UgZGF0ZXMuXG4gICAgICAgIEluZGV4Kys7XG4gICAgICAgIHN5bWJvbCA9IHNvdXJjZVtJbmRleF07XG4gICAgICAgIGlmKHN5bWJvbCA9PSAnXCInKSB7XG4gICAgICAgICAgZGF0ZVN0cmluZyA9IHBhcnNlU3RyaW5nKCk7XG4gICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCBkYXRlU3RyaW5nICk7XG4gICAgICAgIH1cbiAgICAgICAgYWJvcnQoKTtcbiAgICAgIH0gZWxzZSBpZiAoc3ltYm9sID09ICdeJykge1xuICAgICAgICAvLyBQYXJzZSByZWd1bGFyIGV4cHJlc3Npb25zLlxuICAgICAgICBJbmRleCsrO1xuICAgICAgICBzeW1ib2wgPSBzb3VyY2VbSW5kZXhdO1xuICAgICAgICBpZihzeW1ib2wgPT0gJ1wiJykge1xuICAgICAgICAgIHJlZ0V4cFNvdXJjZSA9IHBhcnNlU3RyaW5nKCk7XG5cbiAgICAgICAgICBzeW1ib2wgPSBzb3VyY2VbSW5kZXhdO1xuICAgICAgICAgIGlmKHN5bWJvbCA9PSAnXCInKSB7XG4gICAgICAgICAgICByZWdFeHBNb2RpZmllcnMgPSBwYXJzZVN0cmluZygpO1xuXG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlZ0V4cCggcmVnRXhwU291cmNlLCByZWdFeHBNb2RpZmllcnMgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgYWJvcnQoKTtcbiAgICAgIH0gZWxzZSBpZiAoc3ltYm9sID09ICcmJykge1xuICAgICAgICAvLyBQYXJzZSBvYmplY3QgcmVmZXJlbmNlcy5cbiAgICAgICAgSW5kZXgrKztcbiAgICAgICAgc3ltYm9sID0gc291cmNlW0luZGV4XTtcbiAgICAgICAgaWYgKHN5bWJvbCA+PSBcIjBcIiAmJiBzeW1ib2wgPD0gXCI5XCIpIHtcbiAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgIHJldHVybiBzdGFja1tzeW1ib2xdO1xuICAgICAgICB9XG4gICAgICAgIGFib3J0KCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBQYXJzZSBudW1iZXJzIGFuZCBsaXRlcmFscy5cbiAgICAgICAgYmVnaW4gPSBJbmRleDtcbiAgICAgICAgLy8gQWR2YW5jZSB0aGUgc2Nhbm5lcidzIHBvc2l0aW9uIHBhc3QgdGhlIHNpZ24sIGlmIG9uZSBpc1xuICAgICAgICAvLyBzcGVjaWZpZWQuXG4gICAgICAgIGlmIChzeW1ib2wgPT0gXCItXCIpIHtcbiAgICAgICAgICBzaWduID0gdHJ1ZTtcbiAgICAgICAgICBzeW1ib2wgPSBzb3VyY2VbKytJbmRleF07XG4gICAgICAgIH1cbiAgICAgICAgLy8gUGFyc2UgYW4gaW50ZWdlciBvciBmbG9hdGluZy1wb2ludCB2YWx1ZS5cbiAgICAgICAgaWYgKHN5bWJvbCA+PSBcIjBcIiAmJiBzeW1ib2wgPD0gXCI5XCIpIHtcbiAgICAgICAgICAvLyBMZWFkaW5nIHplcm9lcyBhcmUgaW50ZXJwcmV0ZWQgYXMgb2N0YWwgbGl0ZXJhbHMuXG4gICAgICAgICAgaWYgKHN5bWJvbCA9PSBcIjBcIiAmJiAoc3ltYm9sID0gc291cmNlW0luZGV4ICsgMV0sIHN5bWJvbCA+PSBcIjBcIiAmJiBzeW1ib2wgPD0gXCI5XCIpKSB7XG4gICAgICAgICAgICAvLyBJbGxlZ2FsIG9jdGFsIGxpdGVyYWwuXG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzaWduID0gZmFsc2U7XG4gICAgICAgICAgLy8gUGFyc2UgdGhlIGludGVnZXIgY29tcG9uZW50LlxuICAgICAgICAgIGZvciAoOyBJbmRleCA8IGxlbmd0aCAmJiAoc3ltYm9sID0gc291cmNlW0luZGV4XSwgc3ltYm9sID49IFwiMFwiICYmIHN5bWJvbCA8PSBcIjlcIik7IEluZGV4KyspO1xuICAgICAgICAgIC8vIEZsb2F0cyBjYW5ub3QgY29udGFpbiBhIGxlYWRpbmcgZGVjaW1hbCBwb2ludDsgaG93ZXZlciwgdGhpc1xuICAgICAgICAgIC8vIGNhc2UgaXMgYWxyZWFkeSBhY2NvdW50ZWQgZm9yIGJ5IHRoZSBwYXJzZXIuXG4gICAgICAgICAgaWYgKHNvdXJjZVtJbmRleF0gPT0gXCIuXCIpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uID0gKytJbmRleDtcbiAgICAgICAgICAgIC8vIFBhcnNlIHRoZSBkZWNpbWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgIGZvciAoOyBwb3NpdGlvbiA8IGxlbmd0aCAmJiAoc3ltYm9sID0gc291cmNlW3Bvc2l0aW9uXSwgc3ltYm9sID49IFwiMFwiICYmIHN5bWJvbCA8PSBcIjlcIik7IHBvc2l0aW9uKyspO1xuICAgICAgICAgICAgaWYgKHBvc2l0aW9uID09IEluZGV4KSB7XG4gICAgICAgICAgICAgIC8vIElsbGVnYWwgdHJhaWxpbmcgZGVjaW1hbC5cbiAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIEluZGV4ID0gcG9zaXRpb247XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIFBhcnNlIGV4cG9uZW50cy5cbiAgICAgICAgICBzeW1ib2wgPSBzb3VyY2VbSW5kZXhdO1xuICAgICAgICAgIGlmIChzeW1ib2wgPT0gXCJlXCIgfHwgc3ltYm9sID09IFwiRVwiKSB7XG4gICAgICAgICAgICAvLyBTa2lwIHBhc3QgdGhlIHNpZ24gZm9sbG93aW5nIHRoZSBleHBvbmVudCwgaWYgb25lIGlzXG4gICAgICAgICAgICAvLyBzcGVjaWZpZWQuXG4gICAgICAgICAgICBzeW1ib2wgPSBzb3VyY2VbKytJbmRleF07XG4gICAgICAgICAgICBpZiAoc3ltYm9sID09IFwiK1wiIHx8IHN5bWJvbCA9PSBcIi1cIikge1xuICAgICAgICAgICAgICBJbmRleCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUGFyc2UgdGhlIGV4cG9uZW50aWFsIGNvbXBvbmVudC5cbiAgICAgICAgICAgIGZvciAocG9zaXRpb24gPSBJbmRleDsgcG9zaXRpb24gPCBsZW5ndGggJiYgKHN5bWJvbCA9IHNvdXJjZVtwb3NpdGlvbl0sIHN5bWJvbCA+PSBcIjBcIiAmJiBzeW1ib2wgPD0gXCI5XCIpOyBwb3NpdGlvbisrKTtcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbiA9PSBJbmRleCkge1xuICAgICAgICAgICAgICAvLyBJbGxlZ2FsIGVtcHR5IGV4cG9uZW50LlxuICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgSW5kZXggPSBwb3NpdGlvbjtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQ29lcmNlIHRoZSBwYXJzZWQgdmFsdWUgdG8gYSBKYXZhU2NyaXB0IG51bWJlci5cbiAgICAgICAgICByZXR1cm4gK3NvdXJjZS5zbGljZShiZWdpbiwgSW5kZXgpO1xuICAgICAgICB9XG4gICAgICAgIC8vIEEgbmVnYXRpdmUgc2lnbiBtYXkgb25seSBwcmVjZWRlIG51bWJlcnMuXG4gICAgICAgIGlmIChzaWduKSB7XG4gICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBgdHJ1ZWAsIGBmYWxzZWAsIGBJbmZpbml0eWAsIGAtSW5maW5pdHlgLCBgTmFOYCBhbmQgYG51bGxgIGxpdGVyYWxzLlxuICAgICAgICBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDQpID09IFwidHJ1ZVwiKSB7XG4gICAgICAgICAgSW5kZXggKz0gNDtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIGlmIChzb3VyY2Uuc2xpY2UoSW5kZXgsIEluZGV4ICsgNSkgPT0gXCJmYWxzZVwiKSB7XG4gICAgICAgICAgSW5kZXggKz0gNTtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoc291cmNlLnNsaWNlKEluZGV4LCBJbmRleCArIDgpID09IFwiSW5maW5pdHlcIikge1xuICAgICAgICAgIEluZGV4ICs9IDg7XG4gICAgICAgICAgcmV0dXJuIEluZmluaXR5O1xuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA5KSA9PSBcIk5JbmZpbml0eVwiKSB7XG4gICAgICAgICAgSW5kZXggKz0gOTtcbiAgICAgICAgICByZXR1cm4gLUluZmluaXR5O1xuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyAzKSA9PSBcIk5hTlwiKSB7XG4gICAgICAgICAgSW5kZXggKz0gMztcbiAgICAgICAgICByZXR1cm4gTmFOO1xuICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZS5zbGljZShJbmRleCwgSW5kZXggKyA0KSA9PSBcIm51bGxcIikge1xuICAgICAgICAgIEluZGV4ICs9IDQ7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVW5yZWNvZ25pemVkIHRva2VuLlxuICAgICAgICBhYm9ydCgpO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZXR1cm4gdGhlIHNlbnRpbmVsIGAkYCBjaGFyYWN0ZXIgaWYgdGhlIHBhcnNlciBoYXMgcmVhY2hlZCB0aGUgZW5kXG4gICAgLy8gb2YgdGhlIHNvdXJjZSBzdHJpbmcuXG4gICAgcmV0dXJuIFwiJFwiO1xuICB9O1xuXG4gIC8vIEludGVybmFsOiBQYXJzZXMgYSBLYW1pbm8gYHZhbHVlYCB0b2tlbi5cbiAgdmFyIGdldCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHZhciByZXN1bHRzLCBhbnksIGtleTtcbiAgICBpZiAodmFsdWUgPT0gXCIkXCIpIHtcbiAgICAgIC8vIFVuZXhwZWN0ZWQgZW5kIG9mIGlucHV0LlxuICAgICAgYWJvcnQoKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcInN0cmluZ1wiKSB7XG4gICAgICBpZiAodmFsdWVbMF0gPT0gXCJAXCIpIHtcbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBzZW50aW5lbCBgQGAgY2hhcmFjdGVyLlxuICAgICAgICByZXR1cm4gdmFsdWUuc2xpY2UoMSk7XG4gICAgICB9XG4gICAgICAvLyBQYXJzZSBvYmplY3QgYW5kIGFycmF5IGxpdGVyYWxzLlxuICAgICAgaWYgKHZhbHVlID09IFwiW1wiKSB7XG4gICAgICAgIC8vIFBhcnNlcyBhIEthbWlubyBhcnJheSwgcmV0dXJuaW5nIGEgbmV3IEphdmFTY3JpcHQgYXJyYXkuXG4gICAgICAgIHJlc3VsdHMgPSBbXTtcbiAgICAgICAgc3RhY2tbc3RhY2subGVuZ3RoXSA9IHJlc3VsdHM7XG4gICAgICAgIGZvciAoOzsgYW55IHx8IChhbnkgPSB0cnVlKSkge1xuICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgLy8gQSBjbG9zaW5nIHNxdWFyZSBicmFja2V0IG1hcmtzIHRoZSBlbmQgb2YgdGhlIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgaWYgKHZhbHVlID09IFwiXVwiKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSWYgdGhlIGFycmF5IGxpdGVyYWwgY29udGFpbnMgZWxlbWVudHMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdGluZyB0aGUgcHJldmlvdXMgZWxlbWVudCBmcm9tIHRoZVxuICAgICAgICAgIC8vIG5leHQuXG4gICAgICAgICAgaWYgKGFueSkge1xuICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiKSB7XG4gICAgICAgICAgICAgIHZhbHVlID0gbGV4KCk7XG4gICAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIl1cIikge1xuICAgICAgICAgICAgICAgIC8vIFVuZXhwZWN0ZWQgdHJhaWxpbmcgYCxgIGluIGFycmF5IGxpdGVyYWwuXG4gICAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gQSBgLGAgbXVzdCBzZXBhcmF0ZSBlYWNoIGFycmF5IGVsZW1lbnQuXG4gICAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIEVsaXNpb25zIGFuZCBsZWFkaW5nIGNvbW1hcyBhcmUgbm90IHBlcm1pdHRlZC5cbiAgICAgICAgICBpZiAodmFsdWUgPT0gXCIsXCIpIHtcbiAgICAgICAgICAgIGFib3J0KCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdHMucHVzaChnZXQodHlwZW9mIHZhbHVlID09IFwic3RyaW5nXCIgJiYgY2hhckluZGV4QnVnZ3kgPyB2YWx1ZS5zcGxpdChcIlwiKSA6IHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgICB9IGVsc2UgaWYgKHZhbHVlID09IFwie1wiKSB7XG4gICAgICAgIC8vIFBhcnNlcyBhIEthbWlubyBvYmplY3QsIHJldHVybmluZyBhIG5ldyBKYXZhU2NyaXB0IG9iamVjdC5cbiAgICAgICAgcmVzdWx0cyA9IHt9O1xuICAgICAgICBzdGFja1tzdGFjay5sZW5ndGhdID0gcmVzdWx0cztcbiAgICAgICAgZm9yICg7OyBhbnkgfHwgKGFueSA9IHRydWUpKSB7XG4gICAgICAgICAgdmFsdWUgPSBsZXgoKTtcbiAgICAgICAgICAvLyBBIGNsb3NpbmcgY3VybHkgYnJhY2UgbWFya3MgdGhlIGVuZCBvZiB0aGUgb2JqZWN0IGxpdGVyYWwuXG4gICAgICAgICAgaWYgKHZhbHVlID09IFwifVwiKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gSWYgdGhlIG9iamVjdCBsaXRlcmFsIGNvbnRhaW5zIG1lbWJlcnMsIHRoZSBjdXJyZW50IHRva2VuXG4gICAgICAgICAgLy8gc2hvdWxkIGJlIGEgY29tbWEgc2VwYXJhdG9yLlxuICAgICAgICAgIGlmIChhbnkpIHtcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PSBcIixcIikge1xuICAgICAgICAgICAgICB2YWx1ZSA9IGxleCgpO1xuICAgICAgICAgICAgICBpZiAodmFsdWUgPT0gXCJ9XCIpIHtcbiAgICAgICAgICAgICAgICAvLyBVbmV4cGVjdGVkIHRyYWlsaW5nIGAsYCBpbiBvYmplY3QgbGl0ZXJhbC5cbiAgICAgICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBBIGAsYCBtdXN0IHNlcGFyYXRlIGVhY2ggb2JqZWN0IG1lbWJlci5cbiAgICAgICAgICAgICAgYWJvcnQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gTGVhZGluZyBjb21tYXMgYXJlIG5vdCBwZXJtaXR0ZWQsIG9iamVjdCBwcm9wZXJ0eSBuYW1lcyBtdXN0IGJlXG4gICAgICAgICAgLy8gZG91YmxlLXF1b3RlZCBzdHJpbmdzLCBhbmQgYSBgOmAgbXVzdCBzZXBhcmF0ZSBlYWNoIHByb3BlcnR5XG4gICAgICAgICAgLy8gbmFtZSBhbmQgdmFsdWUuXG4gICAgICAgICAgaWYgKHZhbHVlID09IFwiLFwiIHx8IHR5cGVvZiB2YWx1ZSAhPSBcInN0cmluZ1wiIHx8IHZhbHVlWzBdICE9IFwiQFwiIHx8IGxleCgpICE9IFwiOlwiKSB7XG4gICAgICAgICAgICBhYm9ydCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB2YXIgcmVzdWx0ID0gbGV4KCk7XG4gICAgICAgICAgcmVzdWx0c1t2YWx1ZS5zbGljZSgxKV0gPSBnZXQodHlwZW9mIHJlc3VsdCA9PSBcInN0cmluZ1wiICYmIGNoYXJJbmRleEJ1Z2d5ID8gcmVzdWx0LnNwbGl0KFwiXCIpIDogcmVzdWx0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0cztcbiAgICAgIH1cbiAgICAgIC8vIFVuZXhwZWN0ZWQgdG9rZW4gZW5jb3VudGVyZWQuXG4gICAgICBhYm9ydCgpO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWw6IFVwZGF0ZXMgYSB0cmF2ZXJzZWQgb2JqZWN0IG1lbWJlci5cbiAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKSB7XG4gICAgdmFyIGVsZW1lbnQgPSB3YWxrKHNvdXJjZSwgcHJvcGVydHksIGNhbGxiYWNrKTtcbiAgICBpZiAoZWxlbWVudCA9PT0gdW5kZWYpIHtcbiAgICAgIGRlbGV0ZSBzb3VyY2VbcHJvcGVydHldO1xuICAgIH0gZWxzZSB7XG4gICAgICBzb3VyY2VbcHJvcGVydHldID0gZWxlbWVudDtcbiAgICB9XG4gIH07XG5cbiAgLy8gSW50ZXJuYWw6IFJlY3Vyc2l2ZWx5IHRyYXZlcnNlcyBhIHBhcnNlZCBLYW1pbm8gb2JqZWN0LCBpbnZva2luZyB0aGVcbiAgLy8gYGNhbGxiYWNrYCBmdW5jdGlvbiBmb3IgZWFjaCB2YWx1ZS4gVGhpcyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGVcbiAgLy8gYFdhbGsoaG9sZGVyLCBuYW1lKWAgb3BlcmF0aW9uIGRlZmluZWQgaW4gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMi5cbiAgdmFyIHdhbGsgPSBmdW5jdGlvbiAoc291cmNlLCBwcm9wZXJ0eSwgY2FsbGJhY2spIHtcbiAgICB2YXIgdmFsdWUgPSBzb3VyY2VbcHJvcGVydHldLCBsZW5ndGg7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PSBcIm9iamVjdFwiICYmIHZhbHVlKSB7XG4gICAgICBpZiAoZ2V0Q2xhc3MuY2FsbCh2YWx1ZSkgPT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgICAgIGZvciAobGVuZ3RoID0gdmFsdWUubGVuZ3RoOyBsZW5ndGgtLTspIHtcbiAgICAgICAgICB1cGRhdGUodmFsdWUsIGxlbmd0aCwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBgZm9yRWFjaGAgY2FuJ3QgYmUgdXNlZCB0byB0cmF2ZXJzZSBhbiBhcnJheSBpbiBPcGVyYSA8PSA4LjU0LFxuICAgICAgICAvLyBhcyBgT2JqZWN0I2hhc093blByb3BlcnR5YCByZXR1cm5zIGBmYWxzZWAgZm9yIGFycmF5IGluZGljZXNcbiAgICAgICAgLy8gKGUuZy4sIGAhWzEsIDIsIDNdLmhhc093blByb3BlcnR5KFwiMFwiKWApLlxuICAgICAgICBmb3JFYWNoKHZhbHVlLCBmdW5jdGlvbiAocHJvcGVydHkpIHtcbiAgICAgICAgICB1cGRhdGUodmFsdWUsIHByb3BlcnR5LCBjYWxsYmFjayk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2FsbGJhY2suY2FsbChzb3VyY2UsIHByb3BlcnR5LCB2YWx1ZSk7XG4gIH07XG5cbiAgLy8gUHVibGljOiBgS2FtaW5vLnBhcnNlYC4gU2VlIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjIuXG4gIEthbWluby5wYXJzZSA9IGZ1bmN0aW9uIChzb3VyY2UsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHJlc3VsdCwgdmFsdWU7XG4gICAgSW5kZXggPSAwO1xuICAgIFNvdXJjZSA9IFwiXCIgKyBzb3VyY2U7XG4gICAgc3RhY2sgPSBbXTtcbiAgICBpZiAoY2hhckluZGV4QnVnZ3kpIHtcbiAgICAgIFNvdXJjZSA9IHNvdXJjZS5zcGxpdChcIlwiKTtcbiAgICB9XG4gICAgcmVzdWx0ID0gZ2V0KGxleCgpKTtcbiAgICAvLyBJZiBhIEthbWlubyBzdHJpbmcgY29udGFpbnMgbXVsdGlwbGUgdG9rZW5zLCBpdCBpcyBpbnZhbGlkLlxuICAgIGlmIChsZXgoKSAhPSBcIiRcIikge1xuICAgICAgYWJvcnQoKTtcbiAgICB9XG4gICAgLy8gUmVzZXQgdGhlIHBhcnNlciBzdGF0ZS5cbiAgICBJbmRleCA9IFNvdXJjZSA9IG51bGw7XG4gICAgcmV0dXJuIGNhbGxiYWNrICYmIGdldENsYXNzLmNhbGwoY2FsbGJhY2spID09IFwiW29iamVjdCBGdW5jdGlvbl1cIiA/IHdhbGsoKHZhbHVlID0ge30sIHZhbHVlW1wiXCJdID0gcmVzdWx0LCB2YWx1ZSksIFwiXCIsIGNhbGxiYWNrKSA6IHJlc3VsdDtcbiAgfTtcblxuICBLYW1pbm8uY2xvbmUgPSBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICByZXR1cm4gS2FtaW5vLnBhcnNlKCBLYW1pbm8uc3RyaW5naWZ5KHNvdXJjZSkgKTtcbiAgfTtcbn0pKHRoaXMpO1xuIiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIGNzcyAgICAgPSByZXF1aXJlKCdjc3MtY29tcG9uZW50Jyk7XG52YXIgZWFjaCAgICA9IHJlcXVpcmUoJ2ZvcmVhY2gnKTtcbnZhciBLYW1pbm8gID0gcmVxdWlyZSgna2FtaW5vJyk7XG52YXIgX19zbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcblxuLy8gU2V0IHRoZSBsb2NhdGlvbiB0byBsb2FkIHRoZSBub3RlYm9vayBmcm9tXG52YXIgTk9URUJPT0tfVVJMID0ge1widXJsXCI6XCJodHRwczovL211bGVzb2Z0LmdpdGh1Yi5pby9hcGktbm90ZWJvb2svXCIsXCJ0aXRsZVwiOlwiQVBJIE5vdGVib29rXCIsXCJvYXV0aENhbGxiYWNrXCI6XCIvYXV0aGVudGljYXRlL29hdXRoLmh0bWxcIn0udXJsO1xuXG4vKipcbiAqIEV4dGVuZCBhbnkgb2JqZWN0IHdpdGggdGhlIHByb3BlcnRpZXMgZnJvbSBvdGhlciBvYmplY3RzLCBvdmVycmlkaW5nIG9mIGxlZnRcbiAqIHRvIHJpZ2h0LlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gb2JqIFJvb3Qgb2JqZWN0IHRvIGNvcHkgcHJvcGVydGllcyB0by5cbiAqIEBwYXJhbSAge09iamVjdH0gLi4uIEFueSBudW1iZXIgb2Ygc291cmNlIG9iamVjdHMgdGhhdCBwcm9wZXJ0aWVzIHdpbGwgYmVcbiAqICAgICAgICAgICAgICAgICAgICAgIGNvcGllZCBmcm9tLlxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG52YXIgZXh0ZW5kID0gZnVuY3Rpb24gKG9iaiAvKiwgLi4uc291cmNlICovKSB7XG4gIGVhY2goX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIHByb3ApKSB7XG4gICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBvYmo7XG59O1xuXG4vKipcbiAqIEdldHRpbmcgYWxsIHRoZSBkYXRhIGF0cnJpYnV0ZXMgb2YgYW4gZWxlbWVudC4gV29ya3MgY3Jvc3MtYnJvd3Nlci5cbiAqXG4gKiBAcGFyYW0gIHtFbGVtZW50fSBlbFxuICogQHJldHVybiB7T2JqZWN0fVxuICovXG52YXIgZ2V0RGF0YUF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAoZWwpIHtcbiAgdmFyIG9iaiAgPSB7fTtcblxuICBpZiAoZWwuZGF0YXNldCkge1xuICAgIHJldHVybiBleHRlbmQob2JqLCBlbC5kYXRhc2V0KTtcbiAgfVxuXG4gIHZhciB1cHBlckNhc2UgPSBmdW5jdGlvbiAoXywgJDApIHsgcmV0dXJuICQwLnRvVXBwZXJDYXNlKCk7IH07XG5cbiAgdmFyIGF0dHJzID0gZWwuYXR0cmlidXRlcztcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSBhdHRycy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICB2YXIgYXR0ciA9IGF0dHJzLml0ZW0oaSk7XG4gICAgaWYgKGF0dHIubm9kZU5hbWUuc3Vic3RyKDAsIDUpID09PSAnZGF0YS0nKSB7XG4gICAgICB2YXIgbmFtZSA9IGF0dHIubm9kZU5hbWUuc3Vic3RyKDUpLnJlcGxhY2UoL1xcLShcXHcpLywgdXBwZXJDYXNlKTtcblxuICAgICAgb2JqW25hbWVdID0gYXR0ci5ub2RlVmFsdWU7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG9iajtcbn07XG5cbi8qKlxuICogQ29weSBvZiBhbGwgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3IgYSBuZXcgTm90ZWJvb2sgaW5zdGFuY2UuXG4gKlxuICogQHR5cGUge09iamVjdH1cbiAqL1xudmFyIGRlZmF1bHRPcHRpb25zID0ge1xuICBpZDogICAgICBudWxsLCAvLyBJbml0aWFsIGlkIHRvIHB1bGwgY29udGVudCBmcm9tXG4gIGNvbnRlbnQ6IG51bGwsIC8vIEZhbGxiYWNrIGNvbnRlbnQgaW4gY2FzZSBvZiBubyBpZFxuICBzdHlsZTogICB7fSwgICAvLyBTZXQgc3R5bGVzIG9uIHRoZSBpZnJhbWVcbiAgYWxpYXM6ICAge30gICAgLy8gQWxpYXMgb2JqZWN0cyBpbnRvIHRoZSBmcmFtZSBvbmNlIGF2YWlsYWJsZVxufTtcblxuLyoqXG4gKiBDb3B5IG9mIHRoZSBkZWZhdWx0IGlmcmFtZSBzdHlsZSBvcHRpb25zLlxuICpcbiAqIEB0eXBlIHtPYmplY3R9XG4gKi9cbnZhciBkZWZhdWx0U3R5bGVzID0ge1xuICB3aWR0aDogICAgICAgJzEwMCUnLFxuICBib3JkZXI6ICAgICAgJ25vbmUnLFxuICBkaXNwbGF5OiAgICAgJ2Jsb2NrJyxcbiAgbWFyZ2luTGVmdDogICdhdXRvJyxcbiAgbWFyZ2luUmlnaHQ6ICdhdXRvJyxcbiAgcGFkZGluZzogICAgICcwJyxcbiAgb3ZlcmZsb3c6ICAgICdoaWRkZW4nXG59O1xuXG4vKipcbiAqIENyZWF0ZXMgYW4gZW1iZWRkYWJsZSB2ZXJzaW9uIG9mIHRoZSBub3RlYm9vayBmb3IgZ2VuZXJhbCBjb25zdW1wdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHsoRWxlbWVudHxGdW5jdGlvbil9IGVsXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgICAgICAgICAgIG9wdGlvbnNcbiAqIEByZXR1cm4ge05vdGVib29rfVxuICovXG52YXIgTm90ZWJvb2sgPSBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChlbCwgb3B0aW9ucywgc3R5bGVzKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBOb3RlYm9vaykpIHtcbiAgICByZXR1cm4gbmV3IE5vdGVib29rKGVsLCBvcHRpb25zLCBzdHlsZXMpO1xuICB9XG5cbiAgdmFyIG5vdGVib29rID0gdGhpcztcblxuICBub3RlYm9vay5fbWFrZUZyYW1lKGVsLCBleHRlbmQoe30sIGRlZmF1bHRPcHRpb25zLCBvcHRpb25zKSk7XG4gIG5vdGVib29rLl9zdHlsZUZyYW1lKGV4dGVuZCh7fSwgZGVmYXVsdFN0eWxlcywgc3R5bGVzKSk7XG5cbiAgLy8gTGlzdGVuIHRvIHRoZSByZWFkeSBldmVudCBhbmQgc2V0IGEgZmxhZyBmb3IgZnV0dXJlIHJlYWR5IGZ1bmN0aW9ucy5cbiAgbm90ZWJvb2sub25jZSgncmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIG5vdGVib29rID0gdGhpcztcblxuICAgIC8vIFNldCBhIFwicHJpdmF0ZVwiIHJlYWR5IGZsYWcgdG8gZW5zdXJlIHRoYXQgYW55IGZ1dHVyZSByZWdpc3RlciByZWFkeVxuICAgIC8vIGZ1bmN0aW9ucyBhcmUgZXhlY3V0ZWQgaW1tZWRpYXRlbHkuXG4gICAgdGhpcy5fcmVhZHkgPSB0cnVlO1xuXG4gICAgLy8gSXRlcmF0ZSBvdmVyIHRoZSBjdXJyZW50bHkgcmVnaXN0ZXJlZCBcInJlYWR5XCIgZnVuY3Rpb25zLlxuICAgIGlmICh0aGlzLl9yZWFkeUZ1bmN0aW9ucykge1xuICAgICAgZWFjaCh0aGlzLl9yZWFkeUZ1bmN0aW9ucywgZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgIGZuLmNhbGwobm90ZWJvb2spO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gRGVsZXRlIHRoZSByZWFkeSBmdW5jdGlvbnMgYXJyYXkgc2luY2UgdGhlIGZ1bmN0aW9ucyBzaG91bGRuJ3QgYmUgdXNlZFxuICAgIC8vIGFueW1vcmUuXG4gICAgZGVsZXRlIHRoaXMuX3JlYWR5RnVuY3Rpb25zO1xuICB9KTtcbn07XG5cbi8qKlxuICogS2VlcCB0cmFjayBvZiBhbGwgY3JlYXRlZCBub3RlYm9va3MgYW5kIGFsbG93IGNvbmZpZ3VyYXRpb24gYWZ0ZXIgY3JlYXRpb24uXG4gKlxuICogQHR5cGUge0FycmF5fVxuICovXG5Ob3RlYm9vay5pbnN0YW5jZXMgPSBbXTtcblxuLyoqXG4gKiBLZWVwIHRyYWNrIG9mIGFsbCByZWdpc3RlcmVkIHN1YnNjcmlwdGlvbnMgYW5kIHVuc3Vic2NyaXB0aW9ucy5cbiAqXG4gKiBAdHlwZSB7QXJyYXl9XG4gKi9cbk5vdGVib29rLnN1YnNjcmlwdGlvbnMgICA9IFtdO1xuTm90ZWJvb2sudW5zdWJzY3JpcHRpb25zID0gW107XG5cbi8qKlxuICogUGFzcyBhIHN1YnNjcmlwdGlvbiBtZXRob2QgdG8gZXZlcnkgbm90ZWJvb2suIEl0IHdpbGwgYmUgY2FsbGVkIGZvciBhbGxcbiAqIG5vdGVib29rIGluc3RhbmNlcywgbmV3IGFuZCBvbGQuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuTm90ZWJvb2suc3Vic2NyaWJlID0gZnVuY3Rpb24gKGZuKSB7XG4gIE5vdGVib29rLnN1YnNjcmlwdGlvbnMucHVzaChmbik7XG5cbiAgZWFjaChOb3RlYm9vay5pbnN0YW5jZXMsIGZuKTtcbn07XG5cbi8qKlxuICogUGFzcyBhbiB1bnN1YnNjcmliZSBtZXRob2QgdG8gZXZlcnkgbm90ZWJvb2sgaW5zdGFuY2UgZm9yIHJlbW92YWwuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuTm90ZWJvb2sudW5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoZm4pIHtcbiAgTm90ZWJvb2sudW5zdWJzY3JpcHRpb25zLnB1c2goZm4pO1xufTtcblxuLyoqXG4gKiBHZW5lcmF0ZSBhbiBpZnJhbWUgdG8gaG91c2UgdGhlIGVtYmVkZGFibGUgd2lkZ2V0IGFuZCBhcHBlbmQgdG8gdGhlXG4gKiBkZXNpZ25hdGVkIGVsZW1lbnQgaW4gdGhlIERPTS5cbiAqXG4gKiBAcGFyYW0gIHtFbGVtZW50fEZ1bmN0aW9ufSBlbFxuICogQHJldHVybiB7Tm90ZWJvb2t9XG4gKi9cbk5vdGVib29rLnByb3RvdHlwZS5fbWFrZUZyYW1lID0gZnVuY3Rpb24gKGVsLCBvcHRpb25zKSB7XG4gIHZhciB0aGF0ICA9IHRoaXM7XG4gIHZhciBzcmMgICA9IE5PVEVCT09LX1VSTCArICcvZW1iZWQuaHRtbCc7XG4gIHZhciBmcmFtZSA9IHRoaXMuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpZnJhbWUnKTtcblxuICAvLyBDb25maWd1cmUgYmFzZSBmcmFtZSBvcHRpb25zLlxuICBmcmFtZS5zcmMgICAgICAgPSBzcmM7XG4gIGZyYW1lLmNsYXNzTmFtZSA9IG9wdGlvbnMuY2xhc3NOYW1lIHx8ICcnO1xuICBmcmFtZS5zY3JvbGxpbmcgPSAnbm8nO1xuXG4gIC8vIEV4dGVuZCBiYXNpYyBjb25maWd1cmF0aW9uIG9wdGlvbnMuXG4gIG9wdGlvbnMuY29uZmlnID0gZXh0ZW5kKHtcbiAgICBpZDogICAgICAgb3B0aW9ucy5pZCxcbiAgICB1cmw6ICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYsXG4gICAgZW1iZWRkZWQ6IHRydWUsXG4gICAgY29udGVudDogIG9wdGlvbnMuY29udGVudFxuICB9LCBvcHRpb25zLmNvbmZpZyk7XG5cbiAgLy8gV2hlbiB0aGUgYXBwIGlzIHJlYWR5IHRvIHJlY2VpdmUgZXZlbnRzLCBzZW5kIGNvbmZpZ3VyYXRpb24gZGF0YSBhbmQgbGV0XG4gIC8vIHRoZSBmcmFtZSBrbm93IHRoYXQgd2UgYXJlIHJlYWR5IHRvIGV4ZWN1dGUuXG4gIHRoaXMub25jZSgncmVhZHknLCBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy50cmlnZ2VyKCdyZWFkeScsIG9wdGlvbnMpO1xuXG4gICAgdGhpcy5vbmNlKCdyZW5kZXJlZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIE5vdGVib29rLmluc3RhbmNlcy5wdXNoKHRoYXQpO1xuICAgICAgZWFjaChOb3RlYm9vay5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgZm4odGhhdCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gV2hlbiBhIG5ldyBoZWlnaHQgY29tZXMgdGhyb3VnaCwgdXBkYXRlIHRoZSBpZnJhbWUgaGVpZ2h0LiBVc2UgdGhlIGlubGluZVxuICAvLyBoZWlnaHQgdGFnIHNpbmNlIGNzcyBzaG91bGQgdGFrZSBhIGhpZ2hlciBwcmVjZW5kZW5jZSAod2hpY2ggYWxsb3dzIHNpbXBsZVxuICAvLyBoZWlnaHQgb3ZlcnJpZGVzIHRvIHdvcmsgYWxvbmdzaWRlIHRoaXMpLlxuICB0aGlzLm9uKCdoZWlnaHQnLCBmdW5jdGlvbiAoaGVpZ2h0KSB7XG4gICAgdmFyIHRvcCAgICA9IHBhcnNlSW50KHRoaXMuZWwuc3R5bGUucGFkZGluZ1RvcCwgICAgMTApO1xuICAgIHZhciBib3R0b20gPSBwYXJzZUludCh0aGlzLmVsLnN0eWxlLnBhZGRpbmdCb3R0b20sIDEwKTtcblxuICAgIHRoaXMuZWwuaGVpZ2h0ID0gKGhlaWdodCArIHRvcCArIGJvdHRvbSk7XG4gIH0pO1xuXG4gIC8vIFNldCB1cCBhIHNpbmdsZSBtZXNzYWdlIGxpc3RlbmVyIHRoYXQgd2lsbCB0cmlnZ2VyIGV2ZW50cyBmcm9tIHRoZSBmcmFtZVxuICBnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIHRoaXMuX21lc3NhZ2VMaXN0ZW5lciA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKGUuc291cmNlICE9PSBmcmFtZS5jb250ZW50V2luZG93KSB7IHJldHVybjsgfVxuXG4gICAgdGhhdC5fZnJhbWVFdmVudCA9IGU7XG4gICAgdGhhdC50cmlnZ2VyLmFwcGx5KHRoYXQsIEthbWluby5wYXJzZShlLmRhdGEpKTtcbiAgfSwgZmFsc2UpO1xuXG4gIGlmICh0eXBlb2YgZWwuYXBwZW5kQ2hpbGQgPT09ICdmdW5jdGlvbicpIHtcbiAgICBlbC5hcHBlbmRDaGlsZChmcmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgZWwoZnJhbWUpO1xuICB9XG5cbiAgdGhpcy53aW5kb3cgPSBmcmFtZS5jb250ZW50V2luZG93O1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTZXRzIHRoZSBpbmxpbmUgc3R5bGVzIG9mIHRoZSBmcmFtZS5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgc3R5bGVcbiAqIEByZXR1cm4ge05vdGVib29rfVxuICovXG5Ob3RlYm9vay5wcm90b3R5cGUuX3N0eWxlRnJhbWUgPSBmdW5jdGlvbiAoc3R5bGVzKSB7XG4gIGNzcyh0aGlzLmVsLCBzdHlsZXMpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRXZhbHVhdGUgdGV4dCBpbiB0aGUgY29udGV4dCBvZiB0aGUgbm90ZWJvb2sgZnJhbWUuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9ICAgZXZpbFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZG9uZVxuICovXG5Ob3RlYm9vay5wcm90b3R5cGUuZXhlYyA9IGZ1bmN0aW9uIChldmlsLCBkb25lKSB7XG4gIHRoaXMub25jZSgnZXhlYycsIGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICByZXR1cm4gZG9uZSAmJiBkb25lKHJlc3VsdCk7XG4gIH0pO1xuXG4gIHRoaXMudHJpZ2dlcignZXhlYycsIGV2aWwpO1xufTtcblxuXG4vKipcbiAqIFJldHVybnMgYSB2YXJpYWJsZSBmcm9tIHRoZSBlbWJlZGRlZCBwYWdlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSAgIGtleVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZG9uZVxuICovXG5Ob3RlYm9vay5wcm90b3R5cGUuZ2V0VmFyaWFibGUgPSBmdW5jdGlvbiAoa2V5LCBkb25lKSB7XG4gIHRoaXMuZXhlYyhrZXksIGRvbmUpO1xufTtcblxuLyoqXG4gKiBSZW1vdmVzIHRoZSBmcmFtZSBmcm9tIHRoZSBET00uXG4gKlxuICogQHJldHVybiB7Tm90ZWJvb2t9XG4gKi9cbk5vdGVib29rLnByb3RvdHlwZS5fcmVtb3ZlRnJhbWUgPSBmdW5jdGlvbiAoKSB7XG4gIGdsb2JhbC5yZW1vdmVFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgdGhpcy5fbWVzc2FnZUxpc3RlbmVyKTtcbiAgdGhpcy5lbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuZWwpO1xuICBkZWxldGUgdGhpcy5lbDtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlcyBhbnkgbm90ZWJvb2sgYXNzb2NpYXRlZCBkYXRhIGZyb20gdGhlIGVtYmVkZGluZyBmcmFtZS5cbiAqXG4gKiBAcmV0dXJuIHtOb3RlYm9va31cbiAqL1xuTm90ZWJvb2sucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBOb3RlYm9vay5pbnN0YW5jZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoTm90ZWJvb2suaW5zdGFuY2VzW2ldID09PSB0aGlzKSB7XG4gICAgICAvKiBqc2hpbnQgLVcwODMgKi9cbiAgICAgIGVhY2goTm90ZWJvb2sudW5zdWJzY3JpcHRpb25zLCBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgZm4oTm90ZWJvb2suaW5zdGFuY2VzW2ldKTtcbiAgICAgIH0pO1xuXG4gICAgICBpLS07XG4gICAgICBOb3RlYm9vay5pbnN0YW5jZXMucG9wKCk7XG4gICAgfVxuICB9XG5cbiAgdGhpcy5vZmYoKTtcblxuICByZXR1cm4gdGhpcy5fcmVtb3ZlRnJhbWUoKTtcbn07XG5cbi8qKlxuICogTGlzdGVuIHRvIGV2ZW50cyB0cmlnZ2VyZWQgYnkgdGhlIGZyYW1lLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge05vdGVib29rfVxuICovXG5Ob3RlYm9vay5wcm90b3R5cGUub24gPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB2YXIgZXZlbnRzID0gKHRoaXMuX2V2ZW50c1tuYW1lXSA9IHRoaXMuX2V2ZW50c1tuYW1lXSB8fCBbXSk7XG4gIGV2ZW50cy5wdXNoKGZuKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogTGlzdGVuIHRvIGFuIGV2ZW50IGJlaW5nIHRyaWdnZXJlZCBieSB0aGUgZnJhbWUgb25jZS5cbiAqXG4gKiBAcGFyYW0gIHtTdHJpbmd9ICAgbmFtZVxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtOb3RlYm9va31cbiAqL1xuTm90ZWJvb2sucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgdmFyIHRoYXQgPSB0aGlzO1xuICByZXR1cm4gdGhpcy5vbihuYW1lLCBmdW5jdGlvbiBjYiAoKSB7XG4gICAgdGhhdC5vZmYobmFtZSwgY2IpO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgZm4gPSBudWxsO1xuICB9KTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGV2ZW50IGxpc3RlbmVyIGZyb20gdGhlIGZyYW1lLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gW2ZuXVxuICogQHJldHVybiB7Tm90ZWJvb2t9XG4gKi9cbk5vdGVib29rLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiAobmFtZSwgZm4pIHtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1tuYW1lXSkgeyByZXR1cm4gdGhpczsgfVxuXG4gIGlmICghZm4pIHtcbiAgICBpZiAoIW5hbWUpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbbmFtZV07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB2YXIgZXZlbnRzID0gdGhpcy5fZXZlbnRzW25hbWVdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChldmVudHNbaV0gPT09IGZuKSB7XG4gICAgICBldmVudHMuc3BsaWNlKGksIDEpO1xuICAgICAgaS0tO1xuICAgIH1cbiAgfVxuXG4gIGlmICghZXZlbnRzLmxlbmd0aCkgeyBkZWxldGUgdGhpcy5fZXZlbnRzW25hbWVdOyB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFRyaWdnZXIgYW4gZXZlbnQgb24gdGhlIGZyYW1lLiBSZWFkOiBTZW5kcyBhbiBldmVudCB0byB0aGUgZnJhbWVzIHBvc3RNZXNzYWdlXG4gKiBoYW5kbGVyLlxuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gICBuYW1lXG4gKiBAcGFyYW0gIHsqfSAgICAgICAgLi4uICBBbnkgYWRkaXRpb25hbCBkYXRhIHlvdSB3aXNoIHRoZSBzZW5kIHdpdGggdGhlIGV2ZW50XG4gKiBAcmV0dXJuIHtOb3RlYm9va31cbiAqL1xuTm90ZWJvb2sucHJvdG90eXBlLnRyaWdnZXIgPSBmdW5jdGlvbiAobmFtZSAvKiwgLi5hcmdzICovKSB7XG4gIHZhciB0aGF0ID0gdGhpcztcbiAgdmFyIGFyZ3M7XG5cbiAgaWYgKHRoaXMuX2ZyYW1lRXZlbnQpIHtcbiAgICBkZWxldGUgdGhhdC5fZnJhbWVFdmVudDtcbiAgICBhcmdzID0gX19zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKHRoaXMuX2V2ZW50cyAmJiB0aGlzLl9ldmVudHNbbmFtZV0pIHtcbiAgICAgIC8vIFNsaWNlIGEgY29weSBvZiB0aGUgZXZlbnRzIHNpbmNlIHdlIG1pZ2h0IGJlIHJlbW92aW5nIGFuIGV2ZW50IGZyb21cbiAgICAgIC8vIHdpdGhpbiBhbiBldmVudCBjYWxsYmFjay4gSW4gd2hpY2ggY2FzZSBpdCB3b3VsZCBicmVhayB0aGUgbG9vcC5cbiAgICAgIGVhY2godGhpcy5fZXZlbnRzW25hbWVdLnNsaWNlKCksIGZ1bmN0aW9uIChmbikge1xuICAgICAgICBmbi5hcHBseSh0aGF0LCBhcmdzKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGFyZ3MgPSBfX3NsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgdGhpcy5lbC5jb250ZW50V2luZG93LnBvc3RNZXNzYWdlKEthbWluby5zdHJpbmdpZnkoYXJncyksIE5PVEVCT09LX1VSTCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBTaG9ydGhhbmQgZm9yIHNldHRpbmcgYSBjb25maWcgb3B0aW9uLlxuICovXG5Ob3RlYm9vay5wcm90b3R5cGUuY29uZmlnID0gZnVuY3Rpb24gKCkge1xuICB0aGlzLnRyaWdnZXIuYXBwbHkodGhpcywgWydjb25maWcnXS5jb25jYXQoX19zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbn07XG5cbi8qKlxuICogU2hvcnRoYW5kIGZvciBwYXNzaW5nIG1lc3NhZ2VzIHRvIHRoZSBhcHBsaWNhdGlvbi5cbiAqL1xuTm90ZWJvb2sucHJvdG90eXBlLm1lc3NhZ2UgPSBmdW5jdGlvbiAoKSB7XG4gIHRoaXMudHJpZ2dlci5hcHBseSh0aGlzLCBbJ21lc3NhZ2UnXS5jb25jYXQoX19zbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbn07XG5cbi8qKlxuICogUmVmcmVzaCB0aGUgaWZyYW1lLlxuICovXG5Ob3RlYm9vay5wcm90b3R5cGUucmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5tZXNzYWdlKCdyZWZyZXNoJyk7XG59O1xuXG4vKipcbiAqIEV4ZWN1dGUgYSBmdW5jdGlvbiB3aGVuIHRoZSBub3RlYm9vayBpcyByZWFkeSB0byBiZSBpbnRlcmFjdGVkIHdpdGguXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqL1xuTm90ZWJvb2sucHJvdG90eXBlLnJlYWR5ID0gZnVuY3Rpb24gKGZuKSB7XG4gIGlmICh0aGlzLl9yZWFkeSkge1xuICAgIHJldHVybiBmbi5jYWxsKHRoaXMpO1xuICB9XG5cbiAgKHRoaXMuX3JlYWR5RnVuY3Rpb25zIHx8ICh0aGlzLl9yZWFkeUZ1bmN0aW9ucyA9IFtdKSkucHVzaChmbik7XG59O1xuXG4vKipcbiAqIEF0dGVtcHRzIHRvIGF1dG9tYXRpY2FsbHkgY3JlYXRlIHRoZSBpbml0aWFsIG5vdGVib29rIGJ5IHNjYW5uaW5nIGZvciB0aGVcbiAqIGNvcnJlY3Qgc2NyaXB0IHRhZyBhbmQgdXNpbmcgdGhlIGRhdGEgZnJvbSBpdCB0byBnZW5lcmF0ZSB0aGUgbm90ZWJvb2suXG4gKlxuICogQHBhcmFtIHtOb2RlTGlzdH0gc2NyaXB0c1xuICovXG4oZnVuY3Rpb24gKHNjcmlwdHMpIHtcbiAgdmFyIHNjcmlwdDtcblxuICBmb3IgKHZhciBpID0gMCwgbCA9IHNjcmlwdHMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgLy8gQWxsb3dzIHRoZSBzY3JpcHQgdG8gYmUgbG9hZGVkIGFzeW5jaHJvbm91c2x5IGlmIHdlIHByb3ZpZGUgdGhpc1xuICAgIC8vIGF0dHJpYnV0ZSB3aXRoIHRoZSBzY3JpcHQgdGFnLlxuICAgIGlmIChzY3JpcHRzW2ldLmhhc0F0dHJpYnV0ZSgnZGF0YS1ub3RlYm9vaycpKSB7XG4gICAgICBzY3JpcHQgPSBzY3JpcHRzW2ldO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFzY3JpcHQpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBCeSBkZWZhdWx0IHdlJ2xsIGNyZWF0ZSB0aGUgbm90ZWJvb2sgaW4gdGhlIHNhbWUgZWxlbWVudCBhcyB0aGUgc2NyaXB0LlxuICB2YXIgZWwgPSBzY3JpcHQucGFyZW50Tm9kZTtcblxuICAvLyBBbGxvdyB0aGUgbm90ZWJvb2sgYXR0cmlidXRlIHRvIHBvaW50IHRvIGFub3RoZXIgZWxlbWVudC5cbiAgaWYgKHNjcmlwdC5nZXRBdHRyaWJ1dGUoJ2RhdGEtbm90ZWJvb2snKSkge1xuICAgIGVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2NyaXB0LmdldEF0dHJpYnV0ZSgnZGF0YS1ub3RlYm9vaycpKTtcbiAgfVxuXG4gIC8vIFJlbW92ZSB0aGUgYGRhdGEtbm90ZWJvb2tgIGF0dHJpYnV0ZSBmb3IgZnV0dXJlIGxvYWRzLlxuICBzY3JpcHQucmVtb3ZlQXR0cmlidXRlKCdkYXRhLW5vdGVib29rJyk7XG5cbiAgLy8gQ3JlYXRlIHRoZSBub3RlYm9vayBpbnN0YW5jZSBhbmQgYXBwZW5kLlxuICByZXR1cm4gbmV3IE5vdGVib29rKGVsLCBnZXREYXRhQXR0cmlidXRlcyhzY3JpcHQpKTtcbn0pKGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKSk7XG5cbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIl19
(4)
});
