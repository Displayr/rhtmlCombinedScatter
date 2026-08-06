const path = require('path')
const cliArgs = require('yargs').argv
const _ = require('lodash')

const config = {
  widgetEntryPoint: 'theSrc/scripts/rhtmlCombinedScatter.js',
  widgetFactory: 'theSrc/scripts/rhtmlCombinedScatter.factory.js',
  widgetName: 'rhtmlCombinedScatter',

  // Keeps node's crypto out of the shipped bundle, restoring what browserify produced.
  //
  // bignumber.js@2.4.0 line 2730 reads:
  //
  //     if ( !cryptoObj ) try { cryptoObj = require('cry' + 'pto'); } catch (e) {}
  //
  // The concatenation and the try/catch are deliberate: they stop a bundler statically resolving crypto,
  // and browserify duly left it as a runtime require that simply failed in the browser. esbuild is
  // cleverer -- it constant-folds 'cry' + 'pto' -- so it DOES resolve it, and rhtmlBuildUtils then aliases
  // crypto to crypto-browserify. That pulled 616 KiB across 180 files (elliptic, four copies of bn.js,
  // asn1.js, browserify-sign, diffie-hellman, ...) into the bundle, taking it from 1651 to 2341 KiB.
  //
  // Measured with esbuild's metafile: stubbing crypto gives 1704 KiB against browserify's 1651 KiB, so
  // nearly the whole difference was crypto and the bundler swap itself costs ~53 KiB. Safe because
  // BigNumber.random is the only thing that uses it and this widget never calls it -- the old bundle
  // shipped without any crypto implementation for years.
  //
  // Only the crypto key is overridden; rhtmlBuildUtils deep-merges this, so its buffer/stream/events
  // aliases stay in place for anything that genuinely needs them.
  esbuildOptions: {
    alias: { crypto: path.join(__dirname, 'emptyCryptoShim.js') }
  },
  internalWebSettings: {
    isReadySelector: 'div[rhtmlwidget-status=ready]',
    singleWidgetSnapshotSelector: '.rhtmlwidget-outer-svg',
    default_border: true,
    css: [
      '/styles/rhtmlCombinedScatter.css',
    ],
  },
  snapshotTesting: {
    consoleLogHandler: (msg, testName) => {
      const statsLineString = _(msg.args())
        .map(arg => `${arg}`)
        .filter(arg => arg.match(/duration/))
        .first()

      if (statsLineString) {
        const statsStringMatch = statsLineString.match('^JSHandle:(.+)$')
        if (statsStringMatch) {
          const stats = JSON.parse(statsStringMatch[1])
          console.log(JSON.stringify(_.assign(stats, { scenario: testName })))
        }
      }
    },
    pixelmatch: {
      // smaller values -> more sensitive : https://github.com/mapbox/pixelmatch#pixelmatchimg1-img2-output-width-height-options
      customDiffConfig: {
        threshold: 0.1,
      },
      failureThreshold: 0.0001,
      failureThresholdType: 'percent', // pixel or percent
    },
    assertNoLogError: false,

    // Ubuntu 24.04 restricts unprivileged user namespaces via AppArmor, which
    // breaks Chrome's sandbox on CI runners. --disable-dev-shm-usage avoids
    // crashes from the small default /dev/shm in containers.
    puppeteer: {
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },

    // Selects theSrc/test/snapshots/ci/<branch>/. Set here rather than passed
    // as --env=ci, because rhtmlBuildUtils constrains that option to
    // choices: ['local', 'travis'] and yargs would reject 'ci'. Command-line
    // --env still wins, so `npm run localTest` keeps using 'local'.
    env: 'ci',
  },
}

const commandLineOverides = _.omit(cliArgs, ['_', '$0'])
const mergedConfig = _.merge(config, commandLineOverides)

module.exports = mergedConfig
