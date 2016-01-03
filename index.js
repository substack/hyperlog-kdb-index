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
    if (!rec || (!rec.point && !Array.isArray(rec.points))) return next()
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
          if (!rec || (!rec.point && !Array.isArray(rec.points))) {
            if (--pending === 0) insert()
            return
          }
          if (rec.point) {
            kdb.remove(rec.point, { value: Buffer(link, 'hex') }, onrm)
          } else if (rec.points) {
            pending += rec.points.length - 1
            rec.points.forEach(function (pt) {
              kdb.remove(pt, { value: Buffer(link, 'hex') }, onrm)
            })
          }
        })
      })
      if (--pending === 0) insert()
      function insert () {
        if (rec.type === 'put' && rec.points) {
          var p = 1 + rec.points.length
          rec.points.forEach(function (p) {
            kdb.insert(p, value, oninsert)
          })
          function oninsert (err) {
            if (err) next(err)
            else if (--p === 0) next()
          }
          if (--p === 0) next()
        } else if (rec.type === 'put') {
          kdb.insert(rec.point, value, next)
        } else { // del, unknown type cases
          next()
        }
      }
      function onrm (err) {
        if (err) next(err)
        else if (--pending === 0) insert()
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
