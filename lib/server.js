const async = require('async')
const express = require('express')
const fs = require('fs')
const hostile = require('hostile')
const http = require('http')
const mkdirp = require('mkdirp')
const Multidat = require('multidat')
const os = require('os')
const path = require('path')
const toiletdb = require('toiletdb')
const untildify = require('untildify')
const vhost = require('vhost')
const {
  createSiteApp,
  getDatKey,
  validateSiteCfg
} = require('./helpers')

// constants
// =

const DATIGNORE = ['*', '**/*', '!dat.json'].join('\n')
const LOCALHOST = '127.0.0.1'
const DEFAULT_DIRECTORY = path.join(os.homedir(), '.dathttpd')

// globals
// =

module.exports = class Server {
  constructor (options = {}) {
    this.options = options
    this.sites = this.options.sites || {}
    this.sitelists = this.options.sitelists || []
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
      this.peerSiteList.bind(this),
      this.resolveSiteLists.bind(this),
      this.startSites.bind(this),
      this.startServer.bind(this)
    ], cb)
  }

  resolveSiteLists (cb) {
    this.remotesites = {}
    async.each(this.sitelists, (sitelist, cb) => {
      console.log(`Downloading sitelist from ${sitelist}...`)

      let key = getDatKey(sitelist)
      async.waterfall([
        (cb) => {
          let dats = this.multidat.list()
          var dat = dats.find(d => d.key.toString('hex') === key)
          if (dat) {
            cb(null, dat)
          } else {
            this.multidat.create(path.join(this.directory, key), { key }, cb)
          }
        },
        (dat, cb) => {
          dat.joinNetwork()
          this.multidat.readManifest(dat, cb)
        }
      ], (err, datjson) => {
        if (err) return cb(err)
        console.log(`Downloaded sitelist from ${sitelist}`)
        Object.keys(datjson.sites).forEach((hostname) => {
          // TODO detect and handle conflicts
          this.remotesites[hostname] = datjson.sites[hostname]
        })
        cb()
      })
    }, cb)
  }

  peerSiteList (cb) {
    if (this.options.peersites) {
      let joinDir = path.join.bind(path, this.directory)
      // start peering this.sites
      async.parallel([
        fs.writeFile.bind(fs, joinDir('.datignore'), DATIGNORE, 'utf8'),
        fs.writeFile.bind(fs, joinDir('dat.json'), JSON.stringify({ sites: this.sites }))
      ], (err) => {
        if (err) return cb(err)
        this.multidat.create(this.directory, (err, dat) => {
          if (err) return cb(err)
          dat.joinNetwork()
          dat.importFiles((err) => {
            if (err) return cb(err)
            console.log(`Peering sites as archive at dat://${dat.key.toString('hex')}`)
            cb()
          })
        })
      })
    } else {
      cb()
    }
  }

  startDat (cb) {
    let toiletpath = path.join(this.directory, 'multidat.json')
    let db = toiletdb(toiletpath)

    Multidat(db, (err, multidat) => {
      if (err) return cb(err)
      this.multidat = multidat
      cb()
    })
  }

  startSites (cb) {
    async.parallel([
      initSites.bind(this, this.sites),
      initSites.bind(this, this.remotesites)
    ], cb)

    function initSites (sites, cb) {
      var dats = this.multidat.list()
      // iterate sites
      async.each(Object.keys(sites), (hostname, cb) => {
        let site = sites[hostname]
        site.hostname = hostname
        validateSiteCfg(site)

        function initDat (err, dat) {
          if (err) return cb(err)
          dat.joinNetwork()
          console.log('Serving', hostname, site.url)
          cb()
        }

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
        if (this.options.localhost !== false) {
          hostile.set(LOCALHOST, hostname)
        }

        // add to the HTTPS server
        this.app.use(vhost(hostname, createSiteApp(site)))
      }, cb)
    }
  }

  startServer (cb) {
    // start server
    this.server = http.createServer(this.app)
    this.server.listen(this.ports.http)
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
