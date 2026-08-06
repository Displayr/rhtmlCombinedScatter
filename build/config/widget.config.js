const cliArgs = require('yargs').argv
const _ = require('lodash')

const config = {
  widgetEntryPoint: 'theSrc/scripts/rhtmlCombinedScatter.js',
  widgetFactory: 'theSrc/scripts/rhtmlCombinedScatter.factory.js',
  widgetName: 'rhtmlCombinedScatter',

  // NB no esbuildOptions crypto alias here. This repo briefly needed one, because bignumber.js@2 reaches
  // for crypto via require('cry' + 'pto') and esbuild -- unlike browserify -- constant-folds that and
  // resolves it, dragging 616 KiB of crypto-browserify into the bundle for a path nothing calls.
  // rhtmlBuildUtils 9.0.0 stubs crypto by default instead, so there is nothing to do here. See
  // rhtmlBuildUtils/src/lib/cryptoStub.js.
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
