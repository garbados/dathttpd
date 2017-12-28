# dathttpd [![stability][0]][1] [![js-standard-style][2]][3]

[![build status][4]][5]

A Web server for [Dat](https://datprotocol.com) and HTTPS.

This is a divergent fork of [beakerbrowser/dathttpd](https://github.com/beakerbrowser/dathttpd), meaning I hope to issue PRs from it but organizing changes into PRs takes time I might rather put into building more features. If this package diverges to the point that it's really a separate project, I'll rename it.

Here are the fork's current intended additional features:

- [x] Provide a setting `localhost` for users running DatHTTPD on client environments, e.g. their computer. [The current implementation](https://github.com/garbados/dathttpd/commit/15302808f6dd81c23fca5544015af99ca092b597) creates hostfile entries for each site in the `sites` portion of the config, so that users can visit these sites in their browser without sending traffic over the internet and without using external DNS records. *Note: Modifying the user's hostfile (ex: /etc/hosts) requires the use of sudo or otherwise having root permissions, which is an awful lot of trust to require from a user. I'd rather find a different solution that requires fewer privileges.*
- [x] Provide a setting `peersites` which, if set to a truthy value, creates and peers an archive containing only a `dat.json` file whose `sites` attribute maps to the `sites` portion of your DatHTTPD config file. [The current implementation](https://github.com/garbados/dathttpd/pull/1/commits/f492e46c44dd5c9b0853117ae43b048e92d863ac) treats the server's storage directory as the archive, using a `.datignore` file to share only a `dat.json` which contains only a `sites` attribute.
- [x] Provide a setting `sitelists` that interprets a list of URLs (`dat://` or otherwise) as archives which contain the `sites` portion of a DatHTTPD config file as the `sites` attribute of the archive's `dat.json`. [The current implementation](https://github.com/garbados/dathttpd/pull/1/commits/f492e46c44dd5c9b0853117ae43b048e92d863ac#diff-c945a46d13b34fcaff544d966cffcabaR114) collects manifests from each sitelist archive and merges their `sites` attributes into `this.remotesites`, which is then interpreted just like `this.sites`.
- [ ] CLI commands for modifying the local config, such as the `sites` and `sitelists` attributes.
- [ ] A substantial test suite with coverage above 80%.

The goal is to allow people to share content and web applications at human-readable names with friends by relying on each other for domain name resolution, rather than centralized or authoritative systems. Visiting sites rehosted by a locally-running instance of DatHTTPD means your traffic never leaves your computer, and you can visit these sites using any browser that recognizes your hostfile.

## Install

DatHTTPD has some dependencies. On systems with `apt-get` like Ubuntu, you can install them like this:

```
sudo apt-get install libtool m4 automake
```

You can then install DatHTTPD with [npm](https://www.npmjs.com/):

```
npm i -g dathttpd
```

Now you can run `dathttpd`. Try running `dathttpd -h` for usage information.

## Usage

First, create a config file at `~/.dathttpd.yml`:

```yaml
letsencrypt:
  email: 'bob@foo.com'
  agreeTos: true
sites:
  dat.local:
    url: dat://1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03/
    datOnly: false
  datprotocol.dat.local:
    url: dat://ff34725120b2f3c5bd5028e4f61d14a45a22af48a7b12126d5d588becde88a93/
    datOnly: true
```

Then give node permissions to use ports 80 and 443:

```
sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
```

Then you can start `dathttpd`:

```
dathttpd
```

To daemonify the server in Debian-based systems, stop the dathttpd process and then run:

```
# install a helper tool
npm install -g add-to-systemd

# create a systemd entry for dathttpd
sudo `which add-to-systemd` dathttpd --user $(whoami) `which dathttpd`

# start the dathttpd service
sudo systemctl start dathttpd
```

## Config

Here's an example `~/.dathttpd.yml`:

```yaml
ports:
  http: 80
  https: 443
  metric: 8089
directory: ~/.dathttpd
letsencrypt:
  email: 'bob@foo.com'
  agreeTos: true
localhost: false
metrics: true
sites:
  dat.local:
    url: dat://1f968afe867f06b0d344c11efc23591c7f8c5fb3b4ac938d6000f330f6ee2a03/
    datOnly: false
  datprotocol.dat.local:
    url: dat://ff34725120b2f3c5bd5028e4f61d14a45a22af48a7b12126d5d588becde88a93/
    datOnly: true
  proxy.local:
    proxy: http://localhost:8080
```

### ports.http

The port to serve the HTTP sites. Defaults to 80. (Optional)

HTTP automatically redirects to HTTPS.

### ports.https

The port to serve the HTTPS sites. Defaults to 443. (Optional)

### ports.metric

The port to serve the prometheus metrics. Defaults to 8089. (Optional)

### directory

The directory where dathttpd will store your Dat archive's files. Defaults to ~/.dathttpd. (Optional)

### letsencrypt

Settings for LetsEncrypt. If false or unset, HTTPS will be disabled.

### letsencrypt.email

The email to send Lets Encrypt? notices to. (Required)

### letsencrypt.agreeTos

Do you agree to the terms of service of Lets Encrypt? (Required, must be true)

### localhost

Whether to modify the local hostfile so that requests for the domains of sites being served by DatHTTPD resolve to localhost. Defaults to false. (Optional)

This way, sites served by DatHTTPD will be available on your computer at their given domain names without the use of external DNS records. This is useful when you are running DatHTTPD locally rather than on a remote server, and you don't want to rely on external DNS.

### metrics

Whether to run the metrics server. Defaults to true. (Optional)

### peersites

Whether to peer the user's `sites` config as an archive. If set to true, DatHTTPD will print the key of the archive of the user's sitelist. Friends can use this key to include your sites on their local DatHTTPD instance.

### sitelists

An array of `dat://` addresses for archives with a `dat.json` file whose `sites` attribute corresponds to the `sites` portion of a DatHTTPD config. Archives specified in `sitelists` have their sites added to the users' own.

### sites

A listing of the sites to host. Each site is labeled (keyed) by the hostname you want the site to serve at.

Sites can either host dat archives or proxy to a URL. To make a dat-site, set the `url` attribute. To make a proxy, set the `proxy` attribute.

You'll need to configure the DNS entry for the hostname to point to the server. For instance, if using `site.myhostname.com`, you'll need a DNS entry pointing `site.myhostname.com` to the server.

### sites.{hostname}.url

The Dat URL of the site to host.

### sites.{hostname}.proxy

The HTTP URL of the site to proxy.

### sites.{hostname}.datOnly

If true, rather than serve the assets over HTTPS, dathttpd will serve a redirect to the dat:// location. Defaults to false. (Optional)

### sites.{hostname}.hsts

If true, serve the [HSTS header](https://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security). You can specify how long the strict-transport rule lasts as the value. (parsed using [the ms module](https://www.npmjs.com/package/ms)). If `true` is given, will default to 7 days. Defaults to false. (Optional)

## Env Vars

  - `DATHTTPD_CONFIG=cfg_file_path` specify an alternative path to the config than `~/.dathttpd.yml`
  - `NODE_ENV=debug|staging|production` set to `debug` or `staging` to use the lets-encrypt testing servers.

## Metrics Dashboard

DatHTTPD has built-in support for [Prometheus](https://prometheus.io), which can be visualized by [Grafana](http://grafana.org/).

![./grafana-screenshot.png](./grafana-screenshot.png)

DatHTTPD exposes its metrics at port 8089. Prometheus periodically scrapes the metrics, and stores them in a database. Grafana provides a nice dashboard. It's a little daunting at first, but setup should be relatively painless.

Follow these steps:

 1. [Install Prometheus](https://prometheus.io/download/) on your server.
 2. [Install Grafana](http://grafana.org/download/) on your server.
 3. Update the `prometheus.yml` config.
 4. Start prometheus and grafana.
 5. Login to grafana.
 6. Add prometheus as a data source to grafana. (It should be running at localhost:9090.)
 7. Import [this grafana dashboard](./grafana-dashboard.json).

Your prometheus.yml config should include have the scrape_configs set like this:

```yml
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
  - job_name: 'dathttpd'
    static_configs:
      - targets: ['localhost:8089']
```

## Contributing

[Report any issues](https://github.com/garbados/dathttpd/issues) you have along the way!

## License

[MIT](./LICENSE)

[0]: https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square
[1]: https://nodejs.org/api/documentation.html#documentation_stability_index
[2]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[3]: https://github.com/feross/standard
[4]: https://img.shields.io/travis/garbados/dathttpd/master.svg?style=flat-square
[5]: https://travis-ci.org/garbados/dathttpd
