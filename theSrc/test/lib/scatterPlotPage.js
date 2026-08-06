
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

  async clickMouseOnAnchor () {
    return this.page.click('.point')
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
