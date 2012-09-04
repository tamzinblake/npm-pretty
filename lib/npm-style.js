/* global require module */

var util = require('util')
  , unicode = require('./unicode')
  , options = { oneLine: true
              , lineLength: 70
              }

function defaults (obj ,opts) {
  if (typeof opts != "object") opts = {}
  if (typeof obj != "object") obj = {}
  for (var i in opts) {
    if (obj[i] === undefined) obj[i] = opts[i]
  }
  return obj
}

var print = function (str) {
  print.printedSomething = true
  print.workspace += str
}

print.stack = []
print.workspace = ''
print.printedSomething = false

print.output = function () {
  return print.workspace
}

print.pushBuffer = function (opts) {
  opts = defaults(opts)
  var str = ''
  if (opts.saveLine) {
    str = print.workspace.replace(/([^\n]*\n)*(.*)$/gm ,'$2')
  }
  print.stack.push(print.workspace)
  print.workspace = str
}

print.popBuffer = function () {
  var rv = print.workspace
  print.workspace = print.stack.pop()
  return rv
}

print.isOneLine =
  { buffer: function () {
      return print.workspace.length < options.lineLength
          && !/\n/m.test(print.workspace)
    }
  , expression: function (ast ,n) {
      print.pushBuffer({saveLine: true})
      print.expression(ast ,{oneLine:true})
      var rv = print.isOneLine.buffer()
      print.popBuffer()
      return rv
    }
  , list: function (arr ,n) {
      print.pushBuffer({saveLine: true})
      print.list(arr ,{oneLine:true})
      var rv = print.isOneLine.buffer()
      print.popBuffer()
      return rv
    }
  , block: function (ast ,n) {
      if (!options.oneLine) return false
      if (!ast.body.length) return true
      if (ast.body.length > 1) return false
      print.pushBuffer({saveLine: true})
      for (var i = 0 ;i < n ;i++) {
        print(' ')
      }
      print.statement(ast.body[0])
      var rv = print.isOneLine.buffer()
      print.popBuffer()
      return rv
    }
  , caseBody: function (arr) {
      print.pushBuffer({saveLine: true})
      print.caseBody(arr ,{oneLine: true})
      var rv = print.isOneLine.buffer()
      print.popBuffer()
      return rv
    }
  }

print.newline = function (str) {
  print.printedSomething = false
  print("\n")
}

print.rawString = function (str) {
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

print.string = function (ast) {
  print.rawString(ast.value)
}

print.sep = function (opts) {
  opts = defaults(opts)
  if (opts.oneLine) {
    print(' ;')
  }
  else {
    print('\n')
  }
}

print.number = function (ast) {
  print(+ast.value)
}

print.name = function (ast) {
  print(ast.name.toString())
}

print.debugger = function (ast) {
  print('debugger')
  print.sep()
}

print.emptyBlock = function () {
  print('{}')
}

print.emptyStatement = function () {
  print(';')
}

print.block = function (ast ,opts) {
  opts = defaults(opts)
  if (!ast.body.length) {
    if (opts.required) {
      print.emptyBlock()
    }
    else {
      print.emptyStatement()
    }
  }
  else if (print.isOneLine.block(ast ,4)) {
    if (opts.required) {
      print('{ ')
      print.statement(ast.body[0])
      print(' }')
    }
    else {
      print.statement(ast.body[0])
    }
  }
  else {
    print('{\n')
    print.statements(ast.body)
    print.sep()
    print('}')
  }
}


print.expressionParens = function (ast ,opts) {
  opts = defaults(opts)
  if (opts.firstInStatement) print(';')
  if (print.isOneLine.expression(ast ,2)) {
    print('(')
    print.expression(ast ,{oneLine:true})
    print(')')
  }
  else {
    print('( ')
    print.expression(ast)
    print('\n)')
  }
}

print.doStatement = function (ast) {
  print('do ')
  print.statement(ast.body)
  print(' while')
  print.expressionParens(ast.condition)
}

print.whileStatement = function (ast) {
  print('while ')
  print.expressionParens(ast.condition)
  print(' ')
  print.statement(ast.body)
}

print.forInit = function (init ,condition ,step) {
  if (init) print.expression(init)
  print(' ;')
  if (condition) print.expression(condition)
  print(' ;')
  if (step) print.expression(step)
}

print.forStatement = function (ast) {
  print('for (')
  print.forInit(ast.init ,ast.condition ,ast.step)
  print(') ')
  if (ast.body.length) {
    print.block(ast.body)
  }
  else {
    print.statement(ast.body)
  }
}

print.forIn = function (ast) {
  print('for (')
  print.expression(ast.init)
  print(' in ')
  print.expression(ast.object)
  print(') ')
  print.block(ast.body)
}

print.withStatement = function (ast) {
  print('with ')
  print.expressionParens(ast.expression)
  print(' ')
  print.block(ast.body)
}

print.list = function (arr ,oneLine) {
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) {
      if (oneLine) {
        print(' ,')
      }
      else {
        print('\n, ')
      }
    }
    print.expression(arr[i])
  }
}

print.listParens = function (arr ,opts) {
  opts = defaults(opts ,{ leftParen: '('
                        , rightParen: ')'
                        })
  if (print.isOneLine.list(arr ,2)) {
    print(opts.leftParen)
    print.list(arr ,{oneLine: true})
    print(opts.rightParen)
  }
  else {
    print(opts.leftParen + ' ')
    print.list(arr)
    print('\n' + opts.rightParen)
  }
}

print.functionExpression = function (ast ,opts) {
  opts = defaults(opts)
  print('function ')
  if (ast.name) print.name(ast.name)
  print(' ')
  print.listParens(ast.argnames)
  print(' ')
  print.block(ast.body ,{required: true})
}

print.functionDefinition = function (ast) {
  print('function ')
  print.name(ast.name)
  print.listParens(ast.argnames)
  print(' ')
  print.block(ast.body ,{required: true})
}

print.returnStatement = function (ast) {
  print('return')
  if (ast.value) {
    print(' ')
    print.expression(ast.value)
  }
}

print.throwStatement = function (ast) {
  print('throw')
  if (ast.value) {
    print(' ')
    print.expression(ast.value)
  }
}

print.breakStatement = function (ast) {
  print('break')
  if (ast.value) {
    print(' ')
    print.expression(ast.value)
  }
}

print.continueStatement = function (ast) {
  print('continue')
  if (ast.value) {
    print(' ')
    print.expression(ast.value)
  }
}

print.ifStatement = function(ast) {
  print('if ')
  print.expressionParens(ast.condition)
  print(' ')
  print.block(ast.consequent ,!!ast.alternative)
  if (ast.alternative) {
    print.sep()
    print('else ')
    print.block(ast.alternative ,{required: true})
  }
}

print.switchStatement = function (ast) {
  print('switch ')
  print.expressionParens(ast.expression)
  print(' ')
  print.switchBlock(ast.body)
}

print.switchBlock = function (arr) {
  print('{\n')
  print.statements(arr)
  print('}')
}

print.caseBody = function (arr ,opts) {
  defaults(opts)
  if (opts.oneLine) {
    print('\n')
    print.statements(arr ,{oneLine: true})
  }
  else {
    print(' ')
    print.statements(arr)
  }
}

print.caseBodyBlock = function (arr) {
  print.caseBody(arr ,print.isOneLine.caseBody(arr))
}
function printDefault (ast) {
  print('default:')
  print.caseBodyBlock(ast.body)
}

print.caseStatement = function (ast) {
  print('case ')
  print.expression(ast.expression)
  print(':')
  print.caseBodyBlock(ast.body)
}

print.tryStatement = function (ast) {
  print('try')
  print.block(ast.btry ,{required: true})
  if (ast.bcatch) {
    print('\n')
    print('catch ')
    print.expressionParens(ast.bcatch.argname)
    print(' ')
    print.block(ast.bcatch.body ,{required: true})
  }
  if (ast.bfinally) {
    print('\n')
    print('finally ')
    print.block(ast.bfinally.body ,{required: true})
  }
}

print.varDefs = function (arr) {
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) print ('\n, ')
    print.name(arr[i].name)
    if (arr[i].value && arr[i].value) {
      print(' = ')
      print.expression(arr[i].value)
    }
  }
}

print.varStatement = function (ast) {
  print('var ')
  print.varDefs(ast.definitions)
}

print.constStatement = function (ast) {
  print('const ')
  print.varDefs(ast.definitions)
}

print.binaryOp = function (operator ,first ,second ,opts) {
  opts = defaults(opts)
  print.expression(first)
  if (!opts.noSpace1)
    print(' ')
  print(operator)
  if (!opts.noSpace2)
    print(' ')
  print.expression(second)
}

print.binary = function (ast) {
  print.binaryOp(ast.operator ,ast.left ,ast.right)
}

print.dot = function (ast) {
  print.expression(ast.expression)
  print('.')
  print(ast.property)
}

print.sub = function (ast) {
  print.expression(ast.expression)
  print('[')
  print.expression(ast.property)
  print(']')
}

print.seq = function (ast) {
  print.binaryOp(',' ,ast.first ,ast.second ,{noSpace2: true})
}

print.unaryPrefix = function (ast) {
  print(ast.operator)
  print.expression(ast.expression)
}

print.unaryPostfix = function (ast) {
  print.expression(ast.expression)
  print(ast.operator)
}

print.array = function (ast ,opts) {
  opts = defaults(opts)
  if (opts.firstInStatement) print(';')
  print.listParens(ast.elements ,'[' ,']')
}

print.object = function (ast) {
  print.listParens(ast.properties ,'{' ,'}')
}

print.objectKeyval = function (ast) {
  if (unicode.isIdentifier(ast.key)) {
    print(ast.key)
  }
  else {
    print.rawString(ast.key)
  }
  print(': ')
  print.expression(ast.value)
}

print.objectSetter = function (ast) {
  print('set ')
  print.expression(ast.value)
}

print.objectGetter = function (ast) {
  print('get ')
  print.expression(ast.value)
}

print.regexp = function (ast) {
  print('/')
  print(ast.pattern)
  print('/')
  if (ast.mods) print(ast.mods)
}

print.call = function (ast) {
  print.expression(ast.expression)
  print.listParens(ast.args)
}

print.conditional = function (ast) {
  print.expression(ast.condition)
  print(' ? ')
  print.expression(ast.consequent)
  print(' : ')
  print.expression(ast.alternative)
}

print.statements = function (arr ,opts) {
  opts = defaults(opts)
  if (arr.length < 1) return
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) print.sep(opts)
    print.statement(arr[i])
  }
}

print.expression = function (ast ,opts) {
  opts = defaults(opts)
  if (!ast || !ast.__type) return
  switch (ast.__type) {
    case 'Function': print.functionExpression(ast ,opts) ;break
    case 'Var': print.varStatement(ast) ;break
    case 'Const': print.constStatement(ast) ;break
    case 'Seq': print.seq(ast) ;break
    case 'Dot': print.dot(ast) ;break
    case 'Sub': print.sub(ast) ;break
    case 'UnaryPrefix': print.unaryPrefix(ast) ;break
    case 'UnaryPostfix': print.unaryPostfix(ast) ;break
    case 'Binary':
    case 'Assign': print.binary(ast) ;break
    case 'Array': print.array(ast ,opts) ;break
    case 'Object': print.object(ast) ;break
    case 'ObjectKeyval': print.objectKeyval(ast) ;break
    case 'ObjectSetter': print.objectSetter(ast) ;break
    case 'ObjectGetter': print.objectGetter(ast) ;break
    case 'SymbolVar':
    case 'SymbolFunarg':
    case 'SymbolDefun':
    case 'SymbolLambda':
    case 'SymbolCatch':
    case 'Label':
    case 'SymbolRef':
    case 'LabelRef': print.name(ast) ;break
    case 'This': print('this') ;break
    case 'Constant': print('constant') ;break
    case 'String': print.string(ast) ;break
    case 'Number': print.number(ast) ;break
    case 'Regexp': print.regexp(ast) ;break
    case 'Null': print('null') ;break
    case 'Undefined': print('undefined') ;break
    case 'False': print('false') ;break
    case 'True': print('true') ;break
    case 'Call': print.call(ast) ;break
    case 'Conditional': print.conditional(ast) ;break
    default: print('\'Unknown expression: ' + ast.__type + '\'') ;print.sep()
  }
}

print.expressionStatement = function (ast) {
  print.expression(ast.body ,{firstInStatement: true})
}

print.statement = function (ast ,opts) {
  opts = defaults(opts)
  if (!ast || !ast.__type) return
  print.printedSomething = false
  switch (ast.__type) {
    case 'EmptyStatement': print.emptyStatement() ;break
    case 'Function':
    case 'SimpleStatement': print.expressionStatement(ast) ;break
    case 'BlockStatement': print.block(ast) ;break
    case 'Do': print.doStatement(ast) ;break
    case 'While': print.whileStatement(ast) ;break
    case 'For': print.forStatement(ast) ;break
    case 'ForIn': print.forIn(ast) ;break
    case 'With': print.withStatement(ast) ;break
    case 'Defun': print.functionDefinition(ast) ;break
    case 'Return': print.returnStatement(ast) ;break
    case 'Throw': print.throwStatement(ast) ;break
    case 'Break': print.breakStatement(ast) ;break
    case 'Continue': print.continueStatement(ast) ;break
    case 'If': print.ifStatement(ast) ;break
    case 'Switch': print.switchStatement(ast) ;break
    case 'SwitchBlock': print.switchBlock(ast) ;break
    case 'Default': printDefault(ast) ;break
    case 'Case': print.caseStatement(ast) ;break
    case 'Try': print.tryStatement(ast) ;break
    case 'Var': print.varStatement(ast) ;break
    case 'Const': print.constStatement(ast) ;break
    default: print('\'Unknown statement: ' + ast.__type + '\'') ;print.sep()
  }
}

function npmStyle (ast) {
  if (!ast) return ''
  print.statements(ast.body)
  print('\n')
  return print.output()
}

module.exports = npmStyle
