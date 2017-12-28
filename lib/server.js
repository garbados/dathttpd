const async = require('async')
const express = require('express')
const greenlockExpress = require('greenlock-express')
const hostile = require('hostile')
const http = require('http')
const metric = require('./metric')
const mkdirp = require('mkdirp')
const Multidat = require('multidat')
const os = require('os')
const path = require('path')
const toiletdb = require('toiletdb')
const untildify = require('untildify')
const vhost = require('vhost')
const {approveDomains} = require('./lets-encrypt')
const {
  createSiteApp,
  getDatKey,
  validateSiteCfg
} = require('./helpers')

// constants
// =

const IS_DEBUG = (['debug', 'staging', 'test'].indexOf(process.env.NODE_ENV) !== -1)
const LOCALHOST = '127.0.0.1'
const DEFAULT_DIRECTORY = path.join(os.homedir(), '.dathttpd')

// globals
// =

module.exports = class Server {
  constructor (options = {}) {
    this.options = options
    this.sites = this.options.sites
    this.directory = (this.options.directory ? untildify(this.options.directory) : DEFAULT_DIRECTORY)
    this.app = express()

    // set up ports config
    this.ports = this.options.ports || {}
    this.ports.http = this.ports.http || 80
    this.ports.https = this.ports.https || 443
  }

  start (cb) {
    // ensure the sites dir exists
    mkdirp.sync(this.directory)
    console.log('Serving from', this.directory)

    async.series([
      this.startDat.bind(this),
      this.startServer.bind(this)
    ], cb)
  }

  startDat (cb) {
    let toiletpath = path.join(this.directory, 'multidat.json')
    let db = toiletdb(toiletpath)
    Multidat(db, (err, multidat) => {
      if (err) return cb(err)

      this.multidat = multidat
      var dats = this.multidat.list()

      // iterate sites
      Object.keys(this.sites).forEach(hostname => {
        function initDat (err, dat) {
          if (err) throw err
          dat.joinNetwork()
          metric.trackDatStats(dat, site)
          console.log('Serving', hostname, site.url)
        }
        let site = this.sites[hostname]
        site.hostname = hostname
        validateSiteCfg(site)

        if (site.url) {
          // a dat site
          site.datKey = getDatKey(site.url)
          site.directory = path.join(this.directory, hostname)
          mkdirp.sync(site.directory)

          // start the dat
          var dat = dats.find(d => d.key.toString('hex') === site.datKey)
          if (dat) {
            initDat(null, dat)
          } else {
            this.multidat.create(site.directory, {key: site.datKey}, initDat)
          }
        } else if (site.proxy) {
          console.log('Proxying', hostname, site.proxy)
        }

        // if cfg.localhost, modify hostfile
        if (this.options.localhost) {
          hostile.set(LOCALHOST, hostname)
        }

        // add to the HTTPS server
        this.app.use(vhost(hostname, createSiteApp(site)))
      })

      cb()
    })
  }

  startServer (cb) {
    // start server
    if (this.options.letsencrypt) {
      this.server = greenlockExpress.create({
        server: IS_DEBUG ? 'staging' : 'https://acme-v01.api.letsencrypt.org/directory',
        debug: IS_DEBUG,
        approveDomains: approveDomains(this.options),
        app: this.app
      }).listen(this.ports.http, this.ports.https)
    } else {
      this.server = http.createServer(this.app)
      this.server.listen(this.ports.http)
    }
    this.server.on('error', err => {
      console.error('Failed to create server')
      throw err
    })
    if (cb) {
      this.server.once('listening', cb)
    }
  }

  static create (options) {
    return new Server(options)
  }

  static start (options, cb) {
    let server = Server.create(options)
    server.start(cb)
  }
}
