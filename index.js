var indexer = require('hyperlog-index')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var sub = require('subleveldown')

module.exports = HKDB
inherits(HKDB, EventEmitter)

function HKDB (opts) {
  if (!(this instanceof HKDB)) return new HKDB(opts)
  var self = this
  EventEmitter.call(self)
  self.log = opts.log
  self.db = opts.db
  self.idb = sub(self.db, 'i')
  self.xdb = sub(self.db, 'x')
  self.kdb = opts.kdbtree({
    types: opts.types.concat('buffer[32]'),
    store: opts.store,
    size: opts.size || opts.store.size
  })
  self.dex = indexer(self.log, self.idb, function (row, next) {
    var pt = opts.map(row)
    if (!pt) return next()
    var value = Buffer(row.key, 'hex')
    var links = {}
    row.links.forEach(function (link) { links[link] = true })

    self.kdb.remove(pt, {
      filter: function (pt) {
        return links.hasOwnProperty(pt.value.toString('hex'))
      }
    }, onremove)
    function onremove (err) {
      if (err) next(err)
      else self.kdb.insert(pt, value, next)
    }
  })
}

HKDB.prototype.ready = function (fn) {
  this.dex.ready(fn)
}

HKDB.prototype.query = function (q, opts, cb) {
  var self = this
  self.ready(function () {
    self.kdb.query(q, opts, cb)
  })
}

HKDB.prototype.queryStream = function (q, opts) {
  var r = through.obj()
  self.ready(function () {
    var qs = self.kdb.queryStream(q, opts)
    qs.on('error', r.emit.bind(r, 'error'))
    qs.pipe(r)
  })
  return readonly(r)
}

function noop () {}
