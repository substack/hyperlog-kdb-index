var kdbtree = require('kdb-tree-store')
var fdstore = require('fd-chunk-store')
var randomBytes = require('randombytes')

var kdb = kdbtree({
  types: [ 'float', 'float', 'float', 'buffer[16]' ],
  size: 1024,
  store: fdstore(1024, '/tmp/kdb-tree')
})

var level = require('level')
var db = level('/tmp/log')

var hyperkdb = require('../')
var h = hyperkdb({
  log: hyperlog(db),
  kdb: kdb
})

for (var i = 0; i < 5000; i++) {
  h.insert([x,y,z], randomBytes(16), function (err) {
    if (err) console.error(err)
  })
}

h.query([[-100,0],[0,5],[-50,-40]], function (err, pts) {
  if (err) console.error(err)
  else console.log(pts)
})
