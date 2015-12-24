var test = require('tape')
var fdstore = require('fd-chunk-store')
var hyperkdb = require('../')
var kdbtree = require('kdb-tree-store')
var memdb = require('memdb')
var path = require('path')
var xtend = require('xtend')

var hyperlog = require('hyperlog')
var log = hyperlog(memdb(), { valueEncoding: 'json' })
var file = path.join(require('os').tmpdir(), 'kdb-tree-' + Math.random())

test('update', function (t) {
  t.plan(8)
  var kdb = hyperkdb({
    log: log,
    db: memdb(),
    types: [ 'float', 'float' ],
    kdbtree: kdbtree,
    store: fdstore(256, file),
    size: 256,
    map: function (row) {
      if (row.value.type === 'point') {
        return [ row.value.lat, row.value.lon ]
      }
    }
  })
  var docs = [
    { type: 'point', lat: 64, lon: -147 },
    { type: 'point', lat: 63, lon: -145 },
    { type: 'point', lat: 65, lon: -149 },
    { type: 'point', lat: 64, lon: -148 }
  ]
  var pending = docs.length
  var nodes = {}, knodes = {}
  docs.forEach(function (doc, i) {
    log.add(null, doc, function (err, node) {
      t.ifError(err)
      nodes[i] = node
      knodes[node.key] = node
      if (--pending === 0) ready()
    })
  })
  function ready () {
    var doc = xtend(nodes[2].value, { lat: 65.3, lon: -143 })
    log.add([nodes[2].key], doc, function (err, node) {
      var q0 = [[63.5,65.1],[-150,-147.5]]
      kdb.query(q0, function (err, pts) {
        t.ifError(err)
        var ps = pts.map(function (pt) {
          return knodes[pt.value.toString('hex')].value
        })
        t.deepEqual(ps, [
          { type: 'point', lat: 64, lon: -148 }
        ])
      })
      var q1 = [[63.5,65.4],[-150,-142]]
      kdb.query(q1, function (err, pts) {
        t.ifError(err)
        var ps = pts.map(function (pt) {
          if (node.key === pt.value.toString('hex')) return node.value
          return knodes[pt.value.toString('hex')].value
        })
        t.deepEqual(ps.sort(cmp), [
          { type: 'point', lat: 65.3, lon: -143 },
          { type: 'point', lat: 64, lon: -148 },
          { type: 'point', lat: 64, lon: -147 }
        ].sort(cmp))
      })
    })
  }
})

function cmp (a, b) {
  return a.lat + ',' + a.lon < b.lat + ',' + b.lon ? -1 : 1
}
