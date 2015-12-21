var test = require('tape')
var fdstore = require('fd-chunk-store')
var hyperkdb = require('../')
var kdbtree = require('kdb-tree-store')
var memdb = require('memdb')
var path = require('path')

var hyperlog = require('hyperlog')
var log = hyperlog(memdb(), { valueEncoding: 'json' })
var file = path.join(require('os').tmpdir(), 'kdb-tree-' + Math.random())

test('points', function (t) {
  t.plan(2)
  var kdb = hyperkdb({
    log: log,
    db: memdb(),
    types: [ 'float', 'float' ],
    kdbtree: kdbtree,
    store: fdstore(64, file),
    size: 64,
    map: function (row) {
      if (row.value.type === 'point') {
        return [ row.value.lat, row.value.lon ]
      }
    }
  })
  var data = []
  for (var i = 0; i < 50; i++) (function (i) {
    var row = {
      type: 'point',
      lat: 64 + Math.random() * 2,
      lon: -147 - Math.random() * 2
    }
    log.append(row, function (err, node) {
      t.ifError(err)
      data[i] = {
        point: [ row.lat, row.lon ],
        value: node.key
      }
    })
  })(i)

  var q = [[64.5,65],[-147.9,-147.2]]
  kdb.query(q, function (err, pts) {
    t.ifError(err)
    var expected = data.filter(function (row) {
      return q[0][0] <= row.lat && row.lat <= q[0][1]
        && q[1][0] <= row.lon && row.lon <= q[1][1]
    })
    t.deepEqual(pts, expected, 'expected points')
  })
})
