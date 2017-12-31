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

const SITE = 'dat://c33bc8d7c32a6e905905efdbf21efea9ff23b00d1c3ee9aea80092eaba6c4957'

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
      // test results of start
      t.ok(boi.server)
      boi.addSite('test.site', SITE, done)
    },
    (done) => {
      // TODO test add results
      boi.removeSite('test.site', done)
    },
    (done) => {
      // TODO test removal results
      boi.stop(done)
    }
  ], (err) => {
    t.error(err)
    t.end()
  })
})
