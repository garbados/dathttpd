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
          console.log(`Now serving on port ${boi.port}:`)
          printSites(boi)
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
        printSites(boi)
      })
    }
  })
  .command({
    command: 'add-site <domain> <key> [options]',
    aliases: ['add', 'a'],
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
    command: 'remove-site <domain>',
    aliases: ['remove', 'rm'],
    desc: 'Remove a site by domain.',
    handler: (argv) => {
      let boi = new DatBoi(argv.config)
      boi.removeSite(argv.domain, (err) => {
        if (err) return console.log(chalk.red(err))
        console.log(`Removed site ${argv.domain}`)
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
