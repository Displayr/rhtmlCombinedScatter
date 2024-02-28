const puppeteer = require('puppeteer')
const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')
const loadWidget = require('../lib/loadWidget.helper')

const {
  configureImageSnapshotMatcher,
  puppeteerSettings,
  testSnapshots,
  jestTimeout,
} = renderExamplePageTestHelper

jest.setTimeout(jestTimeout)
configureImageSnapshotMatcher({ collectionIdentifier: 'multipleRerender' })

describe('multiple render tests', () => {
  let browser

  beforeAll(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterAll(async () => {
    const pages = await browser.pages();
    for (let i = 0; i < pages.length; i++) {
      await pages[i].close();
    }

    await browser.close()
  })

  test('rerender works', async function () {
    const originalConfig = 'data.bdd.three_point_brand'
    const newConfig = 'data.bdd.four_point_brand'

    const { page } = await loadWidget({
      browser,
      configName: originalConfig,
      width: 1000,
      height: 600,
      rerenderControls: true,
    })

    await testSnapshots({ page, testName: 'initial' })

    await page.evaluate(() => { document.querySelector('.example-0 .rerender-config').value = '' })
    // await page.type('.example-0 .rerender-config', newConfig, { delay: 0 })
    await page.click('.rerender-button')

    await page.waitForFunction(selectorString => {
      return document.querySelectorAll(selectorString).length
    }, { timeout: 10000 }, 'body[widgets-ready], .main-svg, .rhtml-error-container')

    await testSnapshots({ page, testName: 'final' })

    await page.close()
  })
})
