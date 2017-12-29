#!/usr/bin/env node

const DatBoi = require('.')
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
          console.log(err)
        } else {
          console.log('Now running...')
          console.log(boi.localSites)
          console.log(boi.remoteSites)
        }
      })
    }
  })
  .alias('help', 'h')
  .parse()
