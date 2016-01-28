var fdstore = require('fd-chunk-store')
var hyperkdb = require('../')
var memdb = require('memdb')

var hyperlog = require('hyperlog')
var log = hyperlog(memdb(), { valueEncoding: 'json' })

var kdb = hyperkdb({
  log: log,
  db: memdb(),
  types: [ 'float', 'float' ],
  kdbtree: require('kdb-tree-store'),
  store: fdstore(1024, '/tmp/kdb-tree-' + Math.random()),
  map: function (row) {
    if (row.value.type === 'point') {
      return [ row.value.lat, row.value.lon ]
    }
  }
})

for (var i = 0; i < 50; i++) {
  log.add(null, {
    type: 'point',
    lat: 64 + Math.random() * 2,
    lon: -147 - Math.random() * 2
  })
}

kdb.query([[64.5,65],[-147.9,-147.2]], function (err, pts) {
  if (err) return console.error(err)
  pts.forEach(function (pt) {
    console.log(pt.point)
  })
})
