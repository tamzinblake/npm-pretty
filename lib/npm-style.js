/* global require module */

var util = require('util')
  , workingStack = []
  , workingString = ''
  , options = { oneLine: true
              , lineLength: 70
              }

function pushBuffer (saveLine) {
  var str = ''
  if (saveLine) str = workingString.replace(/([^\n]*\n)*(.*)$/gm ,'$2')
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

function printSep (oneLine) {
  if (oneLine) {
    print(' ;')
  }
  else {
    print('\n')
  }
}

function printNum (ast) {
  print(+ast.value)
}

function printName (ast) {
  print(ast.name.toString())
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

function expressionOneLine (ast ,n) {
  pushBuffer(true)
  printExpression(ast ,true)
  var rv = bufferOneLine()
  console.log(rv)
  console.log(workingString)
  popBuffer()
  return rv
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

function printForInit (init ,condition ,step) {
  if (init) printExpression(init)
  print(' ;')
  if (condition) printExpression(condition)
  print(' ;')
  if (step) printExpression(step)
}

function printFor (ast) {
  print('for ')
  printForInit(ast.init ,ast.condition ,ast.step)
  print(' ')
  printBlock(ast.body)
}

function printForIn (ast) {
  print('for (')
  printExpression(ast.init)
  print(' in ')
  printExpression(ast.object)
  print(') ')
  printBlock(ast.body)
}

function printWith (ast) {
  print('\n/* FIXME: don\'t use "with" */\n')
  print('with ')
  printExpressionParens(ast.expression)
  print(' ')
  printBlock(ast.body)
}

function listOneLine (arr, n) {
  pushBuffer(true)
  printList(arr ,true)
  var rv = bufferOneLine()
  popBuffer()
  return rv
}

function printList (arr, oneLine) {
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) {
      if (oneLine) {
        print(' ,')
      }
      else {
        print('\n, ')
      }
    }
    printExpression(arr[i])
  }
}

function printListParens (arr) {
  if (listOneLine(arr ,2)) {
    print('(')
    printList(arr ,true)
    print(')')
  }
  else {
    print('( ')
    printList(arr)
    print('\n)')
  }
}

function printFunctionExpression (ast) {
  print('function ')
  printName(ast.name)
  print(' ')
  printListParens(ast.argnames)
  print(' ')
  printBlock(ast.body, true)
}

function printFunctionDefinition (ast) {
  print('function ')
  printName(ast.name)
  printListParens(ast.argnames)
  print(' ')
  printBlock(ast.body, true)
}

function printReturn (ast) {
  print('return')
  if (ast.value) {
    print(' ')
    printExpression(ast.value)
  }
}

function printThrow (ast) {
  print('throw')
  if (ast.value) {
    print(' ')
    printExpression(ast.value)
  }
}

function printBreak (ast) {
  print('break')
  if (ast.value) {
    print(' ')
    printExpression(ast.value)
  }
}

function printContinue (ast) {
  print('continue')
  if (ast.value) {
    print(' ')
    printExpression(ast.value)
  }
}

function printIf(ast) {
  print('if ')
  printExpressionParens(ast.condition)
  print(' ')
  printBlock(ast.consequent, !!ast.alternative)
  if (ast.alternative) {
    printSep()
    print('else ')
    printBlock(ast.alternative, true)
  }
}

function printSwitch (ast) {
  print('switch ')
  printExpressionParens(ast.expression)
  print(' ')
  printSwitchBlock(ast.body)
}

function printSwitchBlock (arr) {
  print('{\n')
  printStatements(arr)
  print('}')
}

function caseBodyOneLine (arr) {
  pushBuffer(true)
  printCaseBody(arr ,true)
  var rv = bufferOneLine()
  popBuffer()
  return rv
}

function printCaseBody (arr ,oneLine) {
  if (oneLine) {
    print('\n')
    printStatements(arr, true)
  }
  else {
    print(' ')
    printStatements(arr)
  }
}

function printCaseBodyBlock (arr) {
  printCaseBody(arr ,caseBodyOneLine(arr))
}
function printDefault (ast) {
  print('default:')
  printCaseBodyBlock(ast.body)
}

function printCase (ast) {
  print('case ')
  printExpression(ast.expression)
  print(':')
  printCaseBodyBlock(ast.body)
}

function printTry (ast) {
  print('try')
  printBlock(ast.btry, true)
  if (ast.bcatch) {
    print('\n')
    print('catch ')
    printExpressionParens(ast.bcatch.argname)
    print(' ')
    printBlock(ast.bcatch.body, true)
  }
  if (ast.bfinally) {
    print('\n')
    print('finally ')
    printBlock(ast.bfinally.body, true)
  }
}

function printVarDefs(arr) {
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) print ('\n,')
    printName(arr[i].name)
    if (arr[i].value && arr[i].value) {
      print(' = ')
      printExpression(arr[i].value)
    }
  }
}

function printVar (ast) {
  print('var ')
  printVarDefs(ast.definitions)
}

function printConst (ast) {
  print('const ')
  printVarDefs(ast.definitions)
}

function printStatements (arr, oneLine) {
  if (arr.length < 1) return
  for (var i = 0 ,l = arr.length ;i < l - 1 ;i++) {
    if (i) printSep(oneLine)
    printStatement(arr[i])
  }
}

function printExpression (ast ,oneLine) {
  print('\'Expression!\'')
}

function printExpressionStatement (ast) {
  printExpression(ast)
}

function printStatement (ast) {
  if (!ast || !ast.__type) return
  switch (ast.__type) {
    case 'EmptyStatement': printEmptyStatement() ;break
    case 'SimpleStatement': printExpressionStatement(ast) ;break
    case 'BlockStatement': printBlock(ast) ;break
    case 'Do': printDo(ast) ;break
    case 'While': printWhile(ast) ;break
    case 'For': printFor(ast) ;break
    case 'ForIn': printForIn(ast) ;break
    case 'With': printWith(ast) ;break
    case 'Function': printFunctionExpression(ast) ;break
    case 'Defun': printFunctionDefinition(ast) ;break
    case 'Return': printReturn(ast) ;break
    case 'Throw': printThrow(ast) ;break
    case 'Break': printBreak(ast) ;break
    case 'Continue': printContinue(ast) ;break
    case 'If': printIf(ast) ;break
    case 'Switch': printSwitch(ast) ;break
    case 'SwitchBlock': printSwitchBlock(ast) ;break
    case 'Default': printDefault(ast) ;break
    case 'Case': printCase(ast) ;break
    case 'Try': printTry(ast) ;break
    case 'Var': printVar(ast) ;break
    case 'Const': printConst(ast) ;break
    default: throw('Crazy node detected!')
  }
}

function npmStyle (ast) {
  if (!ast) return ''
  printStatements(ast.body)
  return workingString
}

module.exports = npmStyle
