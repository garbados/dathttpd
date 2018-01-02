'use strict'

// TODO jsdoc

const _ = require('lodash')
const async = require('async')
const express = require('express')
const fs = require('fs')
const hostile = require('hostile')
const http = require('http')
const mkdirp = require('mkdirp')
const Multidat = require('multidat')
const path = require('path')
const rimraf = require('rimraf')
const serveDir = require('serve-index')
const toiletdb = require('toiletdb')
const untildify = require('untildify')
const vhost = require('vhost')
const debug = require('debug')('dat-boi')
const { EventEmitter } = require('events')

if (process.env.DEBUG) {
  require('longjohn')
}

const HOSTNAME_REGEX = /^(([a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])$/i
const DAT_REGEX = /^dat:\/\/([0-9a-f]{64})/i

const CFG_PATH = process.env.DATBOI_CONFIG || '~/.dat-boi.json'
const DIR_PATH = process.env.DATBOI_DIRECTORY || '~/.dat-boi'

const DATIGNORE = ['*', '**/*', '!dat.json'].join('\n')
const LOCALHOST = '127.0.0.1'
const PORT = 80

const DAT_OPTIONS = { live: true }
const NET_OPTIONS = {}

// monkey-patch Object for older node versions
Object.values = Object.values || function (obj) {
  return Object.keys(obj).map((key) => { return obj[key] })
}

module.exports = class DatBoi extends EventEmitter {
  /**
   * @class DatBoi
   * @param  {Object} options [description]
   */
  constructor (options = { config: CFG_PATH, directory: DIR_PATH }) {
    super()
    debug('Creating new DatBoi with config: %j', options)
    this.configPath = untildify(options.config || CFG_PATH)
    this.directory = untildify(options.directory || DIR_PATH)
    mkdirp.sync(this.directory)
    this.db = toiletdb(this.configPath)
    this.peerSites = options.peerSites || false
    this.datOptions = _.extend({}, DAT_OPTIONS, options.dat || {})
    this.netOptions = _.extend({}, NET_OPTIONS, options.net || {})
    this.port = options.port || DatBoi.port
    this.modifyHostfile = options.modifyHostfile
    this.serve = options.serve
  }

  init (done) {
    debug('Initializing...')
    this.app = express()
    async.series([
      (done) => {
        fs.stat(this.configPath, (err) => {
          if (err && err.code === 'ENOENT') {
            fs.writeFile(this.configPath, '{}', done)
          } else {
            done(err)
          }
        })
      },
      (done) => {
        this.db.read((err, data) => {
          if (err) return done(err)
          if (Object.keys(data).length === 0) {
            async.series([
              (done) => { this.db.write('sites', {}, done) },
              (done) => { this.db.write('sitelists', [], done) }
            ], done)
          } else {
            done(null, data)
          }
        })
      },
      (done) => {
        debug('Loading multidat...')
        let multiDb = toiletdb(path.join(this.directory, 'multidat.json'))
        Multidat(multiDb, this.datOptions, (err, multidat) => {
          this.multidat = multidat
          debug('✓ Loaded multidat')
          done(err, multidat)
        })
      },
      (done) => {
        debug('Loading local sites...')
        async.waterfall([
          this.db.read.bind(this.db, 'sites'),
          this.loadSites.bind(this)
        ], (err, sites) => {
          if (err) return done(err)
          this.localSites = sites
          debug('✓ Loaded local sites')
          done(null, sites)
        })
      },
      (done) => {
        debug('Loading remote sites...')
        async.waterfall([
          this.db.read.bind(this.db, 'sitelists'),
          this.loadSiteLists.bind(this)
        ], (err, sitelists) => {
          this.remoteSites = sitelists
          debug('✓ Loaded remote sites')
          done(err, sitelists)
        })
      },
      (done) => {
        this.peerSiteList(done)
      }
    ], (err) => {
      if (err) return done(err)
      debug('✓ Initialized')
      done()
    })
  }

  start (done) {
    debug('Starting...')
    async.series([
      this.init.bind(this),
      this.cleanArchives.bind(this),
      (done) => {
        async.each(this.multidat.list(), (dat, done) => {
          debug(`Joining network for ${dat.key.toString('hex')}`)
          dat.joinNetwork(this.netOptions, done)
        }, (err) => {
          if (err) return done(err)
          this.sites.forEach((site) => {
            debug(`Setting up vhost for ${site.hostname}`)
            let app = DatBoi.createSiteApp(site)
            this.app.use(vhost(site.hostname, app))
          })
          done()
        })
      },
      (done) => {
        if (this.serve === false) return done()
        this.server = http.createServer(this.app)
        this.server.listen(this.port, done)
        debug('Now listening on port %i', this.port)
      }
    ], (err) => {
      if (err) return done(err)
      this.startWatchers()
      debug('✓ Started')
      this.emit('ready')
      done()
    })
  }

  stop (done) {
    debug('Stopping...')
    this.watcher.close()
    async.series([
      (done) => {
        debug('Stopping dats...')
        async.each(this.multidat.list(), (dat, done) => {
          debug(`Stopping dat ${dat.key.toString('hex')}`)
          this.multidat.close(dat.key, done)
        }, done)
      },
      (done) => {
        if (this.server && this.server.listening) {
          debug('Stopping server...')
          this.server.close(done)
        } else {
          done()
        }
      }
    ], (err) => {
      if (err) return done(err)
      debug('✓ Stopped')
      return done()
    })
  }

  restart (done) {
    debug('Restarting...')
    async.series([
      this.stop.bind(this),
      this.start.bind(this)
    ], done)
  }

  startWatchers () {
    // restart when config changes
    this.watcher = fs.watch(this.configPath)
    this.watcher.once('change', (type, name) => {
      debug('Restarting due to change in config...')
      this.emit('change')
      this.emit('change-config')
      this.restart()
    })
    // restart when sitelists change
    let dats = this.multidat.list()
    let tasks = this.siteLists.map((key) => {
      let dat = dats.filter((dat) => { return dat.key.toString('hex') === key })[0]
      return (done) => {
        dat.archive.metadata.once('sync', () => {
          dat.archive.metadata.once('append', () => {
            done()
          })
        })
      }
    })
    if (tasks.length) {
      async.race(tasks, (err) => {
        if (err) throw err
        debug('Restarting due to change in a remote sitelist...')
        this.emit('change')
        this.emit('change-sitelist')
        this.restart()
      })
    }
  }

  peerSiteList (done) {
    if (this.peerSites) {
      debug('Peering local sitelist...')
      let joinDir = path.join.bind(path, this.directory)
      // start peering this.sites
      async.parallel([
        fs.writeFile.bind(fs, joinDir('.datignore'), DATIGNORE, 'utf8'),
        fs.writeFile.bind(fs, joinDir('dat.json'), JSON.stringify({ sites: this.sites }))
      ], (err) => {
        if (err) return done(err)
        this.multidat.create(this.directory, this.datOptions, (err, dat) => {
          if (err) return done(err)
          dat.importFiles((err) => {
            if (err) return done(err)
            debug(`Peering local sitelist at dat://${dat.key.toString('hex')}`)
            done()
          })
        })
      })
    } else {
      return done()
    }
  }

  loadSites (sites = {}, done) {
    let hostnames = Object.keys(sites)
    if (!hostnames.length) return done(null, sites)
    let dats = this.multidat.list()
    async.each(hostnames, (hostname, done) => {
      debug(`Loading ${hostname}...`)
      let site = sites[hostname]
      site.hostname = hostname
      DatBoi.validateSiteCfg(site)
      async.parallel([
        (done) => {
          if (site.url || site.directory) {
            if (this.modifyHostfile !== false) {
              debug('Updating hostfile for %s', site.hostname)
              hostile.set(LOCALHOST, hostname, done)
            } else {
              return done()
            }
          } else {
            return done()
          }
        },
        (done) => {
          debug('Loading archive for %s from %s', site.hostname, site.url)
          if (site.url) {
            site.key = site.key || DatBoi.getDatKey(site.url) // TODO use dat-link-resolve instead
            site.directory = site.directory || path.join(this.directory, hostname)
            let dat = dats.find(d => d.key.toString('hex') === site.key)
            if (dat) {
              return done(null, dat)
            } else {
              let options = _.extend({}, this.datOptions, { key: site.key })
              return this.multidat.create(site.directory, options, done)
            }
          } else if (site.directory) {
            this.multidat.create(site.directory, this.datOptions, (err, dat) => {
              if (err) return done(err)
              site.key = dat.key.toString('hex')
              site.url = `dat://${site.key}`
              dat.importFiles()
              return done(null, dat)
            })
          } else {
            return done()
          }
        }
      ], done)
    }, (err) => {
      if (err) return done(err)
      debug(`✓ Loaded sites: ${hostnames.join(', ')}`)
      return done(null, sites)
    })
  }

  loadSiteLists (sitelists = [], done) {
    debug(`Loading sitelists...`)
    let remoteSites = {}
    let dats = this.multidat.list()
    async.each(sitelists, (sitelist, done) => {
      debug(`Loading sitelist ${sitelist}`)
      let key = DatBoi.getDatKey(sitelist)

      async.waterfall([
        (done) => {
          var dat = dats.find(d => d.key.toString('hex') === key)
          if (dat) {
            done(null, dat)
          } else {
            let datPath = path.join(this.directory, key)
            let datOptions = _.extend({}, this.datOptions, { key, sparse: true })
            this.multidat.create(datPath, datOptions, done)
          }
        },
        (dat, done) => {
          dat.joinNetwork(this.netOptions)
          this.multidat.readManifest(dat, done)
        },
        (datjson, done) => {
          let sites = {}
          datjson.sites.forEach((site) => {
            delete site.directory
            sites[site.hostname] = site
          })
          this.loadSites(sites, done)
        }
      ], (err, sites) => {
        if (err) return done(err)
        remoteSites[key] = sites
        done()
      })
    }, (err) => {
      debug('✓ Loaded sitelists')
      done(err, remoteSites)
    })
  }

  /*
  Remove archives not referenced by any site
  and hostfile entries associated with deleted sites.
   */
  cleanArchives (done) {
    debug('Checking for unused archives...')
    let datKeys = this.multidat.list().map((dat) => {
      return dat.key.toString('hex')
    })
    let sites = this.sites
    let keys = sites.map((site) => {
      return site.key
    }).filter((key) => {
      return datKeys.indexOf(key) === -1
    })
    let hostnames = sites.filter((site) => {
      return keys.indexOf(site.key) !== -1
    }).map((site) => {
      return site.hostname
    })
    async.parallel([
      (done) => {
        async.each(keys, (key, done) => {
          debug(`Removing archive ${key}...`)
          async.series([
            this.multidat.close.bind(this.multidat, key),
            rimraf.bind(rimraf, path.join(this.directory, key))
          ], done)
        }, done)
      },
      (done) => {
        if (this.modifyHostfile !== false) {
          async.eachSeries(hostnames, (hostname, done) => {
            debug(`Removing domain ${hostname}...`)
            hostile.remove(LOCALHOST, hostname, done)
          }, done)
        } else {
          done()
        }
      }
    ], (err) => {
      if (err) return done(err)
      debug('✓ Cleaned archives')
      done()
    })
  }

  get sites () {
    let localSites = Object.values(this.localSites)
    let remoteSites = Object.values(this.remoteSites).map((sites) => {
      return Object.values(sites)
    }).reduce((a, b) => { return a.concat(b) }, [])
    return localSites.concat(remoteSites)
  }

  get siteLists () {
    return Object.keys(this.remoteSites)
  }

  addSite (domain, key, options, done) {
    if (!done) {
      done = options
      options = {}
    }
    async.waterfall([
      this.db.read.bind(this.db, 'sites'),
      (sites = {}, done) => {
        let site = options
        site.url = key
        sites[domain] = _.extend(sites[domain] || {}, site)
        this.db.write('sites', sites, done)
      }
    ], done)
  }

  removeSite (domain, done) {
    async.waterfall([
      this.db.read.bind(this.db, 'sites'),
      (sites = {}, done) => {
        delete sites[domain]
        this.db.write('sites', sites, done)
      }
    ], done)
  }

  addSiteList (key, done) {
    async.waterfall([
      this.db.read.bind(this.db, 'sitelists'),
      (sitelists = [], done) => {
        let exists = sitelists.indexOf(key) > -1
        if (exists) {
          done()
        } else {
          sitelists.push(key)
          this.db.write('sitelists', sitelists, done)
        }
      }
    ], done)
  }

  removeSiteList (key, done) {
    async.waterfall([
      this.db.read.bind(this.db, 'sitelists'),
      (sitelists = [], done) => {
        let i = sitelists.indexOf(key)
        if (i > -1) {
          sitelists.splice(i, 1)
          this.db.write('sitelists', sitelists, done)
        } else {
          done()
        }
      }
    ], done)
  }

  static createSiteApp (site = {}) {
    var siteApp = express()
    if (site.url) {
      // dat site
      siteApp.get('/.well-known/dat', (req, res) => {
        res.status(200).end('dat://' + site.key + '/\nTTL=3600')
      })
      siteApp.use(express.static(site.directory, {extensions: ['html', 'htm']}))
      siteApp.use(serveDir(site.directory, {icons: true}))
    }
    return siteApp
  }

  static validateSiteCfg (site) {
    if (!HOSTNAME_REGEX.test(site.hostname)) {
      console.log('Invalid hostname "%s".', site.hostname)
      throw new Error('Invalid config')
    }
    if (site.url && !DAT_REGEX.test(site.url)) {
      console.log('Invalid Dat URL "%s". URLs must have the `dat://` scheme and the "raw" 64-character hex hostname.', site.url)
      throw new Error('Invalid config')
    }
    if (!site.url) {
      console.log('Invalid config for "%s", must have a url configured.', site.hostname)
      throw new Error('Invalid config')
    }
  }

  static getDatKey (url) {
    return DAT_REGEX.exec(url)[1]
  }

  static get configPath () {
    return CFG_PATH
  }

  static get directory () {
    return DIR_PATH
  }

  static get port () {
    return PORT
  }

  static start (options, done) {
    let boi = DatBoi.create(options)
    boi.start(done)
    return boi
  }

  static create (options) {
    return new DatBoi(options)
  }
}
