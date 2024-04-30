import _ from 'lodash'
import SvgUtils from './utils/SvgUtils'
import LegendUtils from './utils/LegendUtils'

const LEGEND_BUBBLE_PADDING_SIDE = 10
const LEGEND_BUBBLE_PADDING_TOP = 10

/** Legend bubble title height as a multiple of font size */
const LEGEND_BUBBLE_TITLE_HEIGHT = 1.5

class BubbleLegend {
    constructor (legendSettings, legendElementsRect, pointRadius) {
        this.legendSettings = legendSettings
        this.legendElementsRect = legendElementsRect
        this.pointRadius = pointRadius
    }

    setupBubbles (vb, legendBubbles) {
        const rTop = LegendUtils.normalizedZtoRadius(this.pointRadius, legendBubbles.large.size / legendBubbles.maxSize)
        const rMid = LegendUtils.normalizedZtoRadius(this.pointRadius, legendBubbles.medium.size / legendBubbles.maxSize)
        const rBot = LegendUtils.normalizedZtoRadius(this.pointRadius, legendBubbles.small.size / legendBubbles.maxSize)
        const cx = this.legendElementsRect.x + (this.legendElementsRect.width / 2)
        const viewBoxYBottom = vb.y + vb.height
        const bubbleTextPadding = 2
        this.bubbles = [
            {
            cx,
            cy: viewBoxYBottom - rTop,
            r: rTop,
            x: cx,
            y: viewBoxYBottom - (2 * rTop) - bubbleTextPadding,
            text: legendBubbles.large.label,
            },
            {
            cx,
            cy: viewBoxYBottom - rMid,
            r: rMid,
            x: cx,
            y: viewBoxYBottom - (2 * rMid) - bubbleTextPadding,
            text: legendBubbles.medium.label,
            },
            {
            cx,
            cy: viewBoxYBottom - rBot,
            r: rBot,
            x: cx,
            y: viewBoxYBottom - (2 * rBot) - bubbleTextPadding,
            text: legendBubbles.small.label,
            },
        ]
        this.setBubblesTitle([
            {
            x: cx,
            y: viewBoxYBottom - (2 * rTop) - bubbleTextPadding,
            },
        ])
    }

    getBubblesTitle () { return _.isEmpty(this.bubblesTitle) ? null : this.bubblesTitle }
    setBubblesTitle (title) { this.bubblesTitle = title }

    drawBubblesTitleWith (svg) {
        if (this.legendSettings.hasTitleText()) {
          svg.selectAll('.legend-bubbles-title').remove()
          let legendBubbleTitleFontSize = this.legendSettings.getBubbleTitleFontSize()
          const legendBubbleTitleSvg = svg.selectAll('.legend-bubbles-title')
             .data(this.getBubblesTitle())
             .enter()
             .append('text')
             .attr('class', 'legend-bubbles-title')
             .attr('x', d => d.x)
             .attr('y', d => d.y - (legendBubbleTitleFontSize * LEGEND_BUBBLE_TITLE_HEIGHT))
             .attr('text-anchor', 'middle')
             .attr('font-weight', 'normal')
             .attr('font-size', this.legendSettings.getBubbleTitleFontSize())
             .attr('font-family', this.legendSettings.getBubbleTitleFontFamily())
             .attr('fill', this.legendSettings.getBubbleTitleFontColor())
             .text(this.legendSettings.getTitle())

          SvgUtils.setSvgBBoxWidthAndHeight(this.getBubblesTitle(), legendBubbleTitleSvg)
        }
      }

    drawBubblesWith (svg) {
        svg.selectAll('.legend-bubbles').remove()
        svg.selectAll('.legend-bubbles')
           .data(this.bubbles)
           .enter()
           .append('circle')
           .attr('class', 'legend-bubbles')
           .attr('cx', d => d.cx)
           .attr('cy', d => d.cy)
           .attr('r', d => d.r)
           .attr('fill', 'none')
           .attr('stroke', this.legendSettings.getBubbleFontColor())
           .attr('stroke-opacity', 0.5)
      }

    drawBubblesLabelsWith (svg) {
        svg.selectAll('.legend-bubbles-labels').remove()
        svg.selectAll('.legend-bubbles-labels')
           .data(this.bubbles)
           .enter()
           .append('text')
           .attr('class', 'legend-bubbles-labels')
           .attr('x', d => d.x)
           .attr('y', d => d.y)
           .attr('text-anchor', 'middle')
           .attr('font-size', this.legendSettings.getBubbleFontSize())
           .attr('font-family', this.legendSettings.getBubbleFontFamily())
           .attr('fill', this.legendSettings.getBubbleFontColor())
           .text(d => d.text)
      }
}

module.exports = {
    BubbleLegend,
    LEGEND_BUBBLE_TITLE_HEIGHT,
    LEGEND_BUBBLE_PADDING_SIDE,
    LEGEND_BUBBLE_PADDING_TOP
}
