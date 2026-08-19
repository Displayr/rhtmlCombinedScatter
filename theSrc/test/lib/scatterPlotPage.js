class ScatterPlotPage {
  constructor (page) {
    this.page = page
  }

  async movePlotLabel ({ id, x, y }) {
    const label = await this.plotLabel({ id })
    const labelBox = await label.boundingBox()

    const initialMousePosition = {
      x: labelBox.x + labelBox.width / 2,
      y: labelBox.y + labelBox.height / 2,
    }

    const finalMousePosition = {
      x: initialMousePosition.x + x,
      y: initialMousePosition.y + y,
    }

    return this.drag({ from: initialMousePosition, to: finalMousePosition })
  }

  async movePlotLabelToLegend ({ id }) {
    const label = await this.plotLabel({ id })
    const labelBox = await label.boundingBox()

    const legend = await this.legendGroup()
    const legendBox = await legend.boundingBox()

    const initialMousePosition = {
      x: labelBox.x + labelBox.width / 2,
      y: labelBox.y + labelBox.height / 2,
    }

    // Drag to point below legend instead of legend to avoid accidentally clicking on the plotly legend
    const finalMousePosition = {
      x: legendBox.x + legendBox.width / 2,
      y: legendBox.y + legendBox.height + 5,
    }

    return this.drag({ from: initialMousePosition, to: finalMousePosition })
  }

  async moveLegendLabelToPlot ({ id }) {
    const legendLabel = await this.legendLabel({ id })
    const legendLabelBox = await legendLabel.boundingBox()

    const initialMousePosition = {
      x: legendLabelBox.x + legendLabelBox.width / 2,
      y: legendLabelBox.y + legendLabelBox.height / 2,
    }

    const finalMousePosition = {
      x: initialMousePosition.x - 300,
      y: initialMousePosition.y,
    }

    return this.drag({ from: initialMousePosition, to: finalMousePosition })
  }

  // Parks the pointer outside the widget, so the hover-only Reset affordance is hidden.
  //
  // Needed because a drag leaves the pointer wherever it finished, which is inside the widget. The Reset
  // control is shown by `root_element.on('mouseover', ...)` whenever the state has been altered by the
  // user (see ResetButton.js), so a snapshot taken straight after a drag can include Reset, while the
  // same view loaded from saved state cannot -- no pointer ever goes near it. Any test that snapshots a
  // dragged view under a name it SHARES with a load-saved-state test has to call this first, or the two
  // renders differ by the Reset overlay alone.
  //
  // (0, 0) is outside the widget: renderExample places #widget-container at (10, 39) and the widget div
  // itself at (11, 40). Verified in a real browser -- reset opacity goes 1 -> 0 on moving here.
  async moveMouseOffWidget () {
    return this.page.mouse.move(0, 0)
  }

  async moveMouseOntoPlot () {
    // XXX this is an assumption that currently holds based on tests ...
    const unmovedLabel = await this.plotLabel({ id: 1 })
    const unmovedLabelBox = await unmovedLabel.boundingBox()

    const initialMousePosition = {
      x: unmovedLabelBox.x + unmovedLabelBox.width / 2,
      y: unmovedLabelBox.y + unmovedLabelBox.height / 2,
    }

    return this.page.mouse.move(initialMousePosition.x, initialMousePosition.y)
  }

  // Toggles a marker's label by dispatching one click at the marker's coordinates.
  //
  // NB a synthetic dispatch, not page.mouse.click, and NOT because a real click fails to arrive -- an
  // earlier revision of this helper claimed exactly that and it was wrong. A real click arrives fine.
  // The reason is that how MANY events reach this handler is environment dependent, and the handler is
  // not idempotent, so an even number of them is indistinguishable from none at all.
  //
  // Measured by wrapping the widget's own onclick and recording isTrusted for every invocation:
  //
  //   locally, one real click  -> 1 invocation,  isTrusted false
  //   on CI,   one real click  -> 2 invocations, isTrusted false then true
  //
  // So the toggle is normally driven by a click SYNTHESISED in the page, not by the browser's own
  // trusted one, which does not reach this handler locally at all. On CI both arrive, the handler
  // toggles on and straight back off, and the label never changes. That is precisely the symptom this
  // test was disabled for -- "works locally but not in CircleCI (clicking on a marker doesn't toggle
  // the label)" -- and the "2 clicks instead of 1" line in RS-23047.
  //
  // NB this is NOT a product bug, and should not be filed as one on the strength of this comment. In
  // ordinary use exactly one event reaches the handler and toggling works, which is what manual testing
  // shows; the doubling has only ever been observed on the CI runner. The tempting fix -- ignoring
  // untrusted events -- would BREAK toggling, because the untrusted click is the one that normally does
  // the work. What is worth knowing is that the handler is not idempotent, so any environment that
  // delivers two clicks silently disables the feature. Whether a real user environment does is unknown,
  // and would need its own investigation rather than an assumption either way.
  //
  // Dispatching once directly on .nsewdrag sidesteps all of it: exactly one invocation, everywhere. The
  // browser derives offsetX/offsetY from clientX/clientY, and for an SVG target Chrome measures them
  // from the SVG viewport -- the same space as the getCTM() translation the hit test compares against.
  //
  // NB what this deliberately does NOT cover: whether a click reaches the handler at all. LabeledScatter
  // appends its label <svg class="scatterlabellayer"> into .draglayer ABOVE .nsewdrag, and those labels
  // are real hit targets -- that is how movePlotLabel drags them -- so a label sitting over its own
  // marker swallows a real click. Measured: a marker under a label receives text.plt-...-lab, a bare
  // marker receives rect.nsewdrag. Dispatching bypasses that, so this helper cannot catch a z-order or
  // pointer-events regression. Guarding that needs an assertion about which element a click at the
  // marker centre lands on, not a snapshot.
  async dispatchMarkerClick ({ markerIndex = 0, expectToggle = false } = {}) {
    const before = expectToggle ? await this.getState() : null

    await this.page.evaluate((index) => {
      const marker = document.querySelectorAll('.point')[index]
      if (!marker) { throw new Error(`no .point marker at index ${index}`) }
      const rect = marker.getBoundingClientRect()
      const dragLayer = document.querySelector('.nsewdrag')
      if (!dragLayer) { throw new Error('no .nsewdrag to dispatch the click on') }
      dragLayer.dispatchEvent(new MouseEvent('click', {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        bubbles: true
      }))
    }, markerIndex)

    if (!expectToggle) { return }

    const after = await this.getState()
    if (JSON.stringify(before['hiddenlabel.pts'] || []) === JSON.stringify(after['hiddenlabel.pts'] || [])) {
      throw new Error(`clicking marker ${markerIndex} did not toggle a label: hiddenlabel.pts stayed ${JSON.stringify(after['hiddenlabel.pts'])}`)
    }
  }

  // Toggles a small multiples label with a REAL click, because plotly has to see it.
  //
  // NB the mechanism here is genuinely different, which is why this stays a separate helper. Small
  // multiples labels are plotly ANNOTATIONS carrying `clicktoshow: 'onoff'` (see
  // addSmallMultipleSettings), so plotly itself flips `visible` when the anchored point is clicked. No
  // widget handler is involved, and a dispatch onto .nsewdrag does not drive it. The old
  // page.click('.point') worked for exactly this reason, and the baselines prove it: outside the
  // tooltip's column range the old and new snapshots are pixel identical, and both differ from the
  // untouched render by the same 180 px -- the hidden annotation. So this test was never asserting
  // nothing; it was recording a hover tooltip alongside a correctly hidden label.
  //
  // Exactly ONE click matters: with 'onoff' a second puts the label back.
  async clickMarkerViaPlotly ({ markerIndex = 0 } = {}) {
    const target = await this.page.evaluate((index) => {
      const marker = document.querySelectorAll('.point')[index]
      if (!marker) { throw new Error(`no .point marker at index ${index}`) }
      const rect = marker.getBoundingClientRect()
      const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      const drag = document.querySelector('.nsewdrag').getBoundingClientRect()
      return { centre, plotCentre: { x: drag.left + drag.width / 2, y: drag.top + drag.height / 2 } }
    }, markerIndex)

    await this.page.mouse.click(target.centre.x, target.centre.y)

    // NB a real click leaves the pointer ON the marker, so plotly shows its hover tooltip, which then
    // lands in any snapshot taken afterwards -- that tooltip is the only thing the old baseline got
    // wrong. Moving straight off the widget does NOT clear it: plotly only drops the hover when it sees
    // a mousemove away from the point. Measured: click -> 7 nodes under .hoverlayer; move(0,0) -> still
    // 7; step out then move -> 0. The step goes TOWARDS the plot centre rather than a fixed offset, so
    // it stays inside the drag layer for a marker near any edge.
    await this.page.mouse.move(
      (target.centre.x + target.plotCentre.x) / 2,
      (target.centre.y + target.plotCentre.y) / 2
    )
    await this.moveMouseOffWidget()

    const hoverNodes = await this.page.evaluate(() => document.querySelectorAll('.hoverlayer *').length)
    if (hoverNodes > 0) {
      throw new Error(`a plotly tooltip survived the click and would land in the snapshot (${hoverNodes} nodes under .hoverlayer)`)
    }
  }

  // The widget's most recent state update, as the example page records it.
  async getState () {
    return this.page.evaluate(() => (window.stateUpdates || []).slice(-1)[0] || null)
  }

  async clickResetButton () {
    return this.page.click('.plot-reset-button')
  }

  async clickPlotlyAnnotation () {
    return this.page.click('.annotation-text')
  }

  async plotLabel ({ id }) {
    return this.page.$(`[id="${id}"]`)
  }

  async legendGroup () {
    return this.page.$('.legend')
  }

  async legendLabel ({ id }) {
    return this.page.$(`#legend-${id}`)
  }

  async clickFirstLegendItem () {
    return this.page.click('.legendtext')
  }

  async drag ({ to, from }) {
    await this.page.mouse.move(from.x, from.y)
    await this.page.mouse.down()

    await this.page.mouse.move(to.x, to.y)
    return this.page.mouse.up()
  }
}

module.exports = ScatterPlotPage
