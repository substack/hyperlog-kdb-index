# hyperlog-kdb-index

n-dimensional kdb tree spatial index for hyperlogs

# example

``` js
var fdstore = require('fd-chunk-store')
var hyperkdb = require('hyperlog-kdb-index')
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
```

```
$ mkdir /tmp/kdb-log
$ node log.js add 64.7 -147.9
$ node log.js add 66.2 -147.5
$ node log.js add 61.6 -148.3
$ node log.js query 60,65 -149,-146
[ 64.69999694824219, -147.89999389648438 ]
[ 61.599998474121094, -148.3000030517578 ]
```

# api

``` js
var hyperkdb = require('hyperlog-kdb-index')
```

## var kdb = hyperkdb(opts)

Create a kdb-tree spatial index for a hyperlog. These options are required:

* `opts.log` - a hyperlog where data is written
* `opts.db` - leveldb instance to store index data
* `opts.types` - array of [kdb-tree-store][1] types
* `opts.kdbtree` - kdb-tree-store interface (`require('kdb-tree-store')`)
* `opts.store` - [abstract-chunk-store][2] for the kdb tree data
* `opts.size` - chunk size for the chunks
* `opts.map(row)` - function mapping hyperlog rows to points

In the `opts.map(row)`, if there are no points to map in a given row, return a
falsy value. Otherwise return a point array.

[1]: https://npmjs.com/package/kdb-tree-store
[2]: https://npmjs.com/package/abstract-chunk-store

## kdb.query(q, opts={}, cb)

Query for all points in the region described by `q`. This method is passed
through to the underlying [kdb-tree-store][1] query method.

## var r = kdb.queryStream(q, opts={})

Return a readable stream `r` with the region described by `q`. This method is
passed through to the underlying [kdb-tree-store][1] query method.

## kdb.ready(fn)

When the index has caught up with the latest known entry in the hyperlog, `fn()`
fires.

## log.add(links, doc, cb)

When you write to the hyperlog, the `links` should refer to the ancestors of the
current `doc` which will be replaced with the new value.

When you create a new point, `links` should be any empty array `[]`.

When you update an existing point, `links` should contain a list of immediate
ancestors that the update will replace. Usually this will be a single key, but
for merge cases, this can be several keys.

# install

```
npm install hyperlog-kdb-index
```

# license

BSD
