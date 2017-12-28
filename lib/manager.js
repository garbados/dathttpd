const os = require('os')
const fs = require('fs')
const path = require('path')
const yaml = require('js-yaml')
const server = require('./server')

const CFG_PATH = process.env.DATHTTPD_CONFIG || path.join(os.homedir(), '.dathttpd.yml')

module.exports = class Manager {
  constructor (configPath = CFG_PATH) {
    this.config = this.readConfig(configPath)
  }

  readConfig (configPath) {
    let cfgRaw
    try {
      cfgRaw = fs.readFileSync(configPath, 'utf8')
    } catch (e) {
      console.error('Failed to load config file at', configPath)
      throw e
    }
    try {
      return yaml.safeLoad(cfgRaw)
    } catch (e) {
      console.error('Failed to parse config file at', configPath)
      throw e
    }
  }

  start (cb) {
    server.start(this.config, cb)
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
