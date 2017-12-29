#!/usr/bin/env node

const DatBoi = require('.')
const chalk = require('chalk')
const pkg = require('./package.json')

require('yargs')
  .version(pkg.version)
  .option('config', {
    alias: 'c',
    description: 'Path to a configuration file in YAML for DatHTTPD.',
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
    desc: 'List all sites known to DatBoi',
    handler: (argv) => {
      let boi = new DatBoi(argv.config)
      boi.init((err) => {
        if (err) return console.log(chalk.red(err))
        printSites(boi)
      })
    }
  })
  .alias('help', 'h')
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
