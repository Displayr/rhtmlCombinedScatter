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

  // Toggles a marker's label by really clicking it, the way a user does.
  //
  // NB the click is a real CDP click, not an in-page dispatch. An earlier revision of this helper
  // dispatched a synthetic MouseEvent straight at .nsewdrag, on the theory that a CDP click aimed at a
  // marker never arrives. That theory was wrong, and the measurement behind it had a simpler cause:
  // LabeledScatter appends its label <svg class="scatterlabellayer"> INTO .draglayer, above .nsewdrag,
  // and those labels are real hit targets -- that is how movePlotLabel drags them. A label sitting over
  // its own marker therefore swallows the click. Measured with a document level capture listener:
  //
  //   marker under a label -> text.plt-...-lab   (inside .scatterlabellayer)
  //   marker with no label -> rect.nsewdrag      (the handler fires, and the label toggles)
  //
  // So the interception is product behaviour, not a CDP artefact, and dispatching past it made the test
  // assert something a user cannot do. Callers that need the marker clickable drag its label away first,
  // which is what the toggle test already did: after movePlotLabel, elementFromPoint over marker 0
  // returns .nsewdrag and a real click takes hiddenlabel.pts from [4,5] to [4,5,0].
  //
  // Small multiples reach the same place by a different route -- their labels are plotly ANNOTATIONS
  // carrying `clicktoshow: 'onoff'` (see addSmallMultipleSettings), so plotly itself flips `visible`
  // when the anchored point is clicked. Either way it is one real click at the marker centre, so one
  // helper serves both. Exactly ONE click matters: with 'onoff' a second click puts the label back,
  // which is the "2 clicks instead of 1" that made this look broken in CircleCI (RS-23047).
  async clickMarker ({ markerIndex = 0, expectToggle = false } = {}) {
    const target = await this.page.evaluate((index) => {
      const marker = document.querySelectorAll('.point')[index]
      if (!marker) { throw new Error(`no .point marker at index ${index}`) }
      const rect = marker.getBoundingClientRect()
      const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }

      // Fail loudly rather than silently asserting nothing: if a label covers the marker the click
      // lands on the label and no toggle happens, which a snapshot cannot distinguish from "the
      // toggle is broken".
      const topmost = document.elementFromPoint(centre.x, centre.y)
      if (topmost && topmost.closest('.scatterlabellayer')) {
        throw new Error(`marker ${index} is covered by a label, so a click cannot reach it -- move the label first`)
      }

      const drag = document.querySelector('.nsewdrag').getBoundingClientRect()
      return { centre, plotCentre: { x: drag.left + drag.width / 2, y: drag.top + drag.height / 2 } }
    }, markerIndex)

    // NB the handler compares e.offsetX/offsetY against each marker's getCTM() translation, so the click
    // has to land ON .nsewdrag with offsets in that space. Record what it actually received, because a
    // near miss is otherwise indistinguishable from "the toggle is broken" -- which is exactly how this
    // failed on CI while passing locally.
    await this.page.evaluate(() => {
      window.__lastClickOnDragLayer = null
      document.querySelector('.nsewdrag').addEventListener('click', (e) => {
        window.__lastClickOnDragLayer = { offsetX: e.offsetX, offsetY: e.offsetY }
      }, true)
    })

    const before = expectToggle ? await this.getState() : null

    await this.page.mouse.click(target.centre.x, target.centre.y)

    // NB a real click leaves the pointer ON the marker, so plotly shows its hover tooltip, which then
    // lands in any snapshot taken afterwards. Moving straight off the widget does NOT clear it: plotly
    // only drops the hover when it sees a mousemove away from the point, so the pointer steps somewhere
    // else inside the plot first. Measured: click -> 7 nodes under .hoverlayer; move(0,0) -> still 7;
    // step out then move -> 0.
    //
    // The step goes TOWARDS the plot centre rather than a fixed offset, so it stays inside the drag
    // layer for a marker near any edge, and cannot land on another bubble in the corner it came from.
    await this.page.mouse.move(
      (target.centre.x + target.plotCentre.x) / 2,
      (target.centre.y + target.plotCentre.y) / 2
    )
    await this.moveMouseOffWidget()

    const hoverNodes = await this.page.evaluate(() => document.querySelectorAll('.hoverlayer *').length)
    if (hoverNodes > 0) {
      throw new Error(`a plotly tooltip survived the click and would land in the snapshot (${hoverNodes} nodes under .hoverlayer)`)
    }

    if (!expectToggle) { return }

    const after = await this.getState()
    const hiddenBefore = JSON.stringify(before['hiddenlabel.pts'] || [])
    const hiddenAfter = JSON.stringify(after['hiddenlabel.pts'] || [])
    if (hiddenBefore === hiddenAfter) {
      const diagnosis = await this.page.evaluate(() => ({
        received: window.__lastClickOnDragLayer,
        scroll: { x: window.scrollX, y: window.scrollY },
        // NB LabeledScatter assigns its handler as an onclick PROPERTY on .nsewdrag, and scopes the
        // lookup to its own root element. So the two ways this can land correctly and still do nothing
        // are: the property is gone (a redraw replaced the element), or there is more than one drag
        // layer and the click went to a different one than the widget attached to.
        handler: typeof document.querySelector('.nsewdrag').onclick,
        dragLayers: document.querySelectorAll('.nsewdrag').length,
        markers: [...document.querySelectorAll('.point')].map((m) => {
          const ctm = m.getCTM()
          return { ctm: { x: Math.round(ctm.e), y: Math.round(ctm.f) }, radius: Math.round(0.5 * m.getBBox().width) }
        })
      }))
      throw new Error([
        `clicking marker ${markerIndex} did not toggle a label: hiddenlabel.pts stayed ${hiddenAfter}.`,
        `clicked at viewport (${Math.round(target.centre.x)}, ${Math.round(target.centre.y)});`,
        `.nsewdrag received ${JSON.stringify(diagnosis.received)};`,
        `page scroll ${JSON.stringify(diagnosis.scroll)};`,
        `.nsewdrag onclick is ${diagnosis.handler}, ${diagnosis.dragLayers} drag layer(s) in the page;`,
        `markers ${JSON.stringify(diagnosis.markers)}`
      ].join(' '))
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
