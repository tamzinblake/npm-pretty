/* global require module */

var util = require('util')
  , unicode = require('./unicode')
  , options = { oneLine: true
              , lineLength: 70
              , indentSpaces: 2
              }

function defaults (obj ,opts) {
  if (typeof opts != 'object') opts = {}
  if (typeof obj != 'object') obj = {}
  for (var i in opts) {
    if (obj[i] === undefined) obj[i] = opts[i]
  }
  return obj
}

function precedence (type ,op) {
  switch (type) {
    case 'Dot':
    case 'Sub':
    case 'New': return 1
    case 'Call': return 2
    case 'UnaryPrefix':
    case 'UnaryPostfix': switch (op) {
      case '++':
      case '--': return 3
      case '!':
      case '~':
      case '+':
      case '-':
      case 'typeof':
      case 'void':
      case 'delete': return 4
      default: return 0
    }
    case 'Binary':
    case 'Assign': switch (op) {
      case '*':
      case '/':
      case '%': return 5
      case '+':
      case '-': return 6
      case '<<':
      case '>>':
      case '>>>': return 7
      case '<':
      case '<=':
      case '>':
      case '>=':
      case 'in':
      case 'instanceof':  return 8
      case '==':
      case '!=':
      case '===':
      case '!==': return 9
      case '&': return 10
      case '^': return 11
      case '|': return 12
      case '&&': return 13
      case '||': return 14
      case 'yield': return 16
      case '=':
      case '+=':
      case '-=':
      case '*=':
      case '/=':
      case '%=':
      case '<<=':
      case '>>=':
      case '>>>=':
      case '&=':
      case '^=':
      case '|=': return 17
      default: return 0
    }
    case 'Conditional': return 15
    case 'Seq': return 18
    default: return 0
  }
}

var print = function (str) {
  print.printedSomething = true
  print.buffer += str
}

print.comments = []
print.stack = []
print.buffer = ''
print.printedSomething = false
print.assigning = false

var parens = {}

print.make = function (type ,fn) {
  print[type] = function (obj ,opts) {
    if (obj && obj.start && obj.start.comments_before)
      print.commentsBefore(obj.start.comments_before)
    var p = parens[type] && parens[type](obj ,opts)
    if (p && !print.printedSomething) print(';')
    if (p) print('(')
    fn(obj ,opts)
    if (p) print(')')
  }
}

print.stripSpaces = function () {
  print.buffer = print.buffer.replace(/[ ]*\n/gm ,'\n')
}

print.output = function () {
  print.stripSpaces()
  return print.buffer
}

print.pushBuffer = function (opts) {
  opts = defaults(opts)
  var str = ''
  if (opts.saveLine) {
    str = print.buffer.replace(/([^\n]*\n)*(.*)$/gm ,'$2')
  }
  print.stack.push(print.buffer)
  print.buffer = str
}

print.popBuffer = function () {
  var rv = print.buffer
  print.buffer = print.stack.pop()
  return rv
}

print.col = function () {
  print.pushBuffer({saveLine: true})
  var rv = print.buffer.length
  print.popBuffer()
  return rv
}

print.comment1 = function (obj) {
  if (print.comments[obj.pos]) return
  print.comments[obj.pos] = true
  print('//')
  print(obj.value)
  print.newline()
}

print.comment2 = function (obj) {
  if (print.comments[obj.pos]) return
  print.comments[obj.pos] = true
  print('/*')
  print(obj.value)
  print('*/ ')
}

print.commentsBefore = function (arr) {
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    print[arr[i].type](arr[i])
  }
}

print.isOneLine =
  { buffer: function () {
      return print.buffer.length < options.lineLength
          && !/\n/m.test(print.buffer)
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
      if (!ast.body || !ast.body.length) return true
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
  , binary: function (operator ,opts) {
      opts = defaults(opts)
      print.pushBuffer({saveLine: true})
      print.expression(opts.first)
      if (!opts.noSpace1)
        print(' ')
      print(operator)
      if (!opts.noSpace2)
        print(' ')
      print.expression(opts.second)
      var rv = print.isOneLine.buffer()
      print.popBuffer()
      return rv
    }
  }

print.indentation = 0
print.indentStack = []
print.incIndent = function (n) {
  print.indentStack.push(print.indentation)
  if (n !== undefined) {
    print.indentation += n
  }
  else {
    print.indentation += options.indentSpaces
  }
}

print.setIndent = function (n) {
  print.indentStack.push(print.indentation)
  if (n !== undefined) {
    n = n < 0 ? 0 : n
    print.indentation = n
  }
}

print.decIndent = function () {
  if (print.indentStack.length) {
    print.indentation = print.indentStack.pop()
  }
  else {
    print.indentation = 0
  }
}

print.make('indent' ,function () {
  for (var i = 0 ;i < print.indentation ;i++) {
    print(' ')
  }
})

print.make('eof' ,function () {
  print('\n')
})

print.make('newline' ,function () {
  print.printedSomething = false
  print.assigning = false
  print('\n')
  print.indent()
})

print.make('rawString' ,function (str) {
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
})

print.make('string' ,function (ast) {
  print.rawString(ast.value)
})

print.make('sep' ,function (ast ,opts) {
  opts = defaults(opts)
  if (opts.oneLine) {
    print(' ;')
  }
  else {
    print.newline()
  }
})

print.make('number' ,function (ast) {
  print(+ast.value)
})

print.make('nameNode' ,function (ast) {
  print(ast.name.toString())
})

print.make('debuggerStatement' ,function (ast) {
  print('debugger')
  print.sep()
})

print.make('emptyBlock' ,function () {
  print('{}')
})

print.make('emptyStatement' ,function (ast ,opts) {
  opts = defaults(opts)
  if (!opts.noForce)
    print(';')
})

print.make('block' ,function (ast ,opts) {
  opts = defaults(opts)
  if (!ast.body || !ast.body.length) {
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
      print.statement(ast.body[0] ,{noForce: true})
      print(' }')
    }
    else {
      print.statement(ast.body[0])
    }
  }
  else {
    print('{')
    print.incIndent()
    print.newline()
    print.statements(ast.body ,{noForce: true})
    print.decIndent()
    print.sep()
    print('}')
  }
})

print.make('expressionParens' ,function (ast ,opts) {
  opts = defaults(opts)
  if (!print.printedSomething) print(';')
  if (print.isOneLine.expression(ast ,2)) {
    print('(')
    print.expression(ast ,{oneLine: true})
    print(')')
  }
  else {
    print('( ')
    print.incIndent()
    print.expression(ast)
    print.decIndent()
    print.newline()
    print(')')
  }
})

print.make('doStatement' ,function (ast) {
  print('do ')
  print.statement(ast.body)
  print(' while')
  print.expressionParens(ast.condition)
})

print.make('whileStatement' ,function (ast) {
  print('while ')
  print.expressionParens(ast.condition)
  print(' ')
  print.statement(ast.body)
})

print.make('forInit' ,function (ast) {
  if (ast.init) print.expression(ast.init)
  print(' ;')
  if (ast.condition) print.expression(ast.condition)
  print(' ;')
  if (ast.step) print.expression(ast.step)
})

print.make('forStatement' ,function (ast) {
  print('for (')
  print.forInit(ast)
  print(') ')
  if (ast.body.length) {
    print.block(ast.body)
  }
  else {
    print.statement(ast.body)
  }
})

print.make('forIn' ,function (ast) {
  print('for (')
  print.expression(ast.init)
  print(' in ')
  print.expression(ast.object)
  print(') ')
  print.block(ast.body)
})

print.make('withStatement' ,function (ast) {
  print('with ')
  print.expressionParens(ast.expression)
  print(' ')
  print.block(ast.body)
})

print.make('list' ,function (arr ,oneLine) {
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) {
      if (oneLine) {
        print(' ,')
      }
      else {
        print.newline()
        print(', ')
      }
    }
    print.setIndent(print.col())
    print.expression(arr[i])
    print.decIndent()
  }
})

print.make('listParens' ,function (arr ,opts) {
  opts = defaults(opts ,{ leftParen: '('
                        , rightParen: ')'
                        })
  if (!print.printedSomething) print(';')
  if (print.isOneLine.list(arr ,2)) {
    print(opts.leftParen)
    print.list(arr ,{oneLine: true})
    print(opts.rightParen)
  }
  else {
    print.setIndent(print.col())
    print(opts.leftParen)
    print(' ')
    print.list(arr)
    print.newline()
    print(opts.rightParen)
    print.decIndent()
  }
})

parens.functionExpression = function (ast ,opts) {
  return !print.printedSomething
}

print.make('functionExpression' ,function (ast ,opts) {
  opts = defaults(opts)
  print('function ')
  if (ast.name) {
    print.nameNode(ast.name)
    print(' ')
  }
  print.listParens(ast.argnames)
  print(' ')
  print.block(ast.body ,{required: true})
})

print.make('functionDefinition' ,function (ast) {
  print('function ')
  print.nameNode(ast.name)
  print.listParens(ast.argnames)
  print(' ')
  print.block(ast.body ,{required: true})
})

print.make('newExpression' ,function (ast) {
  print('new ')
  print.expression(ast.expression)
  if (ast.args && ast.args.length) {
    print.listParens(ast.args)
  }
})

print.make('returnStatement' ,function (ast) {
  print('return')
  if (ast.value) {
    print(' ')
    print.expression(ast.value)
  }
})

print.make('throwStatement' ,function (ast) {
  print('throw')
  if (ast.value) {
    print(' ')
    print.expression(ast.value)
  }
})

print.make('breakStatement' ,function (ast) {
  print('break')
  if (ast.value) {
    print(' ')
    print.expression(ast.value)
  }
})

print.make('continueStatement' ,function (ast) {
  print('continue')
  if (ast.value) {
    print(' ')
    print.expression(ast.value)
  }
})

print.make('ifStatement' ,function(ast) {
  print('if ')
  print.expressionParens(ast.condition)
  print(' ')
  print.block(ast.consequent ,!!ast.alternative)
  if (ast.alternative) {
    print.sep()
    print('else ')
    print.block(ast.alternative ,{required: true})
  }
})

print.make('switchStatement' ,function (ast) {
  print('switch ')
  print.expressionParens(ast.expression)
  print(' ')
  print.switchBlock(ast.body ,{noForce: true})
})

print.make('switchBlock' ,function (arr ,opts) {
  print('{')
  print.incIndent()
  print.newline()
  print.statements(arr ,opts)
  print.decIndent()
  print.sep()
  print('}')
})

print.make('caseBody' ,function (arr ,opts) {
  defaults(opts)
  if (opts.oneLine) {
    print(' ')
    print.statements(arr ,{oneLine: true})
  }
  else {
    print.incIndent()
    print.newline()
    print.statements(arr)
    print.decIndent()
  }
})

print.make('caseBodyBlock' ,function (arr) {
  print.caseBody(arr ,print.isOneLine.caseBody(arr))
})

print.make('defaultStatement' ,function (ast) {
  print('default:')
  print.caseBodyBlock(ast.body)
})

print.make('caseStatement' ,function (ast) {
  print('case ')
  print.expression(ast.expression)
  print(':')
  print.caseBodyBlock(ast.body)
})

print.make('tryStatement' ,function (ast) {
  print('try')
  print.block(ast.btry ,{required: true})
  if (ast.bcatch) {
    print.newline()
    print('catch ')
    print.expressionParens(ast.bcatch.argname)
    print(' ')
    print.block(ast.bcatch.body ,{required: true})
  }
  if (ast.bfinally) {
    print.newline()
    print('finally ')
    print.block(ast.bfinally.body ,{required: true})
  }
})

print.make('varDefs' ,function (arr) {
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) {
      print.newline()
      print(', ')
    }
    print.nameNode(arr[i].name)
    if (arr[i].value && arr[i].value) {
      print(' = ')
      print.setIndent(print.col())
      print.expression(arr[i].value)
      print.decIndent()
    }
  }
})

print.make('varStatement' ,function (ast) {
  print('var ')
  print.incIndent(2)
  print.varDefs(ast.definitions)
  print.decIndent()
})

print.make('constStatement' ,function (ast) {
  print('const ')
  print.varDefs(ast.definitions)
})

print.make('binaryOp' ,function (operator ,opts) {
  opts = defaults(opts)
  if (opts.oneLine || print.isOneLine.binary(operator ,opts)) {
    print[opts.firstParens ? 'expressionParens' : 'expression'](opts.first)
    if (!opts.noSpace1)
      print(' ')
    print(operator)
    if (!opts.noSpace2)
      print(' ')
    print[opts.secondParens ? 'expressionParens' : 'expression'](opts.second)
  }
  else {
    print.setIndent(print.col() - (operator.length + 1))
    print[opts.firstParens ? 'expressionParens' : 'expression'](opts.first)
    print.newline()
    print(operator)
    print(' ')
    print[opts.secondParens ? 'expressionParens' : 'expression'](opts.second)
    print.decIndent()
  }
})

print.make('binary' ,function (ast ,opts) {
  opts = defaults(opts)
  var firstParens = precedence(ast.__type ,ast.operator)
                  < precedence(ast.left.__type ,ast.left.operator)
    , secondParens = precedence(ast.__type ,ast.operator)
                   < precedence(ast.right.__type ,ast.right.operator)
  print.binaryOp(ast.operator ,{ first: ast.left
                               , firstParens: firstParens
                               , second: ast.right
                               , secondParens: secondParens
                               , oneLine: opts.oneLine
                               })
})

print.make('assign' ,function (ast ,opts) {
  if (print.assigning) {
    print.binary(ast)
  }
  else {
    print.assigning = true
    print.binary(ast ,{oneLine: true})
  }
})

print.make('dot' ,function (ast) {
  print.expression(ast.expression)
  print('.')
  print(ast.property)
})

print.make('sub' ,function (ast) {
  print.expression(ast.expression)
  print('[')
  print.expression(ast.property)
  print(']')
})

print.make('seq' ,function (ast) {
  print.binaryOp(',' ,{ first: ast.first
                      , second: ast.second
                      , noSpace2: true
                      })
})

print.make('unaryPrefix' ,function (ast) {
  print(ast.operator)
  print.expression(ast.expression)
})

print.make('unaryPostfix' ,function (ast) {
  print.expression(ast.expression)
  print(ast.operator)
})

print.make('array' ,function (ast ,opts) {
  opts = defaults(opts)
  print.listParens(ast.elements ,{leftParen: '[' ,rightParen: ']'})
})

print.make('object' ,function (ast) {
  print.listParens(ast.properties ,{leftParen: '{' ,rightParen: '}'})
})

print.make('objectKeyval' ,function (ast) {
  if (unicode.isIdentifier(ast.key)) {
    print(ast.key)
  }
  else {
    print.rawString(ast.key)
  }
  print(': ')
  print.setIndent(print.col())
  print.expression(ast.value)
  print.decIndent()
})

print.make('objectSetter' ,function (ast) {
  print('set ')
  print.expression(ast.value)
})

print.make('objectGetter' ,function (ast) {
  print('get ')
  print.expression(ast.value)
})

print.make('regexp' ,function (ast) {
  print('/')
  print(ast.pattern)
  print('/')
  if (ast.mods) print(ast.mods)
})

print.make('call' ,function (ast) {
  print.expression(ast.expression)
  print.listParens(ast.args)
})

print.make('conditional' ,function (ast) {
  print.expression(ast.condition)
  print(' ? ')
  print.expression(ast.consequent)
  print(' : ')
  print.expression(ast.alternative)
})

print.make('statements' ,function (arr ,opts) {
  opts = defaults(opts)
  if (arr.length < 1) return
  for (var i = 0 ,l = arr.length ;i < l ;i++) {
    if (i) print.sep('' ,opts)
    print.statement(arr[i] ,opts)
  }
})

print.make('expression' ,function (ast ,opts) {
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
    case 'Binary': print.binary(ast) ;break
    case 'Assign': print.assign(ast) ;break
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
    case 'LabelRef': print.nameNode(ast) ;break
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
    case 'New': print.newExpression(ast) ;break
    default: print('\'Unknown expression: ' + ast.__type + '\'') ;print.sep()
  }
})

print.make('expressionStatement' ,function (ast) {
  print.expression(ast.body)
})

print.make('statement' ,function (ast ,opts) {
  opts = defaults(opts)
  if (!ast || !ast.__type) return
  print.printedSomething = false
  switch (ast.__type) {
    case 'EmptyStatement': print.emptyStatement('' ,opts) ;break
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
    case 'Default': print.defaultStatement(ast) ;break
    case 'Case': print.caseStatement(ast) ;break
    case 'Try': print.tryStatement(ast) ;break
    case 'Var': print.varStatement(ast) ;break
    case 'Const': print.constStatement(ast) ;break
    default: print('\'Unknown statement: ' + ast.__type + '\'') ;print.sep()
  }
})

function npmStyle (ast) {
  if (!ast) return ''
  print.statements(ast.body ,{noForce: true})
  print.eof()
  return print.output()
}

module.exports = npmStyle
