const os = require('os')
const path = require('path')
const server = require('./server')
const toiletdb = require('toiletdb')
const untildify = require('untildify')

const CFG_PATH = process.env.DATHTTPD_CONFIG || path.join(os.homedir(), '.dathttpd.json')

module.exports = class Manager {
  constructor (configPath = CFG_PATH) {
    configPath = (configPath && untildify(configPath)) || CFG_PATH
    this.db = toiletdb(configPath)
  }

  start (cb) {
    this.db.read((err, config) => {
      if (err) return cb(err)
      server.start(config, cb)
    })
  }

  static get CFG_PATH () {
    return CFG_PATH
  }

  static create (configPath) {
    return new Manager(configPath)
  }

  static start (configPath, cb) {
    let manager = Manager.create(configPath)
    manager.start(cb)
    return manager
  }
}
