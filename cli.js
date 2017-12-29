#!/usr/bin/env node

const DatBoi = require('..')
const pkg = require('../package.json')

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
      boi.start(function () {
        console.log('Now running...')
        console.log(arguments)
        console.log(boi)
      })
    }
  })
  .alias('help', 'h')
  .parse()
