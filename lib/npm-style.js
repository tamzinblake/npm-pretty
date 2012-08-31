/* global require module */

var util = require('util')
  , unicode = require('./unicode')
  , workingStack = []
  , workingString = ''
  , options = { oneLine: true
              , lineLength: 70
              }

function defaults (obj ,opts) {
  console.log(typeof opts, typeof opts != "Object")
  if (typeof opts != "Object") opts = {}
  if (typeof obj != "Object") obj = {}
  for (var i in opts) {
    if (obj[i] === undefined) obj[i] = opts[i]
  }
  return obj
}

function pushBuffer (opts) {
  opts = defaults(opts)
  var str = ''
  if (opts.saveLine) str = workingString.replace(/([^\n]*\n)*(.*)$/gm ,'$2')
  workingStack.push(workingString)
  workingString = str
}

function popBuffer () {
  var rv = workingString
  workingString = workingStack.pop()
  return rv
}

function bufferOneLine () {
  return workingString.length < options.lineLength && !/\n/m.test(workingString)
}

function print (str) {
  workingString += str
}

function printRawString (str) {
  str = str.toString()
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

function printString (ast) {
  printRawString(ast.value)
}

function printSep (opts) {
  opts = defaults(opts)
  if (opts.oneLine) {
    print(' ;')
  }
  else {
    print('\n')
  }
}

function printNumber (ast) {
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
  pushBuffer({saveLine: true})
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

function printBlock (ast ,opts) {
  opts = defaults(opts)
  if (!ast.body.length) {
    if (opts.required) {
      printEmptyBlock()
    }
    else {
      printEmptyStatement()
    }
  }
  else if (blockOneLine(ast ,4)) {
    if (opts.required) {
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
  pushBuffer({saveLine: true})
  printExpression(ast ,{oneLine:true})
  var rv = bufferOneLine()
  popBuffer()
  return rv
}

function printExpressionParens (ast ,opts) {
  opts = defaults(opts)
  if (opts.firstInStatement) print(';')
  if (expressionOneLine(ast ,2)) {
    print('(')
    printExpression(ast ,{oneLine:true})
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
  print('for (')
  printForInit(ast.init ,ast.condition ,ast.step)
  print(') ')
  if (ast.body.length) {
    printBlock(ast.body)
  }
  else {
    printStatement(ast.body)
  }
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

function listOneLine (arr ,n) {
  pushBuffer({saveLine: true})
  printList(arr ,{oneLine:true})
  var rv = bufferOneLine()
  popBuffer()
  return rv
}

function printList (arr ,oneLine) {
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

function printListParens (arr ,opts) {
  opts = defaults(opts ,{ leftParen: '('
                        , rightParen: ')'
                        })
  if (listOneLine(arr ,2)) {
    print(opts.leftParen)
    printList(arr ,{oneLine: true})
    print(opts.rightParen)
  }
  else {
    print(opts.leftParen + ' ')
    printList(arr)
    print('\n' + opts.rightParen)
  }
}

function printFunctionExpression (ast ,opts) {
  opts = defaults(opts)
  print('function ')
  if (ast.name) printName(ast.name)
  print(' ')
  printListParens(ast.argnames)
  print(' ')
  printBlock(ast.body ,{required: true})
}

function printFunctionDefinition (ast) {
  print('function ')
  printName(ast.name)
  printListParens(ast.argnames)
  print(' ')
  printBlock(ast.body ,{required: true})
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
  printBlock(ast.consequent ,!!ast.alternative)
  if (ast.alternative) {
    printSep()
    print('else ')
    printBlock(ast.alternative ,{required: true})
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
  pushBuffer({saveLine: true})
  printCaseBody(arr ,{oneLine: true})
  var rv = bufferOneLine()
  popBuffer()
  return rv
}

function printCaseBody (arr ,opts) {
  defaults(opts)
  if (opts.oneLine) {
    print('\n')
    printStatements(arr ,{oneLine: true})
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
  printBlock(ast.btry ,{required: true})
  if (ast.bcatch) {
    print('\n')
    print('catch ')
    printExpressionParens(ast.bcatch.argname)
    print(' ')
    printBlock(ast.bcatch.body ,{required: true})
  }
  if (ast.bfinally) {
    print('\n')
    print('finally ')
    printBlock(ast.bfinally.body ,{required: true})
  }
}

function printVarDefs (arr) {
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) print ('\n, ')
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

function printBinaryOp (operator ,first ,second ,opts) {
  opts = defaults(opts)
  printExpression(first)
  if (!opts.noSpace1)
    print(' ')
  print(operator)
  if (!opts.noSpace2)
    print(' ')
  printExpression(second)
}

function printBinary (ast) {
  printBinaryOp(ast.operator ,ast.left ,ast.right)
}

function printDot (ast) {
  printExpression(ast.expression)
  print('.')
  print(ast.property)
}

function printSub (ast) {
  printExpression(ast.expression)
  print('[')
  printExpression(ast.property)
  print(']')
}

function printSeq (ast) {
  printBinaryOp(',' ,ast.first ,ast.second ,{noSpace2: true})
}

function printUnaryPrefix (ast) {
  print(ast.operator)
  printExpression(ast.expression)
}

function printUnaryPostfix (ast) {
  printExpression(ast.expression)
  print(ast.operator)
}

function printArray (ast ,opts) {
  opts = defaults(opts)
  if (opts.firstInStatement) print(';')
  printListParens(ast.elements ,'[' ,']')
}

function printObject (ast) {
  printListParens(ast.properties ,'{' ,'}')
}

function printObjectKeyval (ast) {
  if (unicode.isIdentifier(ast.key)) {
    print(ast.key)
  }
  else {
    printRawString(ast.key)
  }
  print(': ')
  printExpression(ast.value)
}

function printObjectSetter (ast) {
  print('set ')
  printExpression(ast.value)
}

function printObjectGetter (ast) {
  print('get ')
  printExpression(ast.value)
}

function printRegexp (ast) {
  print(' \'Regexp!\' ')
}

function printCall (ast) {
  printExpression(ast.expression)
  printListParens(ast.args)
}

function printConditional (ast) {
  printExpression(ast.condition)
  print(' ? ')
  printExpression(ast.consequent)
  print(' : ')
  printExpression(ast.alternative)
}

function printStatements (arr ,opts) {
  opts = defaults(opts)
  if (arr.length < 1) return
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) printSep(opts)
    printStatement(arr[i])
  }
}

function printExpression (ast ,opts) {
  opts = defaults(opts)
  if (!ast || !ast.__type) return
  switch (ast.__type) {
    case 'Function': printFunctionExpression(ast ,opts) ;break
    case 'Var': printVar(ast) ;break
    case 'Const': printConst(ast) ;break
    case 'Seq': printSeq(ast) ;break
    case 'Dot': printDot(ast) ;break
    case 'Sub': printSub(ast) ;break
    case 'UnaryPrefix': printUnaryPrefix(ast) ;break
    case 'UnaryPostfix': printUnaryPostfix(ast) ;break
    case 'Binary':
    case 'Assign': printBinary(ast) ;break
    case 'Array': printArray(ast ,opts) ;break
    case 'Object': printObject(ast) ;break
    case 'ObjectKeyval': printObjectKeyval(ast) ;break
    case 'ObjectSetter': printObjectSetter(ast) ;break
    case 'ObjectGetter': printObjectGetter(ast) ;break
    case 'SymbolVar':
    case 'SymbolFunarg':
    case 'SymbolDefun':
    case 'SymbolLambda':
    case 'SymbolCatch':
    case 'Label':
    case 'SymbolRef':
    case 'LabelRef': printName(ast) ;break
    case 'This': print('this') ;break
    case 'Constant': print('constant') ;break
    case 'String': printString(ast) ;break
    case 'Number': printNumber(ast) ;break
    case 'Regexp': printRegexp(ast) ;break
    case 'Null': print('null') ;break
    case 'Undefined': print('undefined') ;break
    case 'False': print('false') ;break
    case 'True': print('true') ;break
    case 'Call': printCall(ast) ;break
    case 'Conditional': printConditional(ast) ;break
    default: print('\'Crazy expression detected!: ' + ast.__type + '\'')
  }
}

function printExpressionStatement (ast) {
  printExpression(ast.body ,{firstInStatement: true})
}

function printStatement (ast ,opts) {
  opts = defaults(opts)
  if (!ast || !ast.__type) return
  switch (ast.__type) {
    case 'EmptyStatement': printEmptyStatement() ;break
    case 'Function':
    case 'SimpleStatement': printExpressionStatement(ast) ;break
    case 'BlockStatement': printBlock(ast) ;break
    case 'Do': printDo(ast) ;break
    case 'While': printWhile(ast) ;break
    case 'For': printFor(ast) ;break
    case 'ForIn': printForIn(ast) ;break
    case 'With': printWith(ast) ;break
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
    default: print('\'Crazy statement detected!: ' + ast.__type + '\'')
  }
}

function npmStyle (ast) {
  if (!ast) return ''
  printStatements(ast.body)
  print('\n')
  return workingString
}

module.exports = npmStyle
