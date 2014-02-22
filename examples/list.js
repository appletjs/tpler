// Module dependencies.
var tpler = require('../')
  , fs = require('fs')
  , str = fs.readFileSync(__dirname + '/list.tpler', 'utf8');

var ret = tpler.render(str, {
  names: ['foo', 'bar', 'baz']
});

console.log(ret);
