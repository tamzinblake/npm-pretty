var foo = function () {
  var prettyLongVariableName = 'SomethingCrazy'
}

var bar = function () {
      var prettyLongVariableName = 'SomethingCrazy'
    }
  , baz = function () {
      var prettyLongVariableName = 'SomethingCrazy'
    }

function foom () {
  var x
  return 'function body!'
}

;(function () {
  var x
  return x
})()

foo(function () {
  var x
  return 'foo'
})

foo.bar(function () {
  var x
  return 'foo'
})

var x = foo
        .bar(function () {
          var x
          foo()
        })
