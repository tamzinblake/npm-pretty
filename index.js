/* global module require */

//Require parse locally for now, in future will depend directly on UgilfyJS2
var parse = require('./lib/parse')
  , npmStyle  = require('./lib/npm-style')

function pretty (code) {
  var ast = parse(code)
  return npmStyle(ast)
}

module.exports = pretty
