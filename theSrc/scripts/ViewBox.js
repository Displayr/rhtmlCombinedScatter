import InsufficientHeightError from './exceptions/InsufficientHeightError'
import InsufficientWidthError from './exceptions/InsufficientWidthError'

class ViewBox {
  constructor (width,
               height,
               padding,
               legend,
               labelsFont,
               axisLeaderLineLength,
               axisDimensionText) {
    this.svgWidth = width
    this.svgHeight = height

    this.setWidth(width - legend.getWidth() - (padding.horizontal * 3) - axisLeaderLineLength - axisDimensionText.rowMaxWidth - axisDimensionText.rightPadding)
    this.setHeight(height - (padding.vertical * 2) - axisDimensionText.colMaxHeight - axisLeaderLineLength )

    this.x = (padding.horizontal * 2) + axisDimensionText.rowMaxWidth + axisLeaderLineLength
    this.y = padding.vertical

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
}

module.exports = ViewBox
