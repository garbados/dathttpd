'use strict'

const async = require('async')
const DatBoi = require('.')
const fs = require('fs')
const rimraf = require('rimraf')
const tap = require('tap')

const OPTIONS = {
  port: 10001,
  config: '.test-boi.json',
  directory: '.test-boi',
  modifyHostfile: false
}

const SITE = {
  url: 'dat://c33bc8d7c32a6e905905efdbf21efea9ff23b00d1c3ee9aea80092eaba6c4957',
  hostname: 'test.site'
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
      t.equal(boi.server, undefined)
      t.equal(boi.watcher, undefined)
      boi.start(done)
    },
    (done) => {
      // test results of init
      t.ok(boi.multidat)
      t.ok(boi.server)
      t.ok(boi.watcher)
      t.equal(boi.sites.length, 0)
      // test results of start
      t.ok(boi.server)
      boi.addSite(SITE.hostname, SITE.url, done)
    },
    (done) => {
      boi.once('ready', () => {
        t.equal(boi.sites.length, 1)
        boi.removeSite(SITE.hostname, done)
      })
    },
    (done) => {
      // test removal results
      boi.once('ready', () => {
        t.equal(boi.sites.length, 0)
        boi.stop(done)
      })
    }
  ], (err) => {
    t.equal(err, null)
    t.end()
  })
})
