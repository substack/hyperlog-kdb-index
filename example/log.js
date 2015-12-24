var fdstore = require('fd-chunk-store')
var hyperkdb = require('../')
var level = require('level')

var hyperlog = require('hyperlog')
var log = hyperlog(level('/tmp/kdb-log/log'), { valueEncoding: 'json' })

var kdb = hyperkdb({
  log: log,
  db: level('/tmp/kdb-log/index'),
  types: [ 'float', 'float' ],
  kdbtree: require('kdb-tree-store'),
  store: fdstore(1024, '/tmp/kdb-log/tree'),
  size: 1024,
  map: function (row) {
    if (row.value.type === 'point') {
      return [ row.value.lat, row.value.lon ]
    }
  }
})

if (process.argv[2] === 'add') {
  log.add(null, {
    type: 'point',
    lat: Number(process.argv[3]),
    lon: Number(process.argv[4])
  })
} else if (process.argv[2] === 'query') {
  var q = process.argv.slice(3).map(commaSplit)
  kdb.query(q, function (err, pts) {
    if (err) return console.error(err)
    pts.forEach(function (pt) {
      console.log(pt.point)
    })
  })
}

function commaSplit (s) { return s.split(',').map(Number) }
