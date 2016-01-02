var indexer = require('hyperlog-index')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var sub = require('subleveldown')
var through = require('through2')
var readonly = require('read-only-stream')

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

  self.xdb.get('available', function (err, value) {
    if (err && !/^notfound/i.test(err.message) && !err.notFound) {
      return self.emit('error', err)
    }
    self.kdb = opts.kdbtree({
      types: opts.types.concat('buffer[32]'),
      store: opts.store,
      size: opts.size || opts.store.size,
      available: Number(value || 0)
    })
    self.kdb.on('available', function (n) {
      self.xdb.put('available', String(n), function (err) {
        if (err) self.emit('error', err)
      })
    })
    self.emit('_kdb', self.kdb)
  })

  self.map = opts.map
  self.dex = indexer(self.log, self.idb, function (row, next) {
    var rec = self.map(row)
    if (Array.isArray(rec)) rec = { type: 'put', point: rec }
    if (!rec || !rec.point) return next()
    if (!rec.type) rec.type = 'put'
    var value = Buffer(row.key, 'hex')
    var links = {}
    row.links.forEach(function (link) { links[link] = true })

    self._getkdb(function (kdb) {
      var pending = 1
      row.links.forEach(function (link) {
        pending++
        self.log.get(link, function (err, doc) {
          if (err) return next(err)
          var rec = self.map(doc)
          if (Array.isArray(rec)) rec = { type: 'put', point: rec }
          if (!rec || !rec.point) {
            if (--pending === 0) insert()
            return
          }
          kdb.remove(rec.point, { value: Buffer(link, 'hex') }, function (err) {
            if (err) next(err)
            else if (--pending === 0) insert()
          })
        })
      })
      if (--pending === 0) insert()
      function insert () {
        if (rec.type === 'put') {
          kdb.insert(rec.point, value, next)
        } else { // del, unknown type cases
          next()
        }
      }
    })
  })
}

HKDB.prototype._getkdb = function (fn) {
  if (this.kdb) fn(this.kdb)
  else this.once('_kdb', fn)
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
  var self = this
  var r = through.obj()
  self.ready(function () {
    var qs = self.kdb.queryStream(q, opts)
    qs.on('error', r.emit.bind(r, 'error'))
    qs.pipe(r)
  })
  return readonly(r)
}

function noop () {}
