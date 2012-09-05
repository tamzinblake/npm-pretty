//comment before function foo
function foo (bar) {
  //comment in function foo before variable declaration baz
  var baz = /* multiline comment before bar */ bar + 1
  return baz
}

;(function (bar) {
  var baz = bar + 1
  return baz
})(1)

var a
  , b = 3
  , c = { foo: 5
        , bar: function (n) {
            return n + 1
          }
        , openFacedClub: 'sand wedge'
        }
  , d = function (n) {
      console.log(n)
      n++
      return n
    }
