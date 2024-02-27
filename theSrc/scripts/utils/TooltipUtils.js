import _ from 'lodash'
import d3 from 'd3'
import $ from 'jquery'

class TooltipUtils {
  static addSimpleTooltip (object, tooltipText) {
    d3.selectAll($(object)).append('title').text(tooltipText)
  }
}

module.exports = TooltipUtils
