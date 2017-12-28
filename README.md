# DatBoi [![stability][0]][1] [![js-standard-style][2]][3]

[![build status][4]][5]

A local-only, offline-first web server for [Dat](https://datprotocol.com) archives.

Here's a usage example:

```
$ npm i -g dat-boi
$ dat-boi start &
$ dat-boi site add home.bovid dat://c33bc8d7c32a6e905905efdbf21efea9ff23b00d1c3ee9aea80092eaba6c4957/
$ curl home.bovid
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

  <!-- about -->

  <meta name="description" content="Cows are the silent jury in the trial of mankind.">
...
```

DatBoi allows you to bind arbitrary domain names to Dat archives. It rehosts these archives locally so that visiting these domain names with a browser serves content right from your computer. This keeps your traffic private, eliminates network latency, and subverts DNS so you never have to buy another domain.

To do this, DatBoi binds to port 80 and adds entries to your local hostfile that map these domain names to 127.0.0.1. It requires root permissions, such as by running with `sudo`. I hope to find [a better way](https://github.com/garbados/dat-boi/issues/8).

You can also use DatBoi to share your domains with others, and to add their domains to your local instance. Here is an example:

```
$ dat-boi sitelist add [key]
# curl secret.blog
<!DOCTYPE html>
...
```

The goal is to allow people to share content and web applications at human-readable names with friends by relying on each other for domain name resolution rather than centralized or authoritative systems. Visiting sites rehosted by a locally-running instance of DatBoi means your traffic never leaves your computer, and you can visit these sites using any browser that recognizes your hostfile.

## Install

You can install DatBoi with [npm](https://www.npmjs.com/):

```
npm i -g dat-boi
```

Now you can run `dat-boi`. Try running `dat-boi -h` for usage information.

## Usage

When you first run `dat-boi` you can either pass it a config file with `-c, --config` or it will prompt you for some basics:

```
$ dat-boi -c ~/.dat-boi.json
# or
$ dat-boi
Where should DatBoi store archives? (default: ~/.dat-boi.json)
>
...
```

Once `dat-boi` is running, you can other CLI commands to update its configuration, such as by adding sites. The running instance watches its config for changes and updates itself accordingly. So, you can immediately start adding sites and sitelists:

```
```

To daemonify DatBoi on systems that use systemd, you can use [add-to-systemd](https://www.npmjs.com/package/add-to-systemd):

```
# install the helper tool
npm install -g add-to-systemd

# create a systemd entry for dat-boi
add-to-systemd dat-boi --user $(whoami) `which dat-boi`

# start the dat-boi service
sudo systemctl start dat-boi
```

### Options and Commands

Options:

- `-c, --config`: Path to a JSON file to use to configure DatBoi. Default: `~/.dat-boi.json`
- `-d, --directory`: Path to a directory in which to store archives and metadata. Default: `~/.dat-boi`
- `-h, --help`: Print usage information and exit.

Commands:

- `start [options]`: An alias of the default command. Starts the server. It has some options specific to it:
    - `-P, --peer`: If set, DatBoi will peer the user's `sites` config as an archive that others can use as a sitelist.
    - `-U, --no-upload`: If set, DatBoi will not upload data to peers. It will only perform downloads.
- `site add <domain> <url>`: Add a site that resolves the given domain to the Dat archive behind the given URL.
- `site remove <domain>`: Remove a site and its hostfile entry. If no other site references its archive, it will be removed too.
- `sitelist add <url>`: Add a sitelist and all of its site entries.
- `sitelist remove <url>`: Remove a sitelist and all of its site entries. Archives which are not referenced by any remaining site are also removed.

You can also run `dat-boi -h` to print this usage information.

## Contributing

[Report any issues](https://github.com/garbados/dat-boi/issues) you have along the way!

## License

[MIT](./LICENSE)

[0]: https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square
[1]: https://nodejs.org/api/documentation.html#documentation_stability_index
[2]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[3]: https://github.com/feross/standard
[4]: https://img.shields.io/travis/garbados/dat-boi/master.svg?style=flat-square
[5]: https://travis-ci.org/garbados/dat-boi
