import _ from 'lodash'
import autoBind from 'es6-autobind'
import PlotColors from './PlotColors'
import PlotLabel from './PlotLabel'
import LegendUtils from './utils/LegendUtils'
import Utils from './utils/Utils'
import DataTypeEnum from './utils/DataTypeEnum'
import d3 from 'd3'

const labelTopPadding = 3 // TODO needs to be configurable, and is duplicated !

class PlotData {
  constructor (X,
    Y,
    Z,
    xDataType,
    yDataType,
    xLevels,
    yLevels,
    group,
    label,
    labelAlt,
    vb,
    legend,
    colorWheel,
    originAlign,
    pointRadius,
    bounds,
    transparency,
    legendSettings,
    state
  ) {
    autoBind(this)
    this.X = X
    this.xDataType = xDataType
    this.xLevels = xLevels
    this.Y = Y
    this.yDataType = yDataType
    this.yLevels = yLevels
    this.Z = Z
    this.xDataType = xDataType
    this.yDataType = yDataType
    this.group = group
    this.label = label
    this.labelAlt = labelAlt
    this.vb = vb
    this.legend = legend
    this.colorWheel = colorWheel
    this.originAlign = originAlign
    this.pointRadius = pointRadius
    this.bounds = bounds
    this.transparency = transparency
    this.origX = this.X.slice(0)
    this.origY = this.Y.slice(0)
    this.normX = this.X.slice(0)
    this.normY = this.Y.slice(0)
    if (Utils.isArrOfNums(this.Z) && (this.Z.length === this.X.length)) { this.normZ = this.Z.slice() }
    this.outsidePlotPtsId = []
    this.hiddenLabelsId = []
    this.outsidePlotCondensedPts = []
    this.legendSettings = legendSettings
    this.state = state
    this.ordinalXToNumeric = x => {
      return d3.scale.ordinal().domain(xLevels).rangePoints([0, xLevels.length - 1])(x)
    }
    this.ordinalYToNumeric = y => {
      return d3.scale.ordinal().domain(yLevels).rangePoints([0, yLevels.length - 1])(y)
    }

    if (this.X.length === this.Y.length) {
      this.len = (this.origLen = X.length)
      if (Utils.isArrOfNums(this.Z)) { this.normalizeZData() }
      this.normalizeData()
      this.plotColors = new PlotColors(this)
      this.labelNew = new PlotLabel(this.label, this.labelAlt, this.vb.labelLogoScale)
    } else {
      throw new Error('Inputs X and Y lengths do not match!')
    }
    this.markerIndexToDataIndex = this.mapMarkerIndexToDataIndex()
  }

  calculateMinMax () {
    // We assume that bounds are always supplied
    this.maxX = this.bounds.xmax
    this.minX = this.bounds.xmin
    this.maxY = this.bounds.ymax
    this.minY = this.bounds.ymin
  }

  normalizeData () {
    // TODO KZ remove this side effect. Plus Data.calcMinMax is called over and over in the code. Why ??
    let i
    this.calculateMinMax()

    // create list of movedOffPts that need markers
    this.outsidePlotMarkers = []
    this.outsidePlotMarkersIter = 0

    _.forEach(this.legend.pts, (lp, i) => {
      const id = lp.id
      let draggedNormX = (this.X[id] - this.minX) / (this.maxX - this.minX)
      let draggedNormY = (this.Y[id] - this.minY) / (this.maxY - this.minY)
      // TODO KZ the ++ should be immed. after the use of the iter !
      const newMarkerId = this.outsidePlotMarkersIter
      lp.markerId = newMarkerId

      if ((Math.abs(draggedNormX) > 1) || (Math.abs(draggedNormY) > 1) ||
         (draggedNormX < 0) || (draggedNormY < 0)) {
        let markerTextY,
          x1,
          y1
        draggedNormX = draggedNormX > 1 ? 1 : draggedNormX
        draggedNormX = draggedNormX < 0 ? 0 : draggedNormX
        draggedNormY = draggedNormY > 1 ? 1 : draggedNormY
        draggedNormY = draggedNormY < 0 ? 0 : draggedNormY
        const x2 = (draggedNormX * this.vb.width) + this.vb.x
        const y2 = ((1 - draggedNormY) * this.vb.height) + this.vb.y

        let markerTextX = (markerTextY = 0)
        const numDigitsInId = Math.ceil(Math.log(newMarkerId + 1.1) / Math.LN10)
        if (draggedNormX === 1) { // right bound
          x1 = x2 + this.legend.getMarkerLen()
          y1 = y2
          markerTextX = x1
          markerTextY = y1 + (this.legend.getMarkerTextSize() / 2)
        } else if (draggedNormX === 0) { // left bound
          x1 = x2 - this.legend.getMarkerLen()
          y1 = y2
          markerTextX = x1 - (this.legend.getMarkerCharWidth() * (numDigitsInId + 1))
          markerTextY = y1 + (this.legend.getMarkerTextSize() / 2)
        } else if (draggedNormY === 1) { // top bound
          x1 = x2
          y1 = y2 + (-draggedNormY * this.legend.getMarkerLen())
          markerTextX = x1 - (this.legend.getMarkerCharWidth() * (numDigitsInId))
          markerTextY = y1
        } else if (draggedNormY === 0) { // bot bound
          x1 = x2
          y1 = y2 + this.legend.getMarkerLen()
          markerTextX = x1 - (this.legend.getMarkerCharWidth() * (numDigitsInId))
          markerTextY = y1 + this.legend.getMarkerTextSize()
        }

        // New markerLabel starts at index = 1 since it is user facing
        this.outsidePlotMarkers.push({
          markerLabel: newMarkerId + 1,
          ptId: id,
          x1,
          y1,
          x2,
          y2,
          markerTextX,
          markerTextY,
          width: this.legend.getMarkerWidth(),
          color: lp.color,
        })

        // if the points were condensed, remove point
        this.outsidePlotCondensedPts = _.filter(this.outsidePlotCondensedPts, e => e.dataId !== id)
        this.len = this.origLen - this.outsidePlotMarkers.length
      } else { // no marker required, but still inside plot window
        console.log('rhtmlLabeledScatter: Condensed point added')
        const condensedPtsDataIdArray = _.map(this.outsidePlotCondensedPts, e => e.dataId)
        if (!_.includes(condensedPtsDataIdArray, id)) {
          this.outsidePlotCondensedPts.push({
            dataId: id,
            markerId: newMarkerId,
          })
        }
      }
      this.outsidePlotMarkersIter++
    })

    // Remove pts that are outside plot if user bounds were set
    this.outsideBoundsPtsId = []
    if (_.some(this.bounds, b => Utils.isNum(b))) {
      i = 0
      while (i < this.origLen) {
        if (!_.includes(this.outsideBoundsPtsId, i)) {
          if (this.isXOutsideBounds(i) || this.isYOutsideBounds(i)) {
            this.outsideBoundsPtsId.push(i)
          }
        }
        i++
      }
    }

    i = 0
    return (() => {
      const result = []
      while (i < this.origLen) {
        this.normX[i] = this.minX === this.maxX ? this.minX : (this.X[i] - this.minX) / (this.maxX - this.minX)
        // copy/paste bug using x when calculating Y. WTF is this even doing ?
        this.normY[i] = this.minY === this.maxY ? this.minX : (this.Y[i] - this.minY) / (this.maxY - this.minY)
        result.push(i++)
      }
      return result
    })()
  }

  isXOutsideBounds (i) {
    const x = this.xDataType === DataTypeEnum.ordinal ? this.ordinalXToNumeric(this.X[i]) : this.X[i]
    return (x < this.minX) || (x > this.maxX)
  }

  isYOutsideBounds (i) {
    const y = this.yDataType === DataTypeEnum.ordinal ? this.ordinalYToNumeric(this.Y[i]) : this.Y[i]
    return (y < this.minY) || (y > this.maxY)
  }

  normalizeZData () {
    const legendUtils = LegendUtils

    const maxZ = _.max(this.Z)
    if (this.legendSettings.showBubblesInLegend) {
      this.legendBubbles = legendUtils.getLegendBubbles(maxZ, this.legendSettings.zPrefix, this.legendSettings.zSuffix)
      this.normZ = legendUtils.normalizeZValues(this.Z, this.legendBubbles.maxSize)
    } else {
      this.normZ = legendUtils.normalizeZValues(this.Z, maxZ)
    }
  }

  getPtsAndLabs (calleeName) {
    console.log(`getPtsAndLabs(${calleeName})`)
    return Promise.all(this.labelNew.getLabels()).then((resolvedLabels) => {
      // resolvedLabels is array of { height, width, label, url }
      // console.log(`resolvedLabels for getPtsandLabs callee name ${calleeName}`)
      // console.log(resolvedLabels)

      this.pts = []
      this.lab = []

      let i = 0
      while (i < this.origLen) {
        // TODO this assumes the IDs are the indexes
        if ((!_.includes(this.outsidePlotPtsId, i)) || _.includes((_.map(this.outsidePlotCondensedPts, 'dataId')), i)) {
          let ptColor
          let x = 0
          let y = 0
          if (this.xDataType === DataTypeEnum.ordinal) {
            const unit_length = this.vb.width / (this.maxX - this.minX)
            x = this.vb.x - this.minX * unit_length + this.ordinalXToNumeric(this.X[i]) * unit_length
          } else {
            x = (this.normX[i] * this.vb.width) + this.vb.x
          }
          if (this.yDataType === DataTypeEnum.ordinal) {
            const unit_length = this.vb.height / (this.maxY - this.minY)
            y = this.vb.y + this.vb.height + this.minY * unit_length - this.ordinalYToNumeric(this.Y[i]) * unit_length
          } else {
            y = ((1 - this.normY[i]) * this.vb.height) + this.vb.y
          }
          let r = this.pointRadius
          if (Utils.isArrOfNums(this.Z)) {
            const legendUtils = LegendUtils
            r = legendUtils.normalizedZtoRadius(this.pointRadius, this.normZ[i])
          }
          const fillOpacity = this.plotColors.getFillOpacity(this.transparency)

          let { label, width, height, url } = resolvedLabels[i]
          const labelAlt = ((this.labelAlt !== null ? this.labelAlt[i] : undefined) !== null) ? this.labelAlt[i] : ''
          const labelY = y - r - labelTopPadding

          const labelZ = Utils.isArrOfNums(this.Z) ? this.Z[i].toString() : ''
          let fontSize = this.vb.labelFontSize

          // If pt has been already condensed
          if (_.includes((_.map(this.outsidePlotCondensedPts, e => e.dataId)), i)) {
            const pt = _.find(this.outsidePlotCondensedPts, e => e.dataId === i)
            label = (pt.markerId + 1).toString()
            fontSize = this.vb.labelSmallFontSize
            url = ''
            width = null
            height = null
          }

          let fontColor = (ptColor = this.plotColors.getColor(i))
          let fontOpacity = _.includes(this.hiddenLabelsId, i) ? 0.0 : 1.0
          if ((this.vb.labelFontColor != null) && !(this.vb.labelFontColor === '')) { fontColor = this.vb.labelFontColor }
          const group = (this.group != null) ? this.group[i] : ''
          const hidePointAndLabel = this.state.hiddenSeries.indexOf(group) > -1
          this.pts.push({ x, y, r, label, labelAlt, labelX: this.origX[i].toString(), labelY: this.origY[i].toString(), labelZ, group, color: ptColor, id: i, fillOpacity, hideLabel: fontOpacity === 0.0 })
          this.lab.push({ x, y: labelY, color: fontColor, opacity: fontOpacity, id: i, fontSize, fontFamily: this.vb.labelFontFamily, text: label, width, height, url, hidePointAndLabel })
        }
        i++
      }

      // Remove pts outside plot because user bounds set
      return (() => {
        _.forEach(this.outsideBoundsPtsId, (p, i) => {
          if (!_.includes(this.outsidePlotPtsId, p)) {
            const checkId = e => e.id === p
            _.remove(this.pts, checkId)
            _.remove(this.lab, checkId)
          }
        })
        this.setLegend()
      })()
    }).catch(err => console.log(err))
  }

  setLegend () {
    this.legend.setLegendGroupsAndPts(this.vb, this.legendBubbles, this.pointRadius)
  }

  isOutsideViewBox (lab) {
    const left = lab.x - (lab.width / 2)
    const right = lab.x + (lab.width / 2)
    const top = lab.y - lab.height
    const bot = lab.y

    // const isAnyPartOfLabOutside = ((left < this.vb.x) ||
    //                               (right > (this.vb.x + this.vb.width)) ||
    //                               (top < this.vb.y) ||
    //                               (bot > (this.vb.y + this.vb.height)))
    const isAllOfLabOutside = ((right < this.vb.x) ||
                               (left > (this.vb.x + this.vb.width)) ||
                               (bot < this.vb.y) ||
                               (top > (this.vb.y + this.vb.height)))
    return isAllOfLabOutside
  }

  isLegendPtOutsideViewBox (lab) {
    const left = lab.x
    const right = lab.x + lab.width
    const top = lab.y - lab.height
    const bot = lab.y

    return ((left < this.vb.x) ||
        (right > (this.vb.x + this.vb.width)) ||
        (top < this.vb.y) ||
        (bot > (this.vb.y + this.vb.height)))
  }

  toggleLabelShowFromMarkerIndex (index) {
    return this.toggleLabelShow(this.markerIndexToDataIndex[index])
  }

  toggleLabelShow (id) {
    const hidden = _.includes(this.hiddenLabelsId, id)
    const index = this.lab.findIndex(p => p.id === Number(id))
    if (index === -1) {
      return
    }
    if (hidden) {
        _.pull(this.hiddenLabelsId, id)
        this.pts[index].hideLabel = false
        this.lab[index].opacity = 1.0
    } else {
        this.hiddenLabelsId.push(id)
        this.pts[index].hideLabel = true
        this.lab[index].opacity = 0.0
    }
    return (this.pts[index].hideLabel)
  }

  mapMarkerIndexToDataIndex () {
    if (!Array.isArray(this.group)) {
      return Array(this.len).fill().map((element, index) => index)
    }
    const uniq_groups = _.uniq(this.group)
    const result = []
    for (const g of uniq_groups) {
      for (let i = 0; i < this.group.length; i++) {
        if (this.group[i] === g) {
          result.push(i)
        }
      }
    }
    return result
  }

  addElemToLegend (id) {
    const checkId = e => e.id === id
    const movedPt = _.remove(this.pts, checkId)
    const movedLab = _.remove(this.lab, checkId)
    if (movedPt.length > 0 && movedLab.length > 0) {
      this.legend.addPt(id, movedPt, movedLab)
    }
    this.outsidePlotPtsId.push(id)
    this.normalizeData()
    this.getPtsAndLabs('PlotData.addElemToLegend')
  }

  removeLegendPtFromData (id) {
   const legendPt = this.legend.removePt(id)
    this.pts.push(legendPt.pt)
    this.lab.push(legendPt.lab)

    _.remove(this.outsidePlotPtsId, i => i === id)
    _.remove(this.outsidePlotCondensedPts, i => i.dataId === id)
  }

  removeElemFromLegend (id) {
    this.removeLegendPtFromData(id)
    this.normalizeData()
    this.getPtsAndLabs('PlotData.removeElemFromLegend')
    this.setLegend()
  }

  syncHiddenLabels (labels) {
    this.hiddenLabelsId = []
    _.map(labels, ii => this.toggleLabelShow(ii))
  }

  resetPtsAndLabs (initialLabs) {
    _.forEachRight(this.legend.pts, lp => {
      if (!_.isUndefined(lp)) this.removeLegendPtFromData(lp.id)
    })

    this.hiddenLabelsId = initialLabs
    this.normalizeData()
    this.getPtsAndLabs('PlotData.resetPtsAndLabs')
    this.setLegend()
  }

  getTextLabels () {
    return _.filter(this.lab, l => l.url === '' && !l.hidePointAndLabel)
  }

  getImgLabels () {
    return _.filter(this.lab, l => l.url !== '' && !l.hidePointAndLabel)
  }
}

module.exports = PlotData
