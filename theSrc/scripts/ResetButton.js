class ResetButton {
  constructor (plot) {
    this.plot = plot
  }

  drawWith (svg, root_element, width, height, state) {
    svg.selectAll('.plot-reset-button').remove()

    const svgResetButton = svg.append('text')
      .attr('class', 'plot-reset-button')
      .attr('fill', '#5B9BD5')
      .attr('font-size', 10)
      .attr('font-weight', 'normal')
      .style('opacity', 0)
      .style('cursor', 'pointer')
      .text('Reset')
      .on('click', () => {
        state.resetStateLegendPtsAndPositionedLabs()
        this.plot.reset()
      })

    root_element.on('mouseover', () => { if (state.hasStateBeenAlteredByUser()) svgResetButton.style('opacity', 1) })
      .on('mouseout', () => svgResetButton.style('opacity', 0))

    const svgResetButtonBB = svgResetButton.node().getBBox()
    const xAxisPadding = 5
    svgResetButton.attr('x', width - svgResetButtonBB.width - xAxisPadding)
                  .attr('y', height - svgResetButtonBB.height)
  }
}

module.exports = ResetButton
