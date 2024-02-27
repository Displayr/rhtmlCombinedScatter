const { snapshotTesting: { renderExamplePageTestHelper } } = require('rhtmlBuildUtils')

const {
  getExampleUrl,
} = renderExamplePageTestHelper

const ScatterPlotPage = require('./scatterPlotPage')

// TODO the 'data.bdd.three_point_brand' default is questionable but serves this suite ...
const waitForScatterplotToLoad = async ({ page }) => page.waitForFunction(selectorString => {
  return document.querySelectorAll(selectorString).length
}, { timeout: 3000 }, 'body[widgets-ready], .main-svg, .rhtml-error-container')

const loadWidget = async ({
  browser,
  configName = 'data.bdd.three_point_brand',
  stateName,
  width = 1000,
  rerenderControls,
  height = 600,
}) => {
  console.log('creating new page')
  const page = await browser.newPage()
  const url = getExampleUrl({ configName, stateName, rerenderControls, width, height })
  console.log('going to url: ' + url)
  const scatterPlot = new ScatterPlotPage(page)
  console.log('creating new scatterplot page')
  await page.goto(url)
  console.log('waiting for scatterplot to load') 
  await waitForScatterplotToLoad({ page })

  return { page, scatterPlot }
}

module.exports = loadWidget
