const cliArgs = require('yargs').argv
const _ = require('lodash')

const config = {
  widgetEntryPoint: 'theSrc/scripts/rhtmlCombinedScatter.js',
  widgetFactory: 'theSrc/scripts/rhtmlCombinedScatter.factory.js',
  widgetName: 'rhtmlCombinedScatter',
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
    assertNoLogError: false
  },
}

const commandLineOverides = _.omit(cliArgs, ['_', '$0'])
const mergedConfig = _.merge(config, commandLineOverides)

module.exports = mergedConfig
