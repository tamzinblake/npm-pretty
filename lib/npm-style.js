/* global require module */

var util = require('util')
  , workingStack = []
  , workingString = ''
  , options = { oneLine: true
              , lineLength: 70
              }

function pushBuffer (saveLine) {
  var str = ''
  if (saveLine)
    str = workingString.replace(/^(.*)([\s\S]*)/gm ,'$1')
  workingStack.push(workingString)
  workingString = str
}

function popBuffer () {
  var rv = workingString
  workingString = workingStack.pop()
  return rv
}

function bufferOneLine () {
  return workingString.length < options.lineLength && /\n/m.test(workingString)
}

function print (str) {
  workingString += str
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
  print('\'' + str + '\'')
}

function printSep () {
  print('\n')
}

function printNum (ast) {
  print(+ast.value)
}

function printName (ast) {
  print(ast.value.toString())
}

function printDebugger (ast) {
  print('debugger')
  printSep()
}

function blockOneLine (ast ,n) {
  if (!options.oneLine) return false
  if (!ast.body.length) return true
  if (ast.body.length > 1) return false
  pushBuffer(true)
  for (var i = 0 ;i < n ;i++) {
    print(' ')
  }
  printStatement(ast.body[0])
  var rv = bufferOneLine()
  popBuffer()
  return rv
}

function expressionOneLine (ast ,n) {
  pushBuffer(true)
  printExpression(ast ,true)
  var rv = bufferOneLine()
  popBuffer()
  return rv
}

function printEmptyBlock () {
  print('{}')
}

function printEmptyStatement () {
  print(';')
}

function printBlock (ast ,required) {
  if (!ast.body.length) {
    if (required) {
      printEmptyBlock()
    }
    else {
      printEmptyStatement()
    }
  }
  else if (blockOneLine(ast, 4)) {
    if (required) {
      print('{ ')
      printStatement(ast.body[0])
      print(' }')
    }
    else {
      printStatement(ast.body[0])
    }
  }
  else {
    print('{\n')
    printStatements(ast.body)
    printSep()
    print('}')
  }
}

function printExpressionParens (ast) {
  if (expressionOneLine(ast ,2)) {
    print('(')
    printExpression(ast ,true)
    print(')')
  }
  else {
    print('( ')
    printExpression(ast)
    print('\n)')
  }
}

function printDo (ast) {
  print('do ')
  printStatement(ast.body)
  print(' while')
  printExpressionParens(ast.condition)
}

function printWhile (ast) {
  print('while ')
  printExpressionParens(ast.condition)
  print(' ')
  printStatement(ast.body)
}

function printFor (ast) {
  print('for ')
  printForInit(ast.init ,ast.condition ,ast.step)
  printBlock(ast.body)
}

function printStatements (arr) {
  if (arr.length < 1) return
  for (var i = 0 ,l = arr.length ;i < l - 1;i++) {
    printStatement(arr[i])
    if (i < l-1) printSep()
  }
}

function printExpression (ast ,oneLine) {

}

function printStatement (ast) {

}

function npmStyle (ast) {
  if (!ast) return ''
  printStatements(ast.body)
  return workingString
}

module.exports = npmStyle
