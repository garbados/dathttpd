exports.approveDomains = function (cfg) {
  var domains = Object.keys(cfg.sites) || []
  return async (options, certs, cb) => {
    var {domain} = options
    options.agreeTos = true
    options.email = cfg.letsencrypt.email

    // is this one of our sites?
    if (domains.indexOf(domain) !== -1) {
      cb(null, {options, certs})
    }

    cb(new Error('Invalid domain'))
  }
}
