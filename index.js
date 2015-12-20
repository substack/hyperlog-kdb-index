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

function noop () {}
