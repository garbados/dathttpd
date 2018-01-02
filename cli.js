#!/usr/bin/env node

const DatBoi = require('.')
const chalk = require('chalk')
const pkg = require('./package.json')

require('yargs')
  .version(pkg.version)
  .option('config', {
    alias: 'c',
    description: 'Path to a JSON configuration file for DatBoi.',
    default: DatBoi.configPath,
    type: 'string',
    nargs: 1
  })
  .options('directory', {
    alias: 'd',
    description: 'Path to a directory in which to store archives and metadata.',
    default: DatBoi.directory,
    type: 'string',
    nargs: 1
  })
  .command({
    command: '$0',
    aliases: ['start'],
    desc: 'Start DatBoi.',
    builder: (yargs) => {
      yargs.options({
        port: {
          alias: 'p',
          desc: 'Specifies the port for DatBoi to listen on.',
          type: 'number',
          nargs: 1,
          default: DatBoi.port
        },
        peer: {
          alias: 'P',
          desc: 'If set, DatBoi will peer known sites as an archive that others can use as a sitelist.'
        },
        'no-upload': {
          alias: 'U',
          desc: 'If set, DatBoi will not upload data to peers. It will only perform downloads.'
        },
        'no-download': {
          alias: 'D',
          desc: 'If set, DatBoi will not download updates for sites and sitelists.'
        },
        'no-hostfile': {
          alias: 'H',
          desc: 'If set, DatBoi will not attempt to modify the user\'s hostfile.'
        },
        'no-server': {
          alias: 'S',
          desc: 'Do not activate the web server and instead only peer known archives. Use this to turn DatBoi into a dedicated Dat peer.'
        }
      })
    },
    handler: (argv) => {
      let boi = new DatBoi(getOptions(argv))
      boi.start(function (err) {
        if (err) {
          console.log(chalk.red(err))
        } else {
          if (boi.peerSites) {
            let dat = boi.multidat.list().filter((dat) => {
              return dat.path === boi.directory
            })[0]
            console.log('Peering known sites at dat://%s', dat.key.toString('hex'))
          }
          if (!boi.serve) {
            console.log('Now peering known sites.')
            printSites(boi)
          } else {
            console.log('Now sharing known sites on port %i.', boi.port)
            printSites(boi)
          }
        }
      })
    }
  })
  .command({
    command: 'list',
    aliases: ['ls'],
    desc: 'List known sites.',
    handler: (argv) => {
      let boi = new DatBoi(getOptions(argv))
      boi.init((err) => {
        if (err) return console.log(chalk.red(err))
        if (boi.sites.length) {
          printSites(boi)
        } else {
          console.log('No known sites.')
        }
      })
    }
  })
  .command({
    command: 'add <domain> <key> [options]',
    aliases: ['a'],
    desc: 'Add a new site.',
    handler: (argv) => {
      let boi = new DatBoi(getOptions(argv))
      boi.addSite(argv.domain, argv.key, (err) => {
        if (err) return console.log(chalk.red(err))
        console.log(`Added new site ${argv.domain} from ${argv.key}`)
      })
    }
  })
  .command({
    command: 'remove <domain>',
    aliases: ['rm'],
    desc: 'Remove a site by domain.',
    handler: (argv) => {
      let boi = new DatBoi(getOptions(argv))
      boi.removeSite(argv.domain, (err) => {
        if (err) return console.log(chalk.red(err))
        console.log(`Removed site ${argv.domain}`)
      })
    }
  })
  .command({
    command: 'add-list <key>',
    aliases: ['al'],
    desc: 'Add a new sitelist',
    handler: (argv) => {
      let boi = new DatBoi(getOptions(argv))
      boi.addSiteList(argv.key, (err) => {
        if (err) return console.log(chalk.red(err))
        console.log(`Added sitelist ${argv.key}`)
      })
    }
  })
  .command({
    command: 'remove-list <key>',
    aliases: ['rml'],
    desc: 'Remove a sitelist by key.',
    handler: (argv) => {
      let boi = new DatBoi(getOptions(argv))
      boi.removeSiteList(argv.key, (err) => {
        if (err) return console.log(chalk.red(err))
        console.log(`Removed sitelist ${argv.key}`)
      })
    }
  })
  .alias('help', 'h')
  .recommendCommands()
  .parse()

function getOptions (argv) {
  return {
    config: argv.config,
    directory: argv.directory,
    port: argv.port,
    peerSites: argv.peer,
    net: {
      upload: !argv['no-upload'],
      download: !argv['no-download']
    },
    dat: {
      live: true
    },
    modifyHostfile: !argv['no-hostfile'],
    serve: !argv['no-server']
  }
}

function printSites (boi) {
  boi.sites.forEach((site) => {
    console.log(chalk.bold(site.hostname))
    let fields = ['url', 'key', 'directory']
    fields.forEach((field) => {
      console.log(`  ${field}: ${site[field]}`)
    })
  })
}
