'use strict'

const async = require('async')
const DatBoi = require('.')
const fs = require('fs')
const rimraf = require('rimraf')
const tap = require('tap')

const OPTIONS = {
  port: 10001,
  config: '.test-boi.json',
  directory: '.test-boi'
}

tap.afterEach((done) => {
  async.parallel([
    fs.unlink.bind(fs, OPTIONS.config),
    rimraf.bind(rimraf, OPTIONS.directory)
  ], done)
})

tap.test({
  bail: true
}, (t) => {
  let boi = DatBoi.create(OPTIONS)

  async.series([
    (done) => {
      // test settings
      t.ok(boi.configPath)
      t.ok(boi.directory)
      t.equal(boi.port, OPTIONS.port)
      t.equal(boi.multidat, undefined)
      boi.init(done)
    },
    (done) => {
      // test results of init
      t.ok(boi.multidat)
      t.equal(boi.sites.length, 0)
      t.equal(boi.server, undefined)
      t.equal(boi.watcher, undefined)
      boi.start(done)
    },
    (done) => {
      // TODO test results of start
      t.ok(boi.server)
      boi.stop(done)
    }
  ], (err) => {
    t.error(err)
    t.end()
  })
})
