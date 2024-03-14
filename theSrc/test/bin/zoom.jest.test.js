const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')
const loadWidget = require('../lib/loadWidget.helper')

const {
  configureImageSnapshotMatcher,
  puppeteerSettings,
  jestTimeout,
  testSnapshots,
} = renderExamplePageTestHelper

jest.setTimeout(jestTimeout)
configureImageSnapshotMatcher({ collectionIdentifier: 'zoom' })

describe('zoom', () => {
  let browser

  beforeAll(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterAll(async () => {
    await browser.close()
  })

  test('Zoom in with categorical x axis', async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.functionalTest.scatterplot_y_datetimes',
      width: 500,
      height: 500,
    })
    await scatterPlot.drag({ from: { x: 150, y: 150 }, to: { x: 250, y: 400 } })
    await testSnapshots({ page, testName: 'categorical_x_axis' })
    await page.close()
  })

  test('Zoom in with categorical y axis', async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.functionalTest.scatterplot_x_datetimes',
      width: 500,
      height: 500,
    })
    await scatterPlot.drag({ from: { x: 150, y: 150 }, to: { x: 400, y: 300 } })
    await testSnapshots({ page, testName: 'categorical_y_axis' })
    await page.close()
  })
})
