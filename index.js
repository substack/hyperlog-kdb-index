var indexer = require('hyperlog-index')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var sub = require('subleveldown')
var once = require('once')
var randomBytes = require('randombytes')

module.exports = HKDB
inherits(HKDB, EventEmitter)

function HKDB (opts) {
  if (!(this instanceof HKDB)) return new HKDB(opts)
  var self = this
  EventEmitter.call(self)
  self.log = opts.log
  self.db = opts.db
  self.kdb = opts.kdb

  self.dex = indexer(self.log, self.db, function (row, next) {
    if (!row.value.v.loc) return next()
    var pt = row.value.v.loc[0]
    var value = Buffer(row.key, 'hex')
    self.kdb.insert(pt, value, next)
  })
}

/*
HKDB.prototype.insert = function (pt, value, opts, cb) {
  var self = this
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  cb = once(cb || noop)

  var doc = { point: pt, value: value }
  if (opts.links) {
    self.log.add(opts.links, doc, cb)
  } else {
    self.dex.ready(function () {
      if (err) return cb(err)
      self.log.add(links, doc, function (err, node) {
        if (err) return cb(err)
      })
    })
  }
}
*/

HKDB.prototype.query = function () {
  var self = this
  self.dex.ready(function () {
    //...
  })
}

function noop () {}
