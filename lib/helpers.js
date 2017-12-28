const metric = require('./metric')
const express = require('express')
const ms = require('ms')
const serveDir = require('serve-index')
const proxy = require('http-proxy').createProxyServer()

const HOSTNAME_REGEX = /^(([a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])$/i
const DAT_REGEX = /^dat:\/\/([0-9a-f]{64})/i

module.exports = {
  createSiteApp,
  getDatKey,
  validateSiteCfg
}

// helpers
// =

function createSiteApp (site) {
  var siteApp = express()
  if (site.url) {
    // dat site
    siteApp.use(metric.hits(site))
    siteApp.use(metric.respTime(site))
    siteApp.get('/.well-known/dat', (req, res) => {
      res.status(200).end('dat://' + site.datKey + '/\nTTL=3600')
    })
    if (site.datOnly) {
      siteApp.get('*', (req, res) => {
        res.redirect(`dat://${site.hostname}${req.url}`)
      })
    } else {
      const setHeaders = (res) => {
        if (site.hsts) {
          let maxAge = ms(site.hsts === true ? '7d' : site.hsts)
          res.setHeader('Strict-Transport-Security', `max-age=${maxAge}`)
        }
      }
      siteApp.use(express.static(site.directory, {extensions: ['html', 'htm'], setHeaders}))
      siteApp.use(serveDir(site.directory, {icons: true}))
    }
  } else if (site.proxy) {
    // proxy site
    siteApp.all('*', (req, res) => {
      proxy.web(req, res, {target: site.proxy})
    })
  }
  return siteApp
}

function validateSiteCfg (site) {
  if (!HOSTNAME_REGEX.test(site.hostname)) {
    console.log('Invalid hostname "%s".', site.hostname)
    throw new Error('Invalid config')
  }
  if (site.url && !DAT_REGEX.test(site.url)) {
    console.error('Invalid Dat URL "%s". URLs must have the `dat://` scheme and the "raw" 64-character hex hostname.', site.url)
    throw new Error('Invalid config')
  }
  if (!site.url && !site.proxy) {
    console.log('Invalid config for "%s", must have a url or proxy configured.', site.hostname)
    throw new Error('Invalid config')
  }
}

function getDatKey (url) {
  return DAT_REGEX.exec(url)[1]
}
