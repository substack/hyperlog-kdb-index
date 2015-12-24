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
  t.plan(6)
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
    log.add([nodes[2].key], doc, function (err) {
      var q = [[63.5,65.1],[-150,-147.5]]
      kdb.query(q, function (err, pts) {
        t.ifError(err)
        var ps = pts.map(function (pt) {
          return knodes[pt.value.toString('hex')].value
        })
        t.deepEqual(ps, [
          { type: 'point', lat: 64, lon: -148 }
        ])
      })
    })
  }
})

function round (row) {
  return {
    point: row.point.map(roundf),
    value: row.value
  }
}

function roundf (x) {
  var buf = new Buffer(4)
  buf.writeFloatBE(x, 0)
  return buf.readFloatBE(0)
}

function cmp (a, b) {
  return a.point.join(',') < b.point.join(',') ? -1 : 1
}
