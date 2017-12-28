#!/usr/bin/env node

var manager = require('../lib/manager')
var pkg = require('../package.json')

require('yargs')
  .version(pkg.version)
  .option('config', {
    alias: 'c',
    description: 'Path to a configuration file in YAML for DatHTTPD.',
    default: manager.CFG_PATH
  })
  .command({
    command: '$0',
    aliases: ['start'],
    desc: 'Start the server.',
    handler: (argv) => {
      manager.start(argv.config)
    }
  })
  .alias('help', 'h')
  .parse()
