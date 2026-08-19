const { snapshotTesting: { puppeteer, renderExamplePageTestHelper } } = require('rhtmlBuildUtils')
const loadWidget = require('../lib/loadWidget.helper')

const {
  configureImageSnapshotMatcher,
  puppeteerSettings,
  jestTimeout,
  testSnapshots,
  testState,
} = renderExamplePageTestHelper

jest.setTimeout(jestTimeout)
configureImageSnapshotMatcher({ collectionIdentifier: 'stateInteractions' })

// NB these do not need to be persistent over time. The Ids are a convenience used to isolate tests via jest -t '11:'
let testId = 0

describe('state interactions', () => {
  let browser

  beforeAll(async () => {
    browser = await puppeteer.launch(puppeteerSettings)
  })

  afterAll(async () => {
    await browser.close()
  })

  // label actions 1-5
  test(`${++testId}: Drag a label`, async function () {
    const { page, scatterPlot } = await loadWidget({ browser })

    await testSnapshots({ page, testName: 'initial_three_point' })

    await scatterPlot.movePlotLabel({ id: 0, x: 50, y: -50 })

    await scatterPlot.moveMouseOffWidget()
    await testSnapshots({ page, testName: 'after_porche_drag_on_canvas' })
    await testState({ page, stateName: 'data.bdd.three_point_brand_state.porche_label_moved_50x50', tolerance: 1 })

    await page.close()
  })

  test(`${++testId}: Load saved state and see a user positioned label`, async function () {
    const { page } = await loadWidget({
      browser,
      stateName: 'data.bdd.three_point_brand_state.porche_label_moved_50x50',
    })

    await testSnapshots({ page, testName: 'after_porche_drag_on_canvas' })

    await page.close()
  })

  test(`${++testId}: Drag a label to the legend`, async function () {
    const { page, scatterPlot } = await loadWidget({ browser })

    await testSnapshots({ page, testName: 'initial_three_point' })

    await scatterPlot.movePlotLabelToLegend({ id: 0 })

    await scatterPlot.moveMouseOffWidget()
    await testSnapshots({ page, testName: 'after_porche_drag_to_legend' })
    await testState({ page, stateName: 'data.bdd.three_point_brand_state.porche_label_moved_to_legend', tolerance: 1 })

    await page.close()
  })

  test(`${++testId}: Load saved state and see a user positioned label on the legend`, async function () {
    const { page } = await loadWidget({
      browser,
      stateName: 'data.bdd.three_point_brand_state.porche_label_moved_to_legend',
    })

    await testSnapshots({ page, testName: 'after_porche_drag_to_legend' })

    await page.close()
  })

  test(`${++testId}: Drag label from legend and snap to original position`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      stateName: 'data.bdd.three_point_brand_state.porche_label_moved_to_legend',
    })

    await scatterPlot.moveLegendLabelToPlot({ id: 0 })

    await testSnapshots({ page, testName: 'initial_three_point' })
    await testState({ page, stateName: 'data.bdd.three_point_brand_state.back_to_original', tolerance: 1 })

    await page.close()
  })

  test(`${++testId}: Drag a label to the legend, then reposition marker`, async function () {
    const { page, scatterPlot } = await loadWidget({ browser })

    await testSnapshots({ page, testName: 'initial_three_point' })

    await scatterPlot.movePlotLabelToLegend({ id: 0 })
    await scatterPlot.movePlotLabel({ id: 0, x: 50, y: -50 })

    await testSnapshots({ page, testName: 'after_porche_drag_to_legend_and_reposition_1_marker' })
    await testState({ page, stateName: 'data.bdd.three_point_brand_state.porche_label_moved_to_legend_and_reposition_1_marker', tolerance: 1 })

    await page.close()
  })

  // image label actions 1-5
  test(`${++testId}: Drag a image label`, async function () {
    const { page, scatterPlot } = await loadWidget({ browser })

    await testSnapshots({ page, testName: 'initial_three_point' })

    await scatterPlot.movePlotLabel({ id: 2, x: 200, y: 100 })

    await scatterPlot.moveMouseOffWidget()
    await testSnapshots({ page, testName: 'after_apple_drag_on_canvas' })
    await testState({ page, stateName: 'data.bdd.three_point_brand_state.apple_label_moved_200x100', tolerance: 1 })

    await page.close()
  })

  test(`${++testId}: Load saved state and see a user positioned image label`, async function () {
    const { page } = await loadWidget({
      browser,
      stateName: 'data.bdd.three_point_brand_state.apple_label_moved_200x100',
    })

    await testSnapshots({ page, testName: 'after_apple_drag_on_canvas' })

    await page.close()
  })

  test(`${++testId}: Drag a image label to the legend`, async function () {
    const { page, scatterPlot } = await loadWidget({ browser })

    await testSnapshots({ page, testName: 'initial_three_point' })

    await scatterPlot.movePlotLabelToLegend({ id: 2 })

    await scatterPlot.moveMouseOffWidget()
    await testSnapshots({ page, testName: 'after_apple_drag_to_legend' })
    await testState({ page, stateName: 'data.bdd.three_point_brand_state.apple_label_moved_to_legend', tolerance: 1 })

    await page.close()
  })

  test(`${++testId}: Load saved state and see a user positioned image label on the legend`, async function () {
    const { page } = await loadWidget({
      browser,
      stateName: 'data.bdd.three_point_brand_state.apple_label_moved_to_legend',
    })

    await testSnapshots({ page, testName: 'after_apple_drag_to_legend' })

    await page.close()
  })

  // Commenting out because dragging the legend label doesn't work here (somehow it works in a previous test)
  // test(`${++testId}: Drag image label from legend and snap to original position`, async function () {
  //   const { page, scatterPlot } = await loadWidget({
  //     browser,
  //     stateName: 'data.bdd.three_point_brand_state.apple_label_moved_to_legend',
  //   })

  //   await scatterPlot.moveLegendLabelToPlot({ id: 2 })
  //   await testSnapshots({ page, testName: 'initial_three_point' })
  //   await testState({ page, stateName: 'data.bdd.three_point_brand_state.back_to_original', tolerance: 1 })

  //   await page.close()
  // })

  // bubble label actions 1-5
  test(`${++testId}: Drag a bubble label`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.bdd.bubbleplot_simple',
      width: 600,
      height: 600,
    })

    await testSnapshots({ page, testName: 'initial_bubble' })

    await scatterPlot.movePlotLabel({ id: 2, x: 100, y: 100 })

    await scatterPlot.moveMouseOffWidget()
    await testSnapshots({ page, testName: 'after_bubble_drag_on_canvas' })
    await testState({ page, stateName: 'data.bdd.bubbleplot_simple_state.label_moved_100x100', tolerance: 2 })

    await page.close()
  })

  // NB XXX this shows an issue where I move -> state, then reload with state and image is slightly diff
  test(`${++testId}: Load saved state and see a user positioned bubble label`, async function () {
    const { page } = await loadWidget({
      browser,
      configName: 'data.bdd.bubbleplot_simple',
      stateName: 'data.bdd.bubbleplot_simple_state.label_moved_100x100',
      width: 600,
      height: 600,
    })

    await testSnapshots({ page, testName: 'after_bubble_drag_on_canvas' })

    await page.close()
  })

  test(`${++testId}: Drag a bubble label to the legend`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.bdd.bubbleplot_simple',
      width: 600,
      height: 600,
    })

    await testSnapshots({ page, testName: 'initial_bubble' })

    await scatterPlot.movePlotLabelToLegend({ id: 2 })

    await testSnapshots({ page, testName: 'after_bubble_drag_to_legend_showing_reset' })
    await testState({ page, stateName: 'data.bdd.bubbleplot_simple_state.label_moved_to_legend', tolerance: 1 })

    await page.close()
  })

  test(`${++testId}: Load saved state and see a user positioned bubble label on the legend`, async function () {
    const { page } = await loadWidget({
      browser,
      configName: 'data.bdd.bubbleplot_simple',
      stateName: 'data.bdd.bubbleplot_simple_state.label_moved_to_legend',
      width: 600,
      height: 600,
    })

    await testSnapshots({ page, testName: 'after_bubble_drag_to_legend' })

    await page.close()
  })

  test(`${++testId}: Drag bubble label from legend and snap to original position`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.bdd.bubbleplot_simple',
      stateName: 'data.bdd.bubbleplot_simple_state.label_moved_to_legend',
      width: 600,
      height: 600,
    })

    await scatterPlot.moveLegendLabelToPlot({ id: 2 })

    await testSnapshots({ page, testName: 'initial_bubble' })
    await testState({ page, stateName: 'data.bdd.bubbleplot_simple_state.back_to_original', tolerance: 1 })

    await page.close()
  })

  // complex legend interactions
  test(`${++testId}: Drag labels causes bounds to recalculate, and markers are used for out of bounds labels`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.bdd.legend_drag_test_plot',
      width: 600,
      height: 600,
    })

    await testSnapshots({ page, testName: 'initial_legend_drag_test_plot' })

    await scatterPlot.movePlotLabelToLegend({ id: 0 })
    await scatterPlot.movePlotLabelToLegend({ id: 3 })
    await scatterPlot.movePlotLabelToLegend({ id: 4 })
    await scatterPlot.movePlotLabelToLegend({ id: 7 })

    await testSnapshots({ page, testName: 'legend_drag_test_plot_four_outliers_dragged_to_legend' })

    await scatterPlot.movePlotLabelToLegend({ id: 8 })
    await scatterPlot.movePlotLabelToLegend({ id: 9 })
    await scatterPlot.movePlotLabelToLegend({ id: 10 })
    await scatterPlot.movePlotLabelToLegend({ id: 11 })

    await testSnapshots({ page, testName: 'legend_drag_test_plot_eight_outliers_dragged_to_legend' })

    await testState({ page, stateName: 'data.bdd.legend_drag_test_plot_state.eight_outliers_dragged_to_legend', tolerance: 0 })

    await page.close()
  })

  test(`${++testId}: Load saved state and see scatterplot with scolled legend and dragged points`, async function () {
    const { page } = await loadWidget({
      browser,
      configName: 'data.bdd.scatterplot_yaxis_not_visible',
      stateName: 'data.bdd.scatterplot_yaxis_not_visible_state.legend_truncation',
      width: 755,
      height: 250,
    })

    await testSnapshots({ page, testName: 'legend_truncation' })

    await page.close()
  })

  test(`${++testId}: Drag image in a trendline plot`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.functionalTest.trendlines.logos_tech_trends',
      width: 600,
      height: 600,
    })

    await testSnapshots({ page, testName: 'initial_trendline' })

    await scatterPlot.movePlotLabel({ id: 3, x: 100, y: 100 }) // move IBM logo

    await testSnapshots({ page, testName: 'trendline_after_dragging_ibm_logo' })

    await page.close()
  })

  // Re-enabled in RS-23047. It was disabled with "works locally but not in CircleCI (clicking on a
  // marker doesn't toggle the label)".
  //
  // NB the drag below is load bearing, not scene setting. LabeledScatter puts its labels in .draglayer
  // ABOVE .nsewdrag and they are real hit targets, so an unmoved label sits over its own marker and
  // swallows the click -- which is what made this look broken. Dragging label 0 away is what makes
  // marker 0 clickable at all, so the state assertion after it is guarding the precondition for
  // everything below. See the note on dispatchMarkerClick in scatterPlotPage.js.
  test(`${++testId}: Initialise plot with only some labels shown and toggle labels`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.bdd.bubbleplot_maxlabels',
      width: 600,
      height: 600,
    })

    await testSnapshots({ page, testName: 'bubble_maxlabels' })

    await scatterPlot.movePlotLabel({ id: 0, x: 100, y: 100 })

    // NB asserted rather than assumed: the drag leaves no trace in any of the three snapshots, because
    // the label it moves is the one the click then hides. Without this, movePlotLabel could silently
    // stop moving anything and all three baselines would still match.
    const draggedState = await scatterPlot.getState()
    // NB defaulted: in the very case this guards -- movePlotLabel doing nothing -- the latest state is
    // the one State's constructor publishes, which carries no userPositionedLabs, so reading .map on it
    // would throw a TypeError that reads like a broken test rather than a broken drag.
    expect((draggedState.userPositionedLabs || []).map(({ id }) => id)).toContain(0)

    await scatterPlot.dispatchMarkerClick({ expectToggle: true })

    // The drag leaves the pointer inside the widget, which shows the hover-gated Reset control. Park it
    // so these baselines record the labels, not whether a pointer happened to be resting on the plot.
    await scatterPlot.moveMouseOffWidget()
    await testSnapshots({ page, testName: 'labels_after_toggling' })

    await scatterPlot.clickResetButton()
    await scatterPlot.moveMouseOffWidget()
    await testSnapshots({ page, testName: 'labels_after_reset' })

    await page.close()
  })

  test(`${++testId}: Load saved state and see a user hidden label`, async function () {
    const { page } = await loadWidget({
      browser,
      stateName: 'data.bdd.three_point_brand_state.label1_hidden',
    })

    await testSnapshots({ page, testName: 'after_label1_hidden' })

    await page.close()
  })

  test(`${++testId}: Move and hide labels in smallmultiples and save`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.displayr_regression.set9.colorscale_numeric_smallmultiples_no_titles',
      width: 576,
      height: 512
    })
    await scatterPlot.clickPlotlyAnnotation()
    await page.mouse.down()
    await page.mouse.move(200, 200)
    await page.mouse.up()
    await testState({ page, stateName: 'data.displayr_regression.set9.colorscale_numeric_smallmultiples_state.after_drag', tolerance: 0 })
    await testSnapshots({ page, testName: 'smallmultiples_after_drag' })

    await page.mouse.move(400, 400)
    await new Promise(resolve => setTimeout(resolve, 3000))
    await testSnapshots({ page, testName: 'smallmultiples_showing_reset' })

    await scatterPlot.clickResetButton()
    await page.mouse.move(200, 200)
    await testState({ page, stateName: 'data.displayr_regression.set9.colorscale_numeric_smallmultiples_state.after_reset', tolerance: 0 })
    await testSnapshots({ page, testName: 'smallmultiples_after_reset' })
    await page.close()
  })

  // Small multiples hide a label through plotly, not through widget code: their labels are plotly
  // ANNOTATIONS carrying `clicktoshow: 'onoff'` (see addSmallMultipleSettings in
  // PlotlyChartElements.js), so plotly itself flips an annotation's `visible` when the data point it is
  // anchored to is clicked. One real click at a marker centre takes the visible annotation count from
  // 42 to 41.
  //
  // NB this test was NOT asserting nothing, contrary to an earlier revision of this comment. Pixel
  // diffing the old baseline, the new one, and the untouched render of the same config at the same size
  // settles it: outside the tooltip's column range the old and new baselines are identical, and both
  // differ from the untouched render by the same 180 px -- the hidden annotation. The old
  // page.click('.point') did hide the label; it also left a hover tooltip in the snapshot, and clearing
  // that is the only thing this change does here.
  test(`${++testId}: Hide labels in small multiples with shared axis`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.legacy_bubble.bubbleplot_small_multiples_with_groups',
      width: 800,
      height: 500
    })
    await new Promise(resolve => setTimeout(resolve, 1000))
    await scatterPlot.clickMarkerViaPlotly()
    await testSnapshots({ page, testName: 'smallmultiples_hide_label' })
    await page.close()
  })

  test(`${++testId}: Load smallmultiples with saved state `, async function () {
    const { page } = await loadWidget({
      browser,
      configName: 'data.displayr_regression.set9.colorscale_numeric_smallmultiples_no_titles',
      stateName: 'data.displayr_regression.set9.colorscale_numeric_smallmultiples_state.after_drag',
      width: 576,
      height: 512
    })
    await page.mouse.move(200, 200)
    await testSnapshots({ page, testName: 'smallmultiples_after_drag', tolerance: 1 })
    await page.close()
  })

  test(`${++testId}: Quadrants with moved quadrant titles`, async function () {
    const { page, scatterPlot } = await loadWidget({
      browser,
      configName: 'data.functionalTest.quadrants.quadrants',
      width: 800,
      height: 500
    })
    await scatterPlot.clickPlotlyAnnotation()
    await page.mouse.down()
    await page.mouse.move(300, 300)
    await page.mouse.up()
    await testState({ page, stateName: 'data.functionalTest.quadrants.quadrant_state.after_drag', tolerance: 0 })
    await testSnapshots({ page, testName: 'quadrant_title_after_drag' })
    await page.close()
  })

  test(`${++testId}: Load quadrant title with saved state `, async function () {
    const { page } = await loadWidget({
      browser,
      configName: 'data.functionalTest.quadrants.quadrants',
      stateName: 'data.functionalTest.quadrants.quadrant_state.after_drag',
      width: 800,
      height: 500
    })
    // Use different snapshot because the reset button is visible
    await testSnapshots({ page, testName: 'quadrant_title_after_drag_reload' })
    await page.close()
  })
})
