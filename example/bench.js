var fdstore = require('fd-chunk-store')
var hyperkdb = require('../')
var memdb = require('memdb')

var hyperlog = require('hyperlog')
var log = hyperlog(memdb(), { valueEncoding: 'json' })
var kdb = createKDB(log)

var start = Date.now()
var n = 5000
for (var i = 0; i < n; i++) {
  log.add(null, {
    type: 'point',
    lat: 64 + Math.random() * 2,
    lon: -147 - Math.random() * 2
  })
}

kdb.ready(function () {
  var elapsed = (Date.now() - start) / 1000
  console.log(n + ' records written in ' + elapsed + ' seconds')
  console.log(Math.floor(n / elapsed) + ' records per second')
  console.log('-----')
  var elog = hyperlog(memdb(), { valueEncoding: 'json' })
  var ekdb = createKDB(elog)

  start = Date.now()
  elog.once('preadd', function () {
    ekdb.ready(function () {
      var elapsed = (Date.now() - start) / 1000
      console.log('replicated in ' + elapsed + ' seconds')
      console.log(Math.floor(n / elapsed) + ' records per second')
    })
  })

  var r = elog.replicate()
  r.pipe(log.replicate()).pipe(r)
})

function createKDB (log) {
  return hyperkdb({
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
}
