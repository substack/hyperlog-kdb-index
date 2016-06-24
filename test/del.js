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

test('del', function (t) {
  t.plan(9)
  var kdb = hyperkdb({
    log: log,
    db: memdb(),
    types: [ 'float', 'float' ],
    kdbtree: kdbtree,
    store: fdstore(256, file),
    map: function (row, next) {
      if (row.value.type === 'remove') {
        next(null, { type: 'del', point: [ row.value.lat, row.value.lon ] })
      } else if (row.value.type === 'point') {
        next(null, { type: 'put', point: [ row.value.lat, row.value.lon ] })
      }
    }
  })
  var docs = {
    A: { v: { type: 'point', lat: 64, lon: -147 } },
    B: { v: { type: 'point', lat: 63, lon: -145 } },
    C: { v: { type: 'point', lat: 65, lon: -149 } },
    D: { v: { type: 'point', lat: 64, lon: -148 } },
    E: { v: { type: 'remove', lat: 64, lon: -148 }, links: ['D'] }
  }
  var keys = Object.keys(docs).sort()
  var nodes = {}, knodes = {}
  ;(function advance () {
    if (keys.length === 0) return ready()
    var key = keys.shift()
    var doc = docs[key]
    var ln = (doc.links || []).map(function (k) { return nodes[k].key })
    log.add(ln, doc.v, function (err, node) {
      t.ifError(err)
      nodes[key] = node
      knodes[node.key] = node
      advance()
    })
  })()
  function ready () {
    var doc = xtend(nodes.C.value, { lat: 65.3, lon: -143 })
    log.add([nodes.C.key], doc, function (err, node) {
      var q0 = [[63.5,65.1],[-150,-147.5]]
      kdb.query(q0, function (err, pts) {
        t.ifError(err)
        var ps = pts.map(function (pt) {
          return knodes[pt.value.toString('hex')].value
        })
        t.deepEqual(ps, [])
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
          { type: 'point', lat: 64, lon: -147 }
        ].sort(cmp))
      })
    })
  }
})

function cmp (a, b) {
  return a.lat + ',' + a.lon < b.lat + ',' + b.lon ? -1 : 1
}
