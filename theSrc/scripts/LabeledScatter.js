import d3 from 'd3'
import _ from 'lodash'
import { buildConfig } from './buildConfig'
import { createPlotlyData, createPlotlyLayout, addSmallMultipleSettings } from './PlotlyChartElements'
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
import FitLine from './FitLine'
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
      const legend_points_and_bubble_legend_width = this.legendPointsAndBubbleLegendWidth(config)
      const margin_right = legend_points_and_bubble_legend_width > 0 && config.marginAutoexpand ? legend_points_and_bubble_legend_width : null
      const plot_layout = createPlotlyLayout(config, margin_right)
      const plot_config = {
        displayModeBar: false,
        editable: false,
        edits: { annotationTail: true, legendPosition: false }
      }

      let plotlyChart = await Plotly.react(this.rootElement, plot_data, plot_layout, plot_config)
      if (Array.isArray(config.panels)) {
        await this.drawSmallMultipleLabels(plotlyChart, config)

        // Event handler for legendtoggle
        let lastevent = ''
        plotlyChart.on('plotly_legendclick', async (data) => {
          lastevent = 'legendclick'
          const annotations = plotlyChart._fullLayout.annotations
          await Plotly.relayout(plotlyChart, { annotations: this.applyLegendClick(annotations, data, config) })
          lastevent = 'legendclick'
        })

        // Event handler for Reset button
        plotlyChart.on('plotly_clickannotation', async (data) => {
          console.log(data)
          if (data.annotation.text === 'Reset') {
            this.stateObj.resetState()
            await this.drawSmallMultipleLabels(plotlyChart, config)
            lastevent = 'clickreset'
          }
        })

        // Event handler for dragging and toggling scatter labels
        // But do not save legend toggle
        plotlyChart.on('plotly_afterplot', () => {
          console.log('last event: ' + lastevent)
          if (lastevent === '') {
            this.stateObj.saveToState({ 'plotlyAnnotations': plotlyChart._fullLayout.annotations
            .filter(
                a => a.showarrow &&                         // these are the scatter marker labels
                !(a.ax === 0 && a.ay === -10 && a.visible   // not in the default state
              ))
            .map((a) => {
              return {
                index: a._index,
                text: a.text,
                visible: a.visible,
                xoffset: a.ax,
                yoffset: a.ay
              }
            }) })
            console.log('saved plotly annotations:' + JSON.stringify(this.stateObj.getStored('plotlyAnnotations')))
          }
          lastevent = ''
        })
      } else {
          const tmp_layout = {}
          const is_legend_elements_to_right_of_plotly_legend = this.isLegendElementsToRightOfPlotlyLegend(plotlyChart._fullLayout, config)
          if (is_legend_elements_to_right_of_plotly_legend && config.marginAutoexpand) {
            const nsewdrag_rect = this.nsewdragRect()
            const legend_right = config.colorScale !== null ? this.plotlyColorbarRect().right : this.plotlyLegendRect().right
            const required_margin = (legend_right - nsewdrag_rect.right) + legend_points_and_bubble_legend_width
            tmp_layout['margin.r'] = Math.max(required_margin, config.marginRight)
          }
          if (Object.keys(tmp_layout).length > 0) plotlyChart = await Plotly.relayout(plotlyChart, tmp_layout)
          await this.drawScatterLabelLayer(plotlyChart._fullLayout, plotlyChart._fullData, config, is_legend_elements_to_right_of_plotly_legend)

          if (FitLine.isFitDataAvailable(config)) {
            FitLine.draw(this.rootElement, config)
          }

          plotlyChart.on('plotly_afterplot', () => {
            this.drawScatterLabelLayer(plotlyChart._fullLayout, plotlyChart._fullData, config, is_legend_elements_to_right_of_plotly_legend)
          })

          this.addMarkerClickHandler()
    }
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

  async drawScatterLabelLayer (plotly_chart_layout, plotly_chart_data, config, is_legend_elements_to_right_of_plotly_legend) {
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

    const legend_elements_rect = this.getLegendElementsRect(plotly_chart_layout, is_legend_elements_to_right_of_plotly_legend, nsewdrag_rect, config)

    config.hiddenSeries = plotly_chart_data.filter(d => d.visible === 'legendonly').map(d => d.name)

    this.plot = new RectPlot({
      config: config,
      stateObj: this.stateObj,
      svg,
      rootElement: d3.select(this.rootElement),
      reset: () => this.draw(),
      legendElementsRect: legend_elements_rect
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

  /**
   * Returns a rectangle of the legend elements (legend points and bubble legend) in coordinates relative to the scatterlabellayer svg
   */
  getLegendElementsRect (plotly_chart_layout, is_legend_elements_to_right_of_plotly_legend, nsewdrag_rect, config) {
    if (is_legend_elements_to_right_of_plotly_legend) {
      const legend_right = config.colorScale !== null ? this.plotlyColorbarRect().right : this.plotlyLegendRect().right
      return {
        x: legend_right - nsewdrag_rect.x,
        y: LEGEND_POINTS_PADDING_TOP,
        width: this.legendPointsAndBubbleLegendWidth(config),
        height: Math.max(nsewdrag_rect.height - LEGEND_POINTS_PADDING_TOP - this.legendBubbleHeight(config), LEGEND_POINTS_MINIMUM_HEIGHT)
     }
    } else if (plotly_chart_layout.legend && this.isPlotlyLegendOnRight(plotly_chart_layout)) {
      const plotly_legend_rect = this.plotlyLegendRect()
      return {
        x: nsewdrag_rect.width,
        y: plotly_legend_rect.height + LEGEND_POINTS_PADDING_TOP,
        width: this.width - nsewdrag_rect.right,
        height: Math.max(nsewdrag_rect.y + nsewdrag_rect.height - (plotly_legend_rect.y + plotly_legend_rect.height) - LEGEND_POINTS_PADDING_TOP - this.legendBubbleHeight(config), LEGEND_POINTS_MINIMUM_HEIGHT)
      }
    } else {
      return {
        x: nsewdrag_rect.width,
        y: LEGEND_POINTS_PADDING_TOP,
        width: this.width - nsewdrag_rect.right,
        height: Math.max(nsewdrag_rect.height - LEGEND_POINTS_PADDING_TOP - this.legendBubbleHeight(config), LEGEND_POINTS_MINIMUM_HEIGHT)
      }
    }
  }

  legendPointsAndBubbleLegendWidth (config) {
    let width = 0
    if (this.stateObj.legendPts.length > 0) {
      width = Math.max(LEGEND_POINTS_MARGIN_RIGHT, width)
    }
    if (this.hasBubbleLegend(config)) {
      const bubble_radius = LegendUtils.normalizedZtoRadius(config.pointRadius, 1)
      width = Math.max(2 * (bubble_radius + LEGEND_BUBBLE_PADDING_SIDE), width)
    }
    return width
  }

  /**
   * Whether legend elements (legend points or bubble legend) are to be shown to the right of the plotly legend
   */
  isLegendElementsToRightOfPlotlyLegend (plotly_chart_layout, config) {
    if (config.colorScale !== null && (this.stateObj.legendPts.length > 0 || this.hasBubbleLegend(config))) {
      return true
    }
    if (!plotly_chart_layout.legend || !this.isPlotlyLegendOnRight(plotly_chart_layout)) {
      return false
    }

    const nsewdrag_rect = this.nsewdragRect()
    const plotly_legend_rect = this.plotlyLegendRect()
    const height_under_legend = nsewdrag_rect.y + nsewdrag_rect.height - (plotly_legend_rect.y + plotly_legend_rect.height) - LEGEND_POINTS_PADDING_TOP

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
    const rect = nsewdrag[0][0].getBBox()
    return Utils.addTopBottomLeftRight(rect)
  }

  plotlyLegendRect () {
    const legend_bg = d3.select(this.rootElement).select('.legend rect.bg')
    const rect = legend_bg[0][0].getBBox()
    const ctm = legend_bg[0][0].getCTM()
    rect.x = ctm.e
    rect.y = ctm.f
    return Utils.addTopBottomLeftRight(rect)
  }

  isPlotlyLegendOnRight (plotly_chart_layout) {
    const nsew_drag_rect = this.nsewdragRect()
    const plotly_legend_rect = this.plotlyLegendRect()
    return plotly_chart_layout.legend.orientation === 'v' && plotly_legend_rect.right > nsew_drag_rect.right
  }

  plotlyColorbarRect () {
    const colorbar = d3.select(this.rootElement).select('.colorbar')
    const rect = colorbar[0][0].getBBox()
    const ctm = colorbar[0][0].getCTM()
    rect.x += ctm.e
    rect.y += ctm.f
    return Utils.addTopBottomLeftRight(rect)
  }

  hasBubbleLegend (config) {
    return config.legendBubblesShow && config.Z && !_.isEmpty(config.Z)
  }

  async drawSmallMultipleLabels (plotly_chart, config) {
      const saved_annotations = this.stateObj.isStoredInState('plotlyAnnotations')
        ? this.stateObj.getStored('plotlyAnnotations')
        : null
      const small_multiple_settings = addSmallMultipleSettings(plotly_chart._fullLayout, config, saved_annotations)
      await Plotly.restyle(plotly_chart, { visible: true })
      await Plotly.relayout(plotly_chart, small_multiple_settings)
  }

  applyLegendClick (annotations, eventdata, config) {
    const changed = eventdata.data[eventdata.curveNumber].name
    for (let i = 0; i < config.group.length; i++) {
        if (config.group[i] === changed) annotations[i].visible = !annotations[i].visible
    }
    return annotations
  }
}

module.exports = LabeledScatter
