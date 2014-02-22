// MIT Licensed
// Copyright(c) 2014 Maofeng Zhang <japplet@163.com>
// 
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// Module dependencies.
var fs = require('fs')
	, path = require('path')
	, dirname = path.dirname
	, extname = path.extname
	, join = path.join;

// Intermediate js cache.
var _cache = {};
var _extensions = {};
var Tpler = module.exports = {
	version: '0.0.1'
	, close: '%>' 
	, open: '<%'
};

// Tpler.usingDefaultExtension = true;

_extensions['.tpler'] = function(name) {
	var content = fs.readFileSync(name, 'utf8');
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
}

// clear once cache or all cache
Tpler.clearCache = function(name) {
	if (!arguments.length) _cache = {};
	else if (_cache.hasOwnProperty(name)) delete _cache[name];
};

Tpler.registerExtension = function(ext, assist) {
	if (ext !== '.tpler') {
		if (arguments.length === 1) delete _extensions[ext];
		else if (typeof assist === 'function') _extensions[ext] = assist;
	}
};

function readFileSync(name) {
	var ext = extname(name);
	if (!ext || !_extensions.hasOwnProperty(ext)) ext = '.tpler', name += ext;
	return _extensions[ext](name, 'utf8');
};

// check if the file exists and is not a directory
function tryFile(p) {	
  try { var stats = fs.statSync(p); } catch (ex) {}
	return (stats && !stats.isDirectory()) ? fs.realpathSync(p): null;
}

// given a path check a the file exists with any of the set extensions
function tryExtensions(p, exts) {
	for (var filename, EL = exts.length, i = 0; i < EL; i++) {
		if (filename = tryFile(p + exts[i++])) return filename;
	}
	
  return null;
}

function copy(origin, add) {
	if (!add) add = origin, origin = {};
  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) origin[keys[i]] = add[keys[i]];
  return origin;
};

// Escape the given string of `html`.
function escapeHTML(html) {
  return String(html)
    .replace(/&(?!#?[a-zA-Z0-9]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;');
};

function mistake(msg, options) {
	var e = copy((msg instanceof Error) ? msg : new Error(msg), options || {});
	if (e.filename) e.message += ', at filename: ' + e.filename;
	if (e.lineno) e.message += ', at lineno: ' + e.lineno;
	if (e.code) e.message = e.code + ', ' + e.message;
	return e;
}

// It's a core engine with current module
// Options:
//  - `filename`        Used by `cache` to key caches
//  - `debug`           Output generated function body
//  - `error`           Manufacturing or trigger the Error
//  - `assist`          Acting on the string parsing
//  - `open`            Open tag
//  - `close`           Closing tag
var engine = Tpler.engine = function (text, options) {
	var open = options.open
		, close = options.close
		, OL = open.length
		, CL = close.length
		, error = options.error
		, assist = options.assist
		, lineno = options.lineno
		, debug = options.debug
    , indexOf, lookup
		, cmd = text;
	
	indexOf = function(symbol, start) {
		var symbolat = cmd.indexOf(symbol, start);
		return [symbolat === -1 ? cmd.substring(start) : cmd.substring(start, symbolat), symbolat];
	};
	
	lookup = function() {
		var outer, inner, at, errat, res;
		
		options.lineno = lineno;
		res = assist('outer', (outer = indexOf(open, 0))[0], lineno, debug, options);
		if (outer[1] === -1) return res[0];
		
		errat = cmd.indexOf(open, (at = outer[1]) + OL);
		at = (inner = indexOf(close, at + OL))[1];
		// errat = -1 or errat > 0
		// at    = -1 or at    > 0
		//
		// errat == -1 && at == -1               -> right
		// errat == -1 && at  >  0               -> right
		// errat  >  0 && at == -1               -> error
		// errat  >  0 && at  >  0
		//                          -> errat > at  -> right
		//                          -> errat < at  -> error
		if ((errat > 0 && at === -1) || (errat > 0 && at > 0 && errat < at)) {
			throw error('bad tag', {
				code: 'NOT_CLOSE_TAG'
				, filename: options.filename
				, lineno: lineno
			});
		}
		
		options.lineno = lineno = res[1];
		res = res[0] + (inner = assist('inner', inner[0], lineno, debug, options))[0];
		
		if (at > 0) {
			cmd = cmd.slice(at + CL);
			res += lookup();
		}

		return res;		
	};
	
	if (typeof lineno !== 'number') lineno = 1;
	return assist('ender', lookup(), lineno, debug, options);
}

// interpolate('<%# <a href="javascript:alert(\'你点击了#{a.name1}\');">#{a.name1}</a> %>'[, options]);
//   -> "<a href="javascript:alert('你点击了" + a.name1 + "');">" + a.name1 + "</a>"
function interpolate(text, options) {
	return engine(text, copy(options || {}, {
		open: '#{'
		, close: '}'
		, error: mistake
		, assist: function(type, ctx, lineno, debug, options) {
			if (type === 'ender') return ctx.replace(/^""\+|\++$/g, '');
			
			var _buffer = debug ? '(__LINENO=' + lineno + ',' : '', n;
			if (type === 'outer') _buffer += JSON.stringify(ctx);
			else if (type === 'inner') _buffer += ctx;
			else _buffer = '""';
			
			n = 0;
			debug && (_buffer += ')');
			while (~(n = ctx.indexOf('\n', n))) n++, lineno++;
			return [_buffer + '+', lineno];
		}
	}));
}

// Parse the given `text` of tpler, returning the function body.
var parse = Tpler.parse = function(text, options) {
	options = options || {};
	
	return engine(text, copy(options, {
		open: Tpler.open || options.open || '<%'
		, close: Tpler.close || options.close || '%>'
		, error: mistake
		, extensions: Object.keys(_extensions)
		, assist: function (type, ctx, lineno, debug, options) {
				var _buffer, _debugger, isinter, isescape, isinclude, isscript, isnewline, notwhite, filename, name, nctx, n;

				notwhite = ctx.trim() !== '';
				if (type === 'ender')
					return notwhite
						? 'var __BUFFER=[],__LINENO,__FILENAME'
							+ (options.filename ? '=' + JSON.stringify(options.filename) : '')
							+ ';'
							+ (options._with ? 'with(__LOCALS||{}){(function(){\n': '')
							+ ctx + (options._with ? '\n}());}' : '')
							+ '\nreturn __BUFFER.join("");'
						: '';

				if (type === 'outer' && notwhite)
					_buffer = '__BUFFER.push(' + JSON.stringify(ctx) + ');';

				if (type === 'inner' && notwhite) {
					switch(ctx.charAt(0)) {
						case '~': isinter = true; isescape = true; break;
						case '#': isinter = true; break;
						case '=': isescape = true; break;
						case '-': break;
						case '@': isinclude = true; break;
						default: isscript = true;
					}
					
					isnewline = ctx.slice(-1) === '-';
					if (isnewline) ctx = ctx.slice(0, -1);

					if (!isscript) {
						if (!(nctx = ctx.substring(1).trim()))
							_buffer = null;

						else if (isinclude) {
							if (!(filename = options.filename)) {
								_debugger = mistake("bad include", {
									code: 'MISS_DEPENDET_TPLER'
									, lineno: lineno
								});				
							}
							else filename = join(dirname(filename) + '/' + nctx);
							
							if (!_debugger && !(name = tryFile(filename) || tryExtensions(filename, options.extensions))) {
								_debugger = mistake("bad include '" + nctx + "'", {
									code: 'NOT_FINED_TPLER'
									, filename: options.filename
									, lineno: lineno
								});
							}
							
							if (!_debugger) {
								_buffer = 'function(){'
									+ parse(readFileSync(name), copy(copy(options), {
											filename: nctx
											, _with: false
											, lineno: 1
										}))
									+ '}()||""';
							}
							else if (debug) throw _debugger;
							else _buffer = JSON.stringify('{' + _debugger.message + '}');
						}
						else if (isinter) _buffer = interpolate(nctx, copy(options));
						else _buffer = nctx;

						if (_buffer && !_debugger && isescape) _buffer = '__ESCAPE(' + _buffer + ')';
						if (_buffer) _buffer = '__BUFFER.push(' + _buffer + ')';
						else	_buffer = '';
						
						if (_buffer && !isinter && ctx.lastIndexOf('//') > ctx.lastIndexOf('\n')) _buffer += '\n';
					}
					else _buffer = ctx;
				}

				n = 0;
				if (_buffer && debug) _buffer = '__LINENO=' + lineno + ';' + _buffer;
				if (_buffer) _buffer += ';';
				if (isnewline) _buffer += '__BUFFER.push("\\n");';
				while (~(n = ctx.indexOf('\n', n))) n++, lineno++;
				return [_buffer ? _buffer : '', lineno];
			}
		})
	);
}

// Compile the given `text` of tpler into a `Function`.
var compile = Tpler.compile = function(text, options) {
	var options = options || {}
		, escape = options.escape || escapeHTML
		, debug = options.debug
		, error = function(msg, opts) {
			throw mistake(msg, opts);
		};
	
	options._with = true;
	options.lineno = 1;
	text = parse(text, options);
			
  if (debug)
    text = 'try{\n'
			+ text
			+ '\n}catch(e){throw __ERROR(e,{lineno:__LINENO,filename:__FILENAME});}';
  
  if (debug) console.log(text);

  try {
    var fn = new Function('__LOCALS, __ESCAPE, __ERROR', text);
  } catch (err) {
    if ('SyntaxError' == err.name)
      err.message += options.filename
        ? ' in ' + options.filename
        : ' while compiling tpler';
		
    throw err;
  }

  return function(locals){
    return fn.call(this, locals, escape, error);
  }
};

// Render the given `text` of tpler.
//
// Options:
//   - `locals`          Local variables object
//   - `cache`           Compiled functions are cached, requires `filename`
//   - `filename`        Used by `cache` to key caches
//   - `scope`           Function execution context
//   - `debug`           Output generated function body
//   - `open`            Open tag, defaulting to "<%"
//   - `close`           Closing tag, defaulting to "%>"
var render = Tpler.render = function(text, options) {
  var fn, options = options || {};
  if (options.cache) {
    if (options.filename) {
      fn = _cache[options.filename] || (_cache[options.filename] = compile(text, options));
		} else {
      throw new Error('"cache" option requires "filename".');
		}
  } else {
		fn = compile(text, options);
	}
	
  options.__proto__ = options.locals;
  return fn.call(options.scope, options);
};

// Render a tpler file at the given `path` and callback `callback(err, str)`.
Tpler.renderFile = function(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
		options = {};
	}

  options.filename = path;
  var key = path + ':string';
	
	if (options.cache && _cache.hasOwnProperty(key)) {
		callback(null, render(_cache[key], options));
	} else {
		fs.readFile(path, 'utf8', function(err, text) {
			if (!err) {
				if (options.cache) _cache[key] = text;
				text = render(text, options);
			}
			
			callback(err, text);
		});
	}
};

console.log(fs.readFileSync('readme.md').toString())
