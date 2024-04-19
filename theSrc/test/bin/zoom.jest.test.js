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

  test('Zoom in after dragging label', async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.functionalTest.bubbleplot_simple',
      width: 500,
      height: 500,
    })
    await scatterPlot.movePlotLabel({ id: 1, x: -50, y: 50 })
    await scatterPlot.drag({ from: { x: 150, y: 200 }, to: { x: 350, y: 400 } })
    await testSnapshots({ page, testName: 'drag_and_zoom' })
    await page.close()
  })

  test('Zoom with small multiples', async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.legacy_bubble.bubbleplot_small_multiples_with_groups',
      width: 800,
      height: 500,
    })
    await scatterPlot.clickFirstLegendItem()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await scatterPlot.clickPlotlyAnnotation()
    await page.mouse.down()
    await page.mouse.move(600, 300)
    await page.mouse.up()
    await testSnapshots({ page, testName: 'small_multiples_before_zoom' })

    await scatterPlot.drag({ from: { x: 500, y: 200 }, to: { x: 800, y: 400 } })
    await testSnapshots({ page, testName: 'small_multiples_after_zoom' })
    await page.close()
  })
})
