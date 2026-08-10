// How far the pointer steps away from a clicked marker before leaving the widget, so plotly registers
// a mousemove off the point and drops its hover tooltip. Far enough to clear the largest bubbles.
const PLOTLY_UNHOVER_STEP = 120

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

  // Toggles a small multiples label by really clicking its marker.
  //
  // Small multiples hide labels by a different route than single-panel charts. Their labels are plotly
  // ANNOTATIONS (see addSmallMultipleSettings) carrying `clicktoshow: 'onoff'`, which is plotly's own
  // feature: clicking the data point an annotation is anchored to flips that annotation's `visible`.
  // No widget code is involved, so it needs a real event through plotly's pipeline -- the in-page
  // dispatch that clickMouseOnAnchor uses does not drive it.
  //
  // Measured for bubbleplot_small_multiples_with_groups: visible annotations go 42 -> 41 on one real
  // click at a marker centre. Exactly ONE click matters here: because clicktoshow is 'onoff', a second
  // click toggles the label back, which is the "2 clicks instead of 1" that made this look broken in
  // CircleCI (RS-23047) -- a net no-op rather than a failure.
  async clickMarkerViaPlotly ({ markerIndex = 0 } = {}) {
    const centre = await this.page.evaluate((index) => {
      const marker = document.querySelectorAll('.point')[index]
      if (!marker) { throw new Error(`no .point marker at index ${index}`) }
      const rect = marker.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    }, markerIndex)

    await this.page.mouse.click(centre.x, centre.y)

    // NB a real click leaves the pointer ON the marker, so plotly shows its hover tooltip -- which then
    // lands in any snapshot taken afterwards. That tooltip is exactly what the old baseline recorded.
    // Moving straight off the widget does NOT clear it: plotly only drops the hover when it sees a
    // mousemove away from the point, so the pointer has to step somewhere else inside the plot first.
    // Measured: click -> 7 nodes under .hoverlayer; move(0,0) -> still 7; step out then move -> 0.
    await this.page.mouse.move(centre.x + PLOTLY_UNHOVER_STEP, centre.y + PLOTLY_UNHOVER_STEP)
    return this.moveMouseOffWidget()
  }

  // Toggles a marker's label by dispatching the click in the page, at the marker's own coordinates.
  //
  // NOT page.click('.point'): that delivers nothing to the handler at all. LabeledScatter binds the
  // click to .nsewdrag rather than to the markers on purpose -- markers would need pointer-events
  // "all", which would kill plotly's hover tooltips (see addMarkerClickHandler) -- so a CDP click aimed
  // at a marker never reaches it. Measured with a capture listener on .nsewdrag: page.click('.point')
  // produced zero events there, so both callers of this helper were asserting nothing. (RS-23047)
  //
  // Dispatching on .nsewdrag at the marker's client centre runs the real thing: the browser derives
  // offsetX/offsetY from clientX/clientY, and for an SVG target Chrome measures them from the SVG
  // viewport -- the same space as the getCTM() translation the hit test compares against. Measured at
  // offset (243, 283) against ctm (242.5, 282.5), well inside the 18.81px marker radius. So the hit
  // test, the toggle, the state update and the redraw all run; only CDP input is bypassed, which is the
  // layer that is broken here and has no bearing on product behaviour.
  //
  // Verified by state rather than by pixels: hiddenlabel.pts goes [4,5] -> [4,5,0] -> [4,5,0,1] on
  // successive clicks.
  //
  // NB this cannot catch a regression where clicks stop REACHING the handler -- z-order or
  // pointer-events changes -- because it dispatches straight to it. No existing test covers that
  // either; guarding it needs a separate assertion that a click at the marker centre lands on
  // .nsewdrag, not a snapshot.
  async clickMouseOnAnchor ({ markerIndex = 0 } = {}) {
    return this.page.evaluate((index) => {
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
