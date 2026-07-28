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
        return TooltipUtils.blackOrWhiteFromRgb(r, g, b)
    }
    // Colors carrying an opacity arrive as rgb()/rgba() strings
    parts = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(bg_color)
    if (parts) {
        parts.shift()
        const [r, g, b] = parts.map((part) => parseInt(part, 10))
        return TooltipUtils.blackOrWhiteFromRgb(r, g, b)
    }
    return '#2C2C2C'
  }

  static blackOrWhiteFromRgb (r, g, b) {
    const luminosity = 0.299 * r + 0.587 * g + 0.114 * b
    return luminosity > 126 ? '#2C2C2C' : '#FFFFFF'
  }
}

module.exports = TooltipUtils
