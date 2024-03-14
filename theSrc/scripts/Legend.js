import autoBind from 'es6-autobind'
import _ from 'lodash'
import LegendUtils from './utils/LegendUtils'
import SvgUtils from './utils/SvgUtils'
import Utils from './utils/Utils'

const ROW_PADDING = 9

class Legend {
  constructor (legendSettings, axisSettings, outsidePointsRect) {
    autoBind(this)
    this.legendSettings = legendSettings
    this.outsidePointsRect = outsidePointsRect
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
    this.width = outsidePointsRect.width
    this.maxWidth = outsidePointsRect.width
    this.setHeight(outsidePointsRect.height)
    this.heightOfRow = legendSettings.getFontSize() + ROW_PADDING
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

    this.x = outsidePointsRect.x
    this.pts = []
    this.groups = []
    this.setColSpace(20)
  }

  setMaxWidth (w) {
    this.maxWidth = w
  }

  setWidth (w) {
    this.width = _.min([w, this.maxWidth])
  }

  setHeight (h) {
    this.height = h
  }
  setCols (c) {
    if (!_.isNaN(c)) {
      this.cols = c
    }
  }

  getSpacingAroundMaxTextWidth () {
    return this.getPaddingLeft() +
      (this.getPtRadius() * 2) +
      this.getPaddingRight() +
      this.getPtToTextSpace()
  }

  getBubbleLeftRightPadding () {
    return this.getPaddingLeft() + this.getPaddingRight()
  }

  getBubbleTitleWidth () {
    return (this.getBubblesTitle() !== null) ? this.getBubblesTitle()[0].width : undefined
  }

  setLegendGroupsAndPts (vb, legendBubbles, pointRadius) {
    const pts = this.pts
    this.pts = this.getLegendItemsPositions(vb, legendBubbles, pts, pointRadius)
  }

  getLegendItemsPositions (vb, legendBubbles, itemsArray, pointRadius) {
    const bubbleLegendTextHeight = 20
    const numItems = itemsArray.length

    if ((this.getBubblesTitle() !== null) && this.legendSettings.showBubblesInLegend()) {
      this.height = this.getBubblesTitle()[0].y - bubbleLegendTextHeight - vb.y
    }

    if (legendBubbles != null && this.legendSettings.showBubblesInLegend) {
      const legendUtils = LegendUtils
      legendUtils.setupBubbles(vb, legendBubbles, this, pointRadius)
    }

    const legendStartY = this.outsidePointsRect.y

    this.setCols(Math.ceil(numItems / (Math.ceil(this.height / this.heightOfRow))))

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
    return (this.maxWidth - (this.getPaddingLeft() + this.getPaddingRight() + this.getPaddingMid() * (this.getCols() - 1))) / this.getCols()
  }

  getMaxGroupTextWidth () {
    return (this.maxWidth - (this.getPaddingLeft() + this.getPaddingRight() + this.getPtRadius() + this.getPaddingMid() * this.getCols())) / this.getCols()
  }

  getWidth () { return this.width }
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
  getBubblesMaxWidth () { return this.bubblesMaxWidth }
  getBubbles () { return this.bubbles }
  getBubblesTitle () { return _.isEmpty(this.bubblesTitle) ? null : this.bubblesTitle }
  getNumGroups () { return this.groups.length }
  getNumPts () { return this.pts.length }
  setX (x) { this.x = x }
  setColSpace (cs) { this.colSpace = cs }
  setBubblesMaxWidth (bubblesMaxWidth) { this.bubblesMaxWidth = bubblesMaxWidth }
  setBubbles (bubbles) { this.bubbles = bubbles }
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
         .attr('y', d => d.y - (legendBubbleTitleFontSize * 1.5))
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
       .data(this.getBubbles())
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
       .data(this.getBubbles())
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

module.exports = { Legend, ROW_PADDING }
