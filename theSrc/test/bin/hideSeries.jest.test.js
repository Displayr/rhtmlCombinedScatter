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
configureImageSnapshotMatcher({ collectionIdentifier: 'hideSeries' })

describe('hide series', () => {
  let browser

  beforeAll(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterAll(async () => {
    await browser.close()
  })

  test('Hide series', async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.legacy_bubble.bubbleplot_colas',
      width: 650,
      height: 570,
    })
    await scatterPlot.clickFirstLegendItem()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await testSnapshots({ page, testName: 'hide_series' })
    await page.close()
  })

  test('Hide series with small multiples', async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.legacy_bubble.bubbleplot_small_multiples_with_groups',
      width: 800,
      height: 500,
    })
    await scatterPlot.clickFirstLegendItem()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await testSnapshots({ page, testName: 'hide_series_with_small_multiples' })
    await page.close()
  })
})
