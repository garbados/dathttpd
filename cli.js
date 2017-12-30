#!/usr/bin/env node

const DatBoi = require('.')
const chalk = require('chalk')
const pkg = require('./package.json')

require('yargs')
  .version(pkg.version)
  .option('config', {
    alias: 'c',
    description: 'Path to a JSON configuration file for DatBoi.',
    default: DatBoi.CFG_PATH
  })
  .command({
    command: '$0',
    aliases: ['start'],
    desc: 'Start the server.',
    handler: (argv) => {
      let boi = new DatBoi(argv.config)
      boi.start(function (err) {
        if (err) {
          console.log(chalk.red(err))
        } else {
          if (boi.sites.length) {
            console.log('Now serving on port %i:', boi.port)
            printSites(boi)
          } else {
            console.log('Now listening on port %i', boi.port)
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
      let boi = new DatBoi(argv.config)
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
      let boi = new DatBoi(argv.config)
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
      let boi = new DatBoi(argv.config)
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
      let boi = new DatBoi(argv.config)
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
      let boi = new DatBoi(argv.config)
      boi.removeSiteList(argv.key, (err) => {
        if (err) return console.log(chalk.red(err))
        console.log(`Removed sitelist ${argv.key}`)
      })
    }
  })
  .alias('help', 'h')
  .recommendCommands()
  .parse()

function printSites (boi) {
  boi.sites.forEach((site) => {
    console.log(chalk.bold(site.hostname))
    let fields = ['url', 'key', 'directory']
    fields.forEach((field) => {
      console.log(`  ${field}: ${site[field]}`)
    })
  })
}
