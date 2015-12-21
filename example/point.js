var kdbtree = require('kdb-tree-store')
var fdstore = require('fd-chunk-store')
var randomBytes = require('randombytes')

var kdb = kdbtree({
  types: [ 'float', 'float', 'buffer[32]' ],
  size: 1024,
  store: fdstore(1024, '/tmp/kdb-tree-' + Math.random())
})
var hyperkdb = require('../')
var logdb = require('memdb')()
var ixdb = require('memdb')()

var hyperlog = require('hyperlog')
var log = hyperlog(logdb, { valueEncoding: 'json' })

var h = hyperkdb({
  log: log,
  db: ixdb,
  kdb: kdb,
  map: function (row) {
    if (row.value.type === 'point') {
      return [ row.value.lat, row.value.lon ]
    }
  }
})

for (var i = 0; i < 50; i++) {
  log.append({
    type: 'point',
    lat: 64 + Math.random() * 2,
    lon: -147 - Math.random() * 2
  })
}

h.ready(function () {
  kdb.query([[64.5,65],[-147.9,-147.2]], function (err, pts) {
    if (err) return console.error(err)
    pts.forEach(function (pt) {
      console.log(pt.point)
    })
  })
})
