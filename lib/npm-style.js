/* global require module */

var util = require('util')
  , workingStack = []
  , workingString = ''
  , options = { oneLine: true
              }

function printString (ast) {
  var str = ast.value.toString()
  str = str.replace(/[\\\b\f\n\r\t\x27\u2028\u2029\0]/g ,function (s) {
          switch (s) {
            case '\\': return '\\\\'
            case '\b': return '\\b'
            case '\f': return '\\f'
            case '\n': return '\\n'
            case '\r': return '\\r'
            case '\u2028': return '\\u2028'
            case '\u2029': return '\\u2029'
            case '\'': return '\\\''
            case '\0': return '\\0'
          }
          return s
        })
  workingString += '\'' + str + '\''
}

function printSep () {
  workingString += '\n'
}

function printNum (ast) {
  workingString +=  +ast.value
}

function printName (ast) {
  workingString += ast.value.toString()
}

function printDebugger (ast) {
  workingString += 'debugger'
  printSep()
}

function blockOneLine (ast) {
  if (!options.oneLine) return false
  if (!ast.body.length) return true
  if (ast.body.length > 1) return false
  return true
}

function printBlock (ast) {
  if (!ast.body.length) {
    if (ast.required) {
      workingString += '{}'
    }
    else {
      workingString += ';'
    }
  }
  else if (blockOneLine(ast)) {
    if (ast.required) {
      workingString +=  '{ ' + printStatement(ast.body[0]) + ' }'
    }
    else {
      workingString += printStatement(ast.body[0])
    }
  }
  else {
    workingString += '{\n'
    printStatements(ast.body)
    printSep()
    workingString += '}'
  }
}

function printStatements (arr) {
  if (arr.length < 1) return
  for (var i = 0 ,l = arr.length ;i < l - 1;i++) {
    printStatement(arr[i])
    if (i < l-1) printSep()
  }
}

function printStatement (ast) {

}

function npmStyle (ast) {
  if (!ast) return ''
  printStatements(ast.body)
  return workingString
}

module.exports = npmStyle
