import d3 from 'd3'
import _ from 'lodash'
import { buildConfig } from './buildConfig'
import { createPlotlyData, createPlotlyLayout } from './PlotlyChartElements'
import DisplayError from './DisplayError'
import {
  LEGEND_POINTS_PADDING_TOP,
  LEGEND_POINTS_ROW_PADDING,
  LEGEND_BUBBLE_TITLE_HEIGHT,
  LEGEND_POINTS_MARGIN_RIGHT,
  LEGEND_POINTS_MINIMUM_HEIGHT,
  LEGEND_BUBBLE_PADDING_SIDE,
  LEGEND_BUBBLE_PADDING_TOP
} from './Legend'
import Plotly from 'plotly.js-basic-dist-min'
import RectPlot from './RectPlot'
import State from './State'
import Utils from './utils/Utils'
import LegendUtils from './utils/LegendUtils'
import 'babel-polyfill'

import InsufficientHeightError from './exceptions/InsufficientHeightError'
import InsufficientWidthError from './exceptions/InsufficientWidthError'
import DataTypeEnum from './utils/DataTypeEnum'

class LabeledScatter {
  constructor (element, width, height, stateChangedCallback) {
    this.rootElement = _.has(element, 'length') ? element[0] : element
    this.width = width
    this.height = height
    this.stateChangedCallback = stateChangedCallback
    this.resizeStack = []
    this.resizeDelayPromise = null
  }

  setConfig (data) {
    // NB this is where you should sanitise user input. Not in scope for this repo
    // Reset widget if previous data present but not equal in params - see VIS-278
    if (!(_.isUndefined(this.data)) && !(_.isUndefined(this.plot)) && !(this.plot.isEqual(data))) {
      delete this.plot
    }
    if (!(_.isNull(data.X)) && !(_.isNull(data.Y))) {
      this.data = data
    }
  }

  setUserState (userStateInput) {
    // NB this is where you should sanitise user input. Not in scope for this repo
    let userState = null
    try {
      userState = (_.isString(userStateInput)) ? JSON.parse(userStateInput) : userStateInput
    } catch (error) {
      console.log(error)
      // NB it is (currently) ok to initialise with userState = null, so allow it as we deliberately choose to let this widget fail open (i.e. ignore state and continue rendering)
    }

    this.stateObj = new State(userState, this.stateChangedCallback, this.data.X, this.data.Y, this.data.label, this.data.labelsMaxShown)
  }

  async draw () {
    d3.select(this.rootElement).selectAll('*').remove()
    d3.select(this.rootElement)
      .attr('class', 'plot-container rhtmlwidget-outer-svg')
      .style('width', this.width + 'px')
      .style('height', this.height + 'px')

    // Tell visual tests widget as not ready
    d3.select(this.rootElement).node().setAttribute('rhtmlwidget-status', 'loading')

    // Error checking
    DisplayError.isAxisValid(this.data.X, this.rootElement, 'Given X values is neither array of nums, dates, or strings!')
    DisplayError.isAxisValid(this.data.Y, this.rootElement, 'Given Y values is neither array of nums, dates, or strings!')
    DisplayError.isEqualLength(this.data.X, this.data.Y, this.rootElement, 'Given X and Y arrays not equal length!')
    if (!_.isEmpty(this.data.Z)) {
      DisplayError.checkIfArrayOfPositiveNums(this.data.Z, this.rootElement, 'Given Z value is not array of positive numbers')
      DisplayError.isEqualLength(this.data.X, this.data.Z, this.rootElement, 'Given Z array not equal length to X and Y!')
    }

    const config = buildConfig(this.data, this.width, this.height)
    try {
      const plot_data = createPlotlyData(config)
      const plot_layout = createPlotlyLayout(config, this.marginRight(config))
      const plot_config = { displayModeBar: false, editable: false }

      let plotlyChart = await Plotly.react(this.rootElement, plot_data, plot_layout, plot_config)
      const tmp_layout = {}
      const is_extra_margin_needed_for_legend = this.isExtraMarginNeededForLegend(plotlyChart._fullLayout, config)
      if (is_extra_margin_needed_for_legend) {
        tmp_layout['margin.r'] = this.plotlyLegendOrColorBarWidth() + LEGEND_POINTS_MARGIN_RIGHT
      }
      if (Object.keys(tmp_layout).length > 0) plotlyChart = await Plotly.relayout(plotlyChart, tmp_layout)
      await this.drawScatterLabelLayer(plotlyChart._fullLayout, config, is_extra_margin_needed_for_legend)

      plotlyChart.on('plotly_afterplot', () => {
        this.drawScatterLabelLayer(plotlyChart._fullLayout, config, is_extra_margin_needed_for_legend)
      })

      this.addMarkerClickHandler()
    } catch (err) {
      if (
        err.type === InsufficientHeightError.type ||
        err.type === InsufficientWidthError.type
          ) {
        console.log(`caught expected error '${err.type}' and aborted rendering`)
        DisplayError.displayEmptyErrorContainer(this.rootElement)
      } else {
        throw err
      }
    } finally {
      // Tell visual tests widget is done rendering
      d3.select(this.rootElement).node().setAttribute('rhtmlwidget-status', 'ready')
    }
  }

  async drawScatterLabelLayer (plotly_chart_layout, config, is_legend_points_to_right_of_plotly_legend) {
    d3.select(this.rootElement).select('.scatterlabellayer').remove()

    // The scatter labels need to be in the drag layer so that mouse events
    // such as dragging labels work (the drag layer covers the whole plot area
    // and consumes mouse events over that area)
    const drag_layer = d3.select(this.rootElement).select('.draglayer')
    this.moveDragLayerToBeLast()

    const nsewdrag_rect = this.nsewdragRect()

    const plot_width = nsewdrag_rect.width
    const plot_height = nsewdrag_rect.height
    const svg = drag_layer
        .append('svg')
        .attr('class', 'scatterlabellayer')
        .attr('x', nsewdrag_rect.x)
        .attr('y', nsewdrag_rect.y)
        .attr('width', this.width - nsewdrag_rect.x)
        .attr('height', plot_height)
    config.yBoundsMinimum = this.convertValueType(plotly_chart_layout.yaxis.range[0], config.yDataType)
    config.yBoundsMaximum = this.convertValueType(plotly_chart_layout.yaxis.range[1], config.yDataType)
    config.xBoundsMinimum = this.convertValueType(plotly_chart_layout.xaxis.range[0], config.xDataType)
    config.xBoundsMaximum = this.convertValueType(plotly_chart_layout.xaxis.range[1], config.xDataType)
    config.width = plot_width
    config.height = plot_height

    const legend_points_rect = this.getLegendPointsRect(plotly_chart_layout, is_legend_points_to_right_of_plotly_legend, nsewdrag_rect, config)

    this.plot = new RectPlot({
      config,
      stateObj: this.stateObj,
      svg,
      rootElement: d3.select(this.rootElement),
      reset: () => this.draw(),
      legendPointsRect: legend_points_rect
    })
    await this.plot.draw()
  }

  convertValueType (x, type) {
    if (x === null) return x
    if (type !== DataTypeEnum.date) return x
    else return new Date(x).getTime()
  }

  resize (el, width, height) {
    // NB this is where you should sanitise user input. Not in scope for this repo
    this.resizeStack.push([el, width, height])
    return this.getResizeDelayPromise()
  }

  getResizeDelayPromise () {
    if (_.isNull(this.resizeDelayPromise)) {
      this.resizeDelayPromise = new Promise(() => {
        return setTimeout(() => {
          console.log('rhtmlLabeledScatter: resize timeout')

          const resizeParams = this.resizeStack.pop()
          const width = resizeParams[1]
          const height = resizeParams[2]
          this.resizeStack = []

          this.width = width
          this.height = height

          this.draw()

          // TODO this should be in a then/catch/finally attached to this.plot.resized but not going to attempt that now
          this.resizeDelayPromise = null
        }, 500)
      })
    }

    return this.resizeDelayPromise
  }

  addMarkerClickHandler () {
    // nsewdrag is an SVG rect element created by plotly covering the entire plotting area.
    // It is used by plotly to trigger hover events for marker tooltips.
    // We add the onclick handler to nsewdrag instead of the markers because if we added it to the markers,
    // we would have to set pointerevents to "all" for the markers and tooltips would no longer appear
    // when hovering directly above markers as they are drawn on top of nsewdrag.
    const el = d3.select(this.rootElement).select('.nsewdrag')
    el[0][0].onclick = e => {
      const markers = d3.select(this.rootElement).selectAll('.point')[0]
      for (let i = 0; i < markers.length; i++) {
        const ctm = markers[i].getCTM()
        const marker_radius = 0.5 * markers[i].getBBox().width
        const is_marker_clicked_on = Utils.euclideanDistance({ x: ctm.e, y: ctm.f }, { x: e.offsetX, y: e.offsetY }) < marker_radius
        if (is_marker_clicked_on) {
          const hide = this.plot.data.toggleLabelShowFromMarkerIndex(i)
          this.plot.state.updateHiddenLabelPt(i, hide)
          this.plot.drawLinks()
          this.plot.drawLabs()
          break
        }
      }
    }
  }

  getLegendPointsRect (plotly_chart_layout, is_legend_points_to_right_of_plotly_legend, nsewdrag_rect, config) {
    if (is_legend_points_to_right_of_plotly_legend) {
      return {
        x: nsewdrag_rect.width + this.plotlyLegendOrColorBarWidth(),
        y: LEGEND_POINTS_PADDING_TOP,
        width: LEGEND_POINTS_MARGIN_RIGHT,
        height: Math.max(nsewdrag_rect.height - LEGEND_POINTS_PADDING_TOP - this.legendBubbleHeight(config), LEGEND_POINTS_MINIMUM_HEIGHT)
     }
    } else if (plotly_chart_layout.legend) {
      const legend_rect = this.legendRect()
      return {
        x: nsewdrag_rect.width,
        y: legend_rect.height + LEGEND_POINTS_PADDING_TOP,
        width: this.width - nsewdrag_rect.x - nsewdrag_rect.width,
        height: Math.max(nsewdrag_rect.height - legend_rect.height - LEGEND_POINTS_PADDING_TOP - this.legendBubbleHeight(config), LEGEND_POINTS_MINIMUM_HEIGHT)
      }
    } else {
      return {
        x: nsewdrag_rect.width,
        y: LEGEND_POINTS_PADDING_TOP,
        width: this.width - nsewdrag_rect.x - nsewdrag_rect.width,
        height: Math.max(nsewdrag_rect.height - LEGEND_POINTS_PADDING_TOP - this.legendBubbleHeight(config), LEGEND_POINTS_MINIMUM_HEIGHT)
      }
    }
  }

  marginRight (config) {
    let margin = 0
    if (this.stateObj.legendPts.length > 0) {
      margin = Math.max(LEGEND_POINTS_MARGIN_RIGHT, margin)
    }
    if (this.hasBubbleLegend(config)) {
      const bubble_radius = LegendUtils.normalizedZtoRadius(config.pointRadius, 1)
      margin = Math.max(2 * (bubble_radius + LEGEND_BUBBLE_PADDING_SIDE), margin)
    }
    return margin > 0 ? margin : null
  }

  isExtraMarginNeededForLegend (plotly_chart_layout, config) {
    if (config.colorScale !== null && (this.stateObj.legendPts.length > 0 || this.hasBubbleLegend(config))) {
      return true
    }
    if (!plotly_chart_layout.legend) {
      return false
    }

    const nsewdrag_rect = this.nsewdragRect()
    const legend_rect = this.legendRect()
    const height_under_legend = nsewdrag_rect.height - legend_rect.height - LEGEND_POINTS_PADDING_TOP

    let required_height = 0
    if (this.stateObj.legendPts.length > 0) {
      required_height += this.stateObj.legendPts.length * this.legendPointsRowHeight(config)
    }
    if (this.hasBubbleLegend(config)) {
      required_height += this.legendBubbleHeight(config)
    }
    return required_height > 0 && required_height > height_under_legend
  }

  legendPointsRowHeight (config) {
    return config.legendFontSize + LEGEND_POINTS_ROW_PADDING
  }

  legendBubbleHeight (config) {
    if (!this.hasBubbleLegend(config)) {
      return 0
    }
    let height = LegendUtils.normalizedZtoRadius(config.pointRadius, 1) * 2 + config.legendBubbleFontSize + LEGEND_BUBBLE_PADDING_TOP
    if (config.zTitle) {
      height += config.legendBubbleTitleFontSize * LEGEND_BUBBLE_TITLE_HEIGHT
    }
    return height
  }

  plotlyLegendOrColorBarWidth () {
    let el = d3.select(this.rootElement).select('.legend')
    if (el === undefined || el.empty()) el = d3.select(this.rootElement).select('.colorbar')
    if (el === undefined || el.empty()) return null
    return el[0][0].getBBox().width
  }

  /**
   * Move drag layer so that the labels drawn inside it appear after other elements
   * such as markers and gridlines
   */
  moveDragLayerToBeLast () {
    const drag_layer = d3.select(this.rootElement).select('.draglayer')
    // The first "main-svg" containing the cartesian layer
    const main_svg = d3.select(this.rootElement).select('.main-svg')
    main_svg[0][0].appendChild(drag_layer[0][0])
  }

  nsewdragRect () {
    const nsewdrag = d3.select(this.rootElement).select('.nsewdrag')
    return nsewdrag[0][0].getBBox()
  }

  legendRect () {
    const legend_bg = d3.select(this.rootElement).select('.legend rect.bg')
    return legend_bg[0][0].getBBox()
  }

  hasBubbleLegend (config) {
    return config.legendBubblesShow && config.Z && !_.isEmpty(config.Z)
  }
}

module.exports = LabeledScatter
