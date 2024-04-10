import d3 from 'd3'
import $ from 'jquery'

class TooltipUtils {
  static addSimpleTooltip (object, tooltipText) {
    d3.selectAll($(object)).append('title').text(tooltipText)
  }

  static blackOrWhite (bg_color) {
    let parts = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(bg_color)
    if (parts) {
        parts.shift()
        const [r, g, b] = parts.map((part) => parseInt(part, 16))
        const luminosity = 0.299 * r + 0.587 * g + 0.114 * b
        return luminosity > 126 ? '#2C2C2C' : '#FFFFFF'
    }
    return '#2C2C2C'
  }
}

module.exports = TooltipUtils
