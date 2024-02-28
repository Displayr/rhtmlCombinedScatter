
import _ from 'lodash'
import 'babel-polyfill'
import md5 from 'md5'
import autoBind from 'es6-autobind'
import Links from './Links'
import PlotData from './PlotData'
import TrendLine from './TrendLine'
import DragUtils from './utils/DragUtils'
import Utils from './utils/Utils'
import LabelPlacement from './LabelPlacement'
import LegendSettings from './LegendSettings'
import Legend from './Legend'
import DebugMessage from './DebugMessage'
import ViewBox from './ViewBox'
import ResetButton from './ResetButton'
import DataTypeEnum from './utils/DataTypeEnum'

const DEBUG_ADD_BBOX_TO_IMG = false

class RectPlot {
  constructor ({ config, stateObj, svg } = {}) {
    autoBind(this)
    this.pltUniqueId = md5((new Date()).getTime())
    this.state = stateObj
    this.width = config.width
    this.height = config.height

    const { X, xLevels, xIsDateTime } = config
    if (xIsDateTime) {
      this.X = _.map(X, (d) => new Date(d))
      this.xLevels = null
      this.xDataType = DataTypeEnum.date
    } else if (Utils.isArrOfNumTypes(X)) {
      this.X = X
      this.xLevels = null
      this.xDataType = DataTypeEnum.numeric
    } else {
      this.X = X
      this.xLevels = _.isNull(xLevels) ? _.uniq(X) : xLevels
      this.xDataType = DataTypeEnum.ordinal
    }

    const { Y, yLevels, yIsDateTime } = config
    if (yIsDateTime) {
      this.Y = _.map(Y, (d) => new Date(d))
      this.yLevels = null
      this.yDataType = DataTypeEnum.date
    } else if (Utils.isArrOfNumTypes(Y)) {
      this.Y = Y
      this.yLevels = null
      this.yDataType = DataTypeEnum.numeric
    } else {
      this.Y = Y
      this.yLevels = _.isNull(yLevels) ? _(Y).uniq().reverse().value() : yLevels
      this.yDataType = DataTypeEnum.ordinal
    }

    this.Z = config.Z
    this.group = config.group
    this.label = config.label
    this.labelAlt = config.labelAlt
    this.svg = svg
    this.zTitle = config.zTitle
    this.colors = config.colors
    this.transparency = config.transparency
    this.originAlign = config.originAlign
    this.showLabels = config.showLabels
    this.pointRadius = config.pointRadius

    this.plotBorder = {
      show: config.plotBorderShow,
      color: config.plotBorderColor,
      width: `${parseInt(config.plotBorderWidth)}px`,
    }
    this.maxDrawFailureCount = 200 // TODO configure

    this.axisSettings = {
      showX: config.showXAxis,
      showY: config.showYAxis,
      textDimensions: {
        rowMaxWidth: 0,
        rowMaxHeight: 0,
        colMaxWidth: 0,
        colMaxHeight: 0,
        rightPadding: 0, // Set later, for when axis markers labels protrude (VIS-146)
      },
      x: {
        fontFamily: config.xAxisFontFamily,
        fontSize: config.xAxisFontSize,
        fontColor: config.xAxisFontColor,
        format: config.xFormat,
        boundsUnitsMajor: config.xBoundsUnitsMajor,
        prefix: config.xPrefix,
        suffix: config.xSuffix,
        decimals: config.xDecimals,
      },
      y: {
        fontFamily: config.yAxisFontFamily,
        fontSize: config.yAxisFontSize,
        fontColor: config.yAxisFontColor,
        format: config.yFormat,
        boundsUnitsMajor: config.yBoundsUnitsMajor,
        prefix: config.yPrefix,
        suffix: config.ySuffix,
        decimals: config.yDecimals,
      },
      z: {
        prefix: config.zPrefix,
        suffix: config.zSuffix,
        decimals: config.zDecimals,
      },
      strokeWidth: 1, // VIS-380: this currently matches plotly for chrome rendering bug
    }

    this.labelsFont = {
      size: config.labelsFontSize,
      color: config.labelsFontColor,
      family: config.labelsFontFamily,
      logoScale: config.labelsLogoScale,
    }

    // TODO convert to object signature
    this.legendSettings = new LegendSettings(
      config.legendShow,
      config.legendBubblesShow,
      config.legendFontFamily,
      config.legendFontSize,
      config.legendFontColor,
      config.legendBubbleFontFamily,
      config.legendBubbleFontSize,
      config.legendBubbleFontColor,
      config.legendBubbleTitleFontFamily,
      config.legendBubbleTitleFontSize,
      config.legendBubbleTitleFontColor,
      this.zTitle,
      config.zPrefix,
      config.zSuffix
    )

    this.trendLines = {
      show: config.trendLines,
      lineThickness: config.trendLinesLineThickness,
      pointSize: config.trendLinesPointSize,
    }

    this.bounds = {
      xmin: config.xBoundsMinimum,
      xmax: config.xBoundsMaximum,
      ymin: config.yBoundsMinimum,
      ymax: config.yBoundsMaximum,
    }

    this.grid = config.grid
    this.origin = config.origin
    this.fixedRatio = config.fixedAspectRatio // TODO rename for consistency

    if (_.isNull(this.label)) {
      this.label = _.map(config.X, () => { return '' })
      this.showLabels = false
    }

    const numNonEmptyLabels = (_.filter(this.label, (l) => l !== '')).length
    const labelPlacementAlgoOnToggle = (numNonEmptyLabels < 100 || (config.labelsMaxShown !== null && config.labelsMaxShown < 100))

    this.tooltipText = config.tooltipText

    this.debugMode = config.debugMode
    this.showResetButton = config.showResetButton

    this.setDim(this.svg, this.width, this.height)

    // TODO make an object then get rid of double handling via this.labelPlacementSettings
    this.labelPlacement = new LabelPlacement({
      svg: this.svg,
      pltId: this.pltUniqueId,
      isBubble: Utils.isArrOfNums(this.Z),
      isLabelPlacementAlgoOn: labelPlacementAlgoOnToggle,
      weights: {
        distance: {
          base: config.labelPlacementWeightDistance,
          multipliers: {
            centeredAboveAnchor: config.labelPlacementWeightDistanceMultiplierCenteredAboveAnchor,
            centeredUnderneathAnchor: config.labelPlacementWeightDistanceMultiplierCenteredUnderneathAnchor,
            besideAnchor: config.labelPlacementWeightDistanceMultiplierBesideAnchor,
            diagonalOfAnchor: config.labelPlacementWeightDistanceMultiplierDiagonalOfAnchor,
          },
        },
        labelLabelOverlap: config.labelPlacementWeightLabelLabelOverlap,
        labelPlacementWeightLabelLabelOverlap: config.labelPlacementWeightLabelAnchorOverlap,
      },
      numSweeps: config.labelPlacementNumSweeps,
      maxMove: config.labelPlacementMaxMove,
      maxAngle: config.labelPlacementMaxAngle,
      seed: config.labelPlacementSeed,
      initialTemperature: config.labelPlacementTemperatureInitial,
      finalTemperature: config.labelPlacementTemperatureFinal,
    })
  }

  setDim (svg, width, height) {
    this.svg = svg
    this.width = width
    this.height = height
    this.legend = new Legend(this.legendSettings, this.axisSettings)

    this.vb = new ViewBox(width, height, this.legend, this.labelsFont)

    this.legend.setX(this.vb.getLegendX())

    this.data = new PlotData(this.X,
                         this.Y,
                         this.Z,
                         this.xDataType,
                         this.yDataType,
                         this.xLevels,
                         this.yLevels,
                         this.group,
                         this.label,
                         this.labelAlt,
                         this.vb,
                         this.legend,
                         this.colors,
                         this.fixedRatio,
                         this.originAlign,
                         this.pointRadius,
                         this.bounds,
                         this.transparency,
                         this.legendSettings)

    this.drawFailureCount = 0
  }

  draw () {
    // Tell visual tests widget as not ready
    this.svg.node().parentNode.setAttribute('rhtmlwidget-status', 'loading')

    return this.drawLabsAndPlot()
      //.then(() => this.drawLegend())
      //.then(() => this.drawLabsAndPlot())
      /*.then(() => {

        // if you remove this then the life expectancy bubble plot will not have the legendLabels in the legend. It will only have the groups
        if (this.data.legendRequiresRedraw) {
          return this.drawLegend()
        }
      })*/
      .then(() => {
        const debugMsg = new DebugMessage(this.svg, this.vb, this.debugMode)
        debugMsg.draw(this.data.lab)
        console.log(`draw succeeded after ${this.drawFailureCount} failures`)
        this.drawFailureCount = 0
      })
      .catch((err) => {
        this.drawFailureCount++
        if (this.drawFailureCount >= this.maxDrawFailureCount) {
          console.log(`draw failure ${err.message} (fail count: ${this.drawFailureCount}). Exceeded max draw failures of ${this.maxDrawFailureCount}. Terminating`)
          throw err
        }

        if (err && err.retry) {
          console.log(`draw failure ${err.message} (fail count: ${this.drawFailureCount}). Redrawing`)
          return this.draw()
        }

        throw err
      }).finally(() => {
        // Tell visual tests that widget is done rendering
        this.svg.node().parentNode.setAttribute('rhtmlwidget-status', 'ready')
      })
  }

  isEqual (otherPlot) {
    // Test if RectPlot is equal to another, does not include all parameters for comparison (only those set in Displayr added now)
    // TODO: Add rest of the data components
    const eqX = _.isEqual(this.X, otherPlot.X)
    const eqY = _.isEqual(this.Y, otherPlot.Y)
    const eqZ = _.isEqual(this.Z, otherPlot.Z)
    const eqGroup = _.isEqual(this.group, otherPlot.group)
    const eqLabel = _.isEqual(this.label, otherPlot.label)
    const eqLabelAlt = _.isEqual(this.labelAlt, otherPlot.labelAlt)
    const listOfComparisons = [eqX, eqY, eqZ, eqGroup, eqLabel, eqLabelAlt]
    return _.every(listOfComparisons, e => _.isEqual(e, true))
  }

  drawLabsAndPlot () {
    this.data.normalizeData()
    return this.data.getPtsAndLabs('RectPlot.drawLabsAndPlot').then(() => {
      if (!this.state.isLegendPtsSynced(this.data.outsidePlotPtsId)) {
        _.map(this.state.getLegendPts(), pt => {
          if (!_.includes(this.data.outsidePlotPtsId, pt)) {
            this.data.addElemToLegend(pt)
          }
        })

        _.map(this.data.outsidePlotPtsId, pt => {
          if (!_.includes(this.state.getLegendPts(), pt)) {
            this.state.pushLegendPt(pt)
          }
        })
        const error = new Error('drawLabsAndPlot failed : state.isLegendPtsSynced = false')
        error.retry = true
        throw error
      }
      this.data.syncHiddenLabels(this.state.hiddenLabelPts)
    }).then(() => {
      try {
        this.drawResetButton()

        this.state.updateLabelsWithPositionedData(this.data.lab, this.data.vb)
        if (this.trendLines.show) {
          this.tl = new TrendLine(this.data.pts, this.data.lab)
        }

        // Draw in the following order so that label images (logos) are under
        // anchor markers, which in turn are under text labels
        this.drawLabelImages()
        this.drawLabs()
        this.placeLabels().then(() => {
          if (this.trendLines.show) {
            this.drawTrendLines()
          } else {
            this.drawLinks()
          }
          this.drawDraggedMarkers()
        })

        // this.vb.drawBorderWith(this.svg, this.plotBorder)
      } catch (error) {
        console.log(error)
      }
    })
  }

  drawResetButton () {
    if (this.showResetButton) {
      this.resetButton = new ResetButton(this)
      this.resetButton.drawWith(this.svg, this.width, this.height, this.state)
    }
  }

  drawLegend () {
    return new Promise((resolve, reject) => {
      this.data.setLegend()
      if (this.legendSettings.showBubblesInLegend() && Utils.isArrOfNums(this.Z)) {
        this.legend.drawBubblesWith(this.svg)
        this.legend.drawBubblesLabelsWith(this.svg)
        this.legend.drawBubblesTitleWith(this.svg)
      }

      const drag = DragUtils.getLegendLabelDragAndDrop(this, this.data)
      this.legend.drawDraggedPtsTextWith(this.svg, drag)

      if (this.legendSettings.showLegend()) {
        this.legend.drawGroupsTextWith(this.svg)
        this.legend.drawGroupsPts(this.svg)
      }

      if (this.legendSettings.isDisplayed(this.Z, this.data.legendPts)) {
        if (this.legend.resizedAfterLegendGroupsDrawn(this.data.vb, this.axisSettings.textDimensions)) {
          this.data.revertMinMax()
          const error = new Error('drawLegend Failed')
          error.retry = true
          return reject(error)
        }
      }
      return resolve()
    })
  }

  /**
   * This draws the marker label (index starting from 1) and the line connecting the marker label to the marker.
   * This does not draw the label to the side of the plot area (that is part of the legend).
   */
  drawDraggedMarkers () {
    this.svg.selectAll('.marker').remove()
    this.svg.selectAll('.marker')
        .data(this.data.outsidePlotMarkers)
        .enter()
        .append('line')
        .attr('class', 'marker')
        .attr('x1', d => d.x1)
        .attr('y1', d => d.y1)
        .attr('x2', d => d.x2)
        .attr('y2', d => d.y2)
        .attr('stroke-width', d => d.width)
        .attr('stroke', d => d.color)

    this.svg.selectAll('.marker-label').remove()
    this.svg.selectAll('.marker-label')
        .data(this.data.outsidePlotMarkers)
        .enter()
        .append('text')
        .attr('class', 'marker-label')
        .attr('x', d => d.markerTextX)
        .attr('y', d => d.markerTextY)
        .attr('font-family', 'Arial')
        .attr('text-anchor', 'start')
        .attr('font-size', this.legend.getMarkerTextSize())
        .attr('fill', d => d.color)
        .text(d => d.markerLabel)
  }

  resetPlotAfterDragEvent () {
    const plotElems = [
      '.plot-viewbox',
      '.origin',
      '.dim-marker',
      '.dim-marker-leader',
      '.dim-marker-label',
      '.axis-label',
      '.legend-pts',
      '.legend-text',
      '.anc',
      '.link',
    ]
    _.forEach(plotElems, (elem, i) => {
      this.svg.selectAll(elem).remove()
    })
    return this.draw()
  }

  drawLabs () {
    let drag
    if (this.showLabels) {
      if (!this.trendLines.show) {
        drag = DragUtils.getLabelDragAndDrop(this)

        this.svg.selectAll(`.plt-${this.pltUniqueId}-lab`).remove()
        this.svg.selectAll(`.plt-${this.pltUniqueId}-lab`)
                 .data(this.data.getTextLabels())
                 .enter()
                 .append('text')
                 .attr('class', `plt-${this.pltUniqueId}-lab`)
                 .attr('id', d => d.id)
                 .attr('x', d => d.x)
                 .attr('y', d => d.y)
                 .attr('font-family', d => d.fontFamily)
                 .text(d => d.text)
                 .attr('text-anchor', 'middle')
                 .attr('fill', d => d.color)
                 .attr('opacity', d => d.opacity)
                 .attr('font-size', d => d.fontSize)
                 .style('cursor', 'move')
                 .call(drag)
      } else if (this.trendLines.show) {
        drag = DragUtils.getLabelDragAndDrop(this, this.trendLines.show)
        this.tl.drawLabelsWith(this.pltUniqueId, this.svg, drag)
      }
    }
  }

  drawLabelImages () {
    let drag
    if (this.showLabels) {
      if (!this.trendLines.show) {
        drag = DragUtils.getLabelDragAndDrop(this)

        this.svg.selectAll(`.plt-${this.pltUniqueId}-lab-img`).remove()
        this.svg.selectAll(`.plt-${this.pltUniqueId}-lab-img`)
            .data(this.data.getImgLabels())
            .enter()
            .append('svg:image')
            .attr('class', `plt-${this.pltUniqueId}-lab-img`)
            .attr('xlink:href', d => d.url)
            .attr('id', d => d.id)
            .attr('x', d => d.x - (d.width / 2))
            .attr('y', d => d.y - d.height)
            .attr('width', d => d.width)
            .attr('height', d => d.height)
            .style('cursor', 'move')
            .call(drag)
      } else if (this.trendLines.show) {
        drag = DragUtils.getLabelDragAndDrop(this, this.trendLines.show)
        this.tl.drawImageLabelsWith(this.pltUniqueId, this.svg, drag)
      }
    }
  }

  placeLabels () {
    if (this.showLabels) {
      if (!this.trendLines.show) {
        const placementPromise = new Promise((resolve, reject) => {
          this.labelPlacement.placeLabels(
            this.vb,
            this.data.pts,
            this.data.lab,
            this.state,
            resolve
          )
        })

        placementPromise.then(() => {
          const labelsSvg = this.svg.selectAll(`.plt-${this.pltUniqueId}-lab`)
          const labelsImgSvg = this.svg.selectAll(`.plt-${this.pltUniqueId}-lab-img`)

          // Move labels after label placement algorithm
          labelsSvg.attr('x', d => d.x)
                   .attr('y', d => d.y)
          labelsImgSvg.attr('x', d => d.x - (d.width / 2))
                      .attr('y', d => d.y - d.height)

          if (DEBUG_ADD_BBOX_TO_IMG) {
            this.svg.selectAll(`.plt-${this.pltUniqueId}-lab-img-debug-bbox`)
              .data(this.data.getImgLabels())
              .enter()
              .append('rect')
              .attr('class', `plt-${this.pltUniqueId}-lab-img-debug-bbox`)
              .attr('x', d => d.x - (d.width / 2))
              .attr('y', d => d.y - d.height)
              .attr('width', d => d.width)
              .attr('height', d => d.height)
              .attr('fill', 'none')
              .attr('stroke', 'black')
          }

          this.drawLinks()
        })
        return placementPromise
      } else if (this.trendLines.show) {
        const placementPromise = new Promise((resolve, reject) => {
          this.labelPlacement.placeTrendLabels(
            this.vb,
            this.tl.pts,
            this.tl.arrowheadLabels,
            this.state,
            resolve
          )
        })
        placementPromise.then(() => {
          const labelsSvg = this.svg.selectAll(`.plt-${this.pltUniqueId}-lab`)
          const labelsImgSvg = this.svg.selectAll(`.plt-${this.pltUniqueId}-lab-img`)

          // Move labels after label placement algorithm
          labelsSvg.attr('x', d => d.x)
                   .attr('y', d => d.y)
          labelsImgSvg.attr('x', d => d.x - (d.width / 2))
                      .attr('y', d => d.y - d.height)
        })
        return placementPromise
      }
    }
  }

  drawLinks () {
    const links = new Links(this.data.pts, this.data.lab)
    links.drawWith(this.svg, this.data.plotColors, this.transparency)
  }

  drawTrendLines () {
    this.tl.drawWith(this.svg, this.data.plotColors, this.trendLines)
  }

  resized (svg, width, height) {
    // some of the below throw, so wrap in a promise chain to ensure errors do not escape
    return Promise.resolve()
      .then(() => {
      this.svg = svg
      this.width = width
      this.height = height
      this.footer.updateContainerHeight(this.height)
      this.setDim(this.svg, this.width, this.height)
      this.labelPlacement.updateSvgOnResize(this.svg)
      this.state.resetStateOnResize(this.vb)
      return this.draw()
    })
  }
}

module.exports = RectPlot
