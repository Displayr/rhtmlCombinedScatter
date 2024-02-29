import InsufficientHeightError from './exceptions/InsufficientHeightError'
import InsufficientWidthError from './exceptions/InsufficientWidthError'

class ViewBox {
  constructor (width,
               height,
               legend,
               labelsFont) {
    this.svgWidth = width
    this.svgHeight = height

    this.setWidth(width)
    this.setHeight(height)

    this.x = 0
    this.y = 0

    this.labelFontSize = labelsFont.size
    this.labelSmallFontSize = labelsFont.size * 0.75
    this.labelFontColor = labelsFont.color
    this.labelFontFamily = labelsFont.family
    this.labelLogoScale = labelsFont.logoScale

    // Max width of legend is determinant on size of widget
    legend.setMaxWidth(this.svgWidth * 0.33)
  }

  setWidth (w) {
    if (w > 0) {
      this.width = w
    } else {
      throw new InsufficientWidthError()
    }
  }

  setHeight (h) {
    if (h > 0) {
      this.height = h
    } else {
      throw new InsufficientHeightError()
    }
  }

  getLegendX () {
    return this.x + this.width
  }

  // drawBorderWith (svg, plotBorderSettings) {
  //   svg.selectAll('.plot-viewbox').remove()
  //   svg.append('rect')
  //      .attr('class', 'plot-viewbox')
  //      .attr('x', this.x)
  //      .attr('y', this.y)
  //      .attr('width', this.width)
  //      .attr('height', this.height)
  //      .attr('fill', 'none')
  //      .attr('stroke', plotBorderSettings.color)
  //      .attr('stroke-width', plotBorderSettings.width)
  // }
}

module.exports = ViewBox
