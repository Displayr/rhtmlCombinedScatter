import autoBind from 'es6-autobind'
import _ from 'lodash'
import SvgUtils from './utils/SvgUtils'
import Utils from './utils/Utils'
import { BubbleLegend } from './BubbleLegend'

const LEGEND_POINTS_PADDING_TOP = 10
const LEGEND_POINTS_ROW_PADDING = 9
const LEGEND_POINTS_MARGIN_RIGHT = 100
const LEGEND_POINTS_MINIMUM_HEIGHT = 50

class Legend {
  constructor (legendSettings, axisSettings, legendElementsRect) {
    autoBind(this)
    this.legendSettings = legendSettings
    this.legendElementsRect = legendElementsRect
    this.decimals = {
      x: axisSettings.x.decimals,
      y: axisSettings.y.decimals,
      z: axisSettings.z.decimals,
    }
    this.prefix = {
      x: axisSettings.x.prefix,
      y: axisSettings.y.prefix,
      z: axisSettings.z.prefix,
    }
    this.suffix = {
      x: axisSettings.x.suffix,
      y: axisSettings.y.suffix,
      z: axisSettings.z.suffix,
    }
    this.width = legendElementsRect.width
    this.setHeight(legendElementsRect.height)
    this.heightOfRow = legendSettings.getFontSize() + LEGEND_POINTS_ROW_PADDING
    this.padding = {
      right: legendSettings.getFontSize() / 1.6,
      left: legendSettings.getFontSize() / 0.8,
      middle: legendSettings.getFontSize() / 0.53,
    }
    this.ptRadius = legendSettings.getFontSize() / 2.67
    this.ptToTextSpace = legendSettings.getFontSize()
    this.vertPtPadding = 5
    this.cols = 1
    this.marker = {
      len: 5,
      width: 1,
      textSize: 10,
      charWidth: 4,
    }

    this.x = legendElementsRect.x
    this.pts = []
    this.groups = []
    this.setColSpace(20)
    this.bubbleLegend = new BubbleLegend(this.legendSettings, this.width)
  }

  setHeight (h) {
    this.height = h
  }
  setCols (c) {
    if (!_.isNaN(c)) {
      this.cols = c
    }
  }

  setLegendGroupsAndPts (vb) {
    const pts = this.pts
    this.pts = this.getLegendItemsPositions(vb, pts)
  }

  getLegendItemsPositions (vb, itemsArray) {
    const numItems = itemsArray.length

    const legendStartY = this.legendElementsRect.y

    this.setCols(Math.ceil(numItems / (Math.ceil((this.height) / this.heightOfRow))))

    let colSpacing = 0
    let numItemsInPrevCols = 0

    let i = 0
    let currentCol = 1
    while (i < numItems) {
      if (this.getCols() > 1) {
        const numElemsInCol = numItems / this.getCols()
        const exceededCurrentCol = (legendStartY + ((i - numItemsInPrevCols) * this.getHeightOfRow())) > (vb.y + this.height)
        const plottedEvenBalanceOfItemsBtwnCols = i >= (numElemsInCol * currentCol)
        if (exceededCurrentCol || plottedEvenBalanceOfItemsBtwnCols) {
          colSpacing = (this.getColSpace() + (this.getPtRadius() * 2) + this.getPtToTextSpace()) * currentCol
          numItemsInPrevCols = i
          currentCol++
        }

        const totalItemsSpacingExceedLegendArea = (legendStartY + ((i - numItemsInPrevCols) * this.getHeightOfRow())) > (vb.y + this.height)
        if (totalItemsSpacingExceedLegendArea) { break }
      }

      const li = itemsArray[i]
      if (li.isDraggedPt) {
        li.x = this.getX() + this.getPaddingLeft() + colSpacing
        li.y = legendStartY + ((i - numItemsInPrevCols) * this.getHeightOfRow()) + this.getVertPtPadding()
      } else {
        li.cx = this.getX() + this.getPaddingLeft() + colSpacing + li.r
        li.cy = legendStartY + ((i - numItemsInPrevCols) * this.getHeightOfRow())
        li.x = li.cx + this.getPtToTextSpace()
        li.y = li.cy + li.r
      }
      i++
    }
    return itemsArray
  }

  addPt (id, movedPt, movedLab) {
    this.pts.push({
      id: id,
      pt: movedPt[0],
      lab: movedLab[0],
      anchor: 'start',
      text: `${movedLab[0].text} (${Utils.getFormattedNum(movedPt[0].labelX, this.decimals.x, this.prefix.x, this.suffix.x)}, ${Utils.getFormattedNum(movedPt[0].labelY, this.decimals.y, this.prefix.y, this.suffix.y)})`,
      color: movedPt[0].color,
      isDraggedPt: true,
    })
  }

  removePt (id) {
    const checkId = e => e.id === id
    return _.remove(this.pts, checkId)
  }

  addGroup (text, color, fillOpacity) {
    this.groups.push({
      text: text,
      color: color,
      r: this.getPtRadius(),
      anchor: 'start',
      fillOpacity: fillOpacity,
    })
  }

  getMaxTextWidth () {
    return (this.width - (this.getPaddingLeft() + this.getPaddingRight() + this.getPaddingMid() * (this.getCols() - 1))) / this.getCols()
  }

  getHeightOfRow () { return this.heightOfRow }
  getMarkerLen () { return this.marker.len }
  getMarkerWidth () { return this.marker.width }
  getMarkerTextSize () { return this.marker.textSize }
  getMarkerCharWidth () { return this.marker.charWidth }
  getPtRadius () { return this.ptRadius }
  getColSpace () { return this.colSpace }
  getPaddingRight () { return this.padding.right }
  getPaddingLeft () { return this.padding.left }
  getPaddingMid () { return this.padding.middle }
  getPtToTextSpace () { return this.ptToTextSpace }
  getVertPtPadding () { return this.vertPtPadding }
  getCols () { return this.cols }
  getX () { return this.x }
  setColSpace (cs) { this.colSpace = cs }

  drawDraggedPtsTextWith (svg, drag) {
    svg.selectAll('.legend-dragged-pts-text').remove()
    const legendPtsSvg = svg.selectAll('.legend-dragged-pts-text')
       .data(this.pts)
       .enter()
       .append('text')
       .attr('class', 'legend-dragged-pts-text')
       .attr('id', d => `legend-${d.id}`)
       .attr('x', d => d.x)
       .attr('y', d => d.y)
       .attr('font-family', this.legendSettings.getFontFamily())
       .attr('font-size', this.legendSettings.getFontSize())
       .attr('text-anchor', 'start')
       .attr('dominant-baseline', 'middle')
       .attr('fill', d => d.color)
       .style('cursor', 'move')
       .text(d => { if (!(_.isNull(d.markerId))) { return Utils.getSuperscript(d.markerId + 1) + d.text } else { return d.text } })
       .call(drag)

    SvgUtils.setSvgBBoxWidthAndHeight(this.pts, svg.selectAll('.legend-dragged-pts-text'))
    _.map(legendPtsSvg[0], p => SvgUtils.svgTextEllipses(p, p.textContent, this.getMaxTextWidth()))
  }
}

module.exports = {
  Legend,
  LEGEND_POINTS_ROW_PADDING,
  LEGEND_POINTS_PADDING_TOP,
  LEGEND_POINTS_MARGIN_RIGHT,
  LEGEND_POINTS_MINIMUM_HEIGHT,
}
