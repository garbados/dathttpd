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
          boi.sites.forEach((site) => {
            console.log(chalk.bold(site.hostname))
            let fields = ['url', 'key', 'directory']
            fields.forEach((field) => {
              console.log(`  ${field}: ${site[field]}`)
            })
          })
        }
      })
    }
  })
  .alias('help', 'h')
  .parse()
