import d3 from 'd3'
import _ from 'lodash'
import { buildConfig } from './buildConfig'
import {
  createPlotlyData,
  createPlotlyLayout,
  addSmallMultipleSettings,
  titleHeight,
  footerHeight,
  chartHeight,
  LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE
} from './PlotlyChartElements'
import DisplayError from './DisplayError'
import {
  LEGEND_POINTS_PADDING_TOP,
  LEGEND_POINTS_ROW_PADDING,
  LEGEND_POINTS_MARGIN_RIGHT,
  LEGEND_POINTS_MINIMUM_HEIGHT,
} from './Legend'
import {
  LEGEND_BUBBLE_TITLE_HEIGHT,
  LEGEND_BUBBLE_PADDING_SIDE,
  LEGEND_BUBBLE_PADDING_TOP
} from './BubbleLegend'
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
      const margin_right = legend_points_and_bubble_legend_width > 0 && config.marginAutoexpand ? legend_points_and_bubble_legend_width : 20
      const plot_layout = createPlotlyLayout(config, margin_right, this.height)
      const plot_config = {
        displayModeBar: false,
        editable: false,
        edits: { annotationTail: true, legendPosition: false }
      }

      let plotlyChart = await Plotly.react(this.rootElement, plot_data, plot_layout, plot_config)
      if (Array.isArray(config.panels)) {
        const tmp_layout = {}
        if (config.marginAutoexpand && config.panelShareAxes) {
          if (config.yTitle && config.yTitle.length > 0) {
            const margin_left = this.marginLeftForYTitleAnnotation(config)
            if (margin_left > config.marginLeft) {
              tmp_layout['margin.l'] = margin_left
            }
          }
          if (config.xTitle && config.xTitle.length > 0) {
            const margin_bottom = this.marginBottomForXTitleAnnotation(config)
            if (margin_bottom > config.marginBottom) {
              tmp_layout['margin.b'] = margin_bottom
            }
          }
        }
        if (Object.keys(tmp_layout).length > 0) {
          plotlyChart = await Plotly.relayout(plotlyChart, tmp_layout)
        }

        await this.drawSmallMultipleLabels(plotlyChart, config)

        if (config.showResetButton) this.drawResetButton(plotlyChart, config)

        if (FitLine.isFitDataAvailable(config)) {
          await FitLine.draw(this.rootElement, config)
        }
        this.adjustTitles(plotlyChart._fullLayout, config)

        // Event handler for legendtoggle
        let lastevent = ''
        if (config.label) {
          plotlyChart.on('plotly_legendclick', async (data) => {
            lastevent = 'legendclick'
            const annotations = plotlyChart._fullLayout.annotations
            await Plotly.relayout(plotlyChart, { annotations: this.applyLegendClick(annotations, data, config) })
            lastevent = 'legendclick'
          })
        }

        // Event handler for dragging and toggling scatter labels
        // But do not save legend toggle
        plotlyChart.on('plotly_afterplot', () => {
          this.adjustTitles(plotlyChart._fullLayout, config)
          if (lastevent === '') {
            this.stateObj.saveToState({ 'userPositionedSmallMultipleLabels': plotlyChart._fullLayout.annotations
            .filter(
                a => a.showarrow && // these are the scatter marker labels
                !(a.ax === a.x && a.ay === a.y && a.visible // not in the default state
              ))
            .map((a) => {
              return {
                index: a._index,
                text: a.text,
                visible: a.visible,
                xpos: a.ax,
                ypos: a.ay
              }
            }) })
          }
          lastevent = ''
        })
      } else {
        if (FitLine.isFitDataAvailable(config)) {
          await FitLine.draw(this.rootElement, config)
        }
        this.adjustTitles(plotlyChart._fullLayout, config)
        const tmp_layout = {}
        const is_legend_elements_to_right_of_plotly_legend = this.isLegendElementsToRightOfPlotlyLegend(plotlyChart._fullLayout, config)
        if (is_legend_elements_to_right_of_plotly_legend && config.marginAutoexpand) {
          const nsewdrag_rect = this.nsewdragRect()
          const legend_right = config.colorScale !== null ? this.plotlyColorbarRect().right : this.plotlyLegendRect().right
          const required_margin = (legend_right - nsewdrag_rect.right) + legend_points_and_bubble_legend_width
          tmp_layout['margin.r'] = Math.max(required_margin, config.marginRight)
        }
        if (Object.keys(tmp_layout).length > 0) {
          plotlyChart = await Plotly.relayout(plotlyChart, tmp_layout)
          this.adjustTitles(plotlyChart._fullLayout, config)
        }

        await this.drawScatterLabelLayer(plotlyChart._fullLayout, plotlyChart._fullData, config, is_legend_elements_to_right_of_plotly_legend)

        plotlyChart.on('plotly_afterplot', () => {
          this.adjustTitles(plotlyChart._fullLayout, config)
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
    // With small multiples there is a nsewdrag element for each panel.
    // In that situation we return a rect that covers all the elements.
    const nsewdrags = d3.select(this.rootElement).selectAll('.nsewdrag')
    const rects = nsewdrags[0].map(el => Utils.addTopBottomLeftRight(el.getBBox()))
    const left = Math.min(...rects.map(r => r.left))
    const right = Math.min(...rects.map(r => r.right))
    const top = Math.min(...rects.map(r => r.top))
    const bottom = Math.max(...rects.map(r => r.bottom))
    return {
      left,
      right,
      top,
      bottom,
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    }
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
      const saved_annotations = this.stateObj.isStoredInState('userPositionedSmallMultipleLabels')
        ? this.stateObj.getStored('userPositionedSmallMultipleLabels')
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

  adjustTitles (plotly_chart_layout, config) {
    const title_element = d3.select(this.rootElement).select('.gtitle')
    const x = config.titleAlignment === 'Left' ? 0 : (config.subtitleAlignment === 'Center' ? 0.5 * this.width : this.width)
    const text_anchor = config.titleAlignment === 'Left' ? 'start' : (config.subtitleAlignment === 'Center' ? 'middle' : 'end')
    title_element
      .attr('x', x)
      .attr('dy', 0)
      .style('alignment-baseline', 'text-before-edge')
      .style('text-anchor', text_anchor)

    title_element
      .selectAll('tspan')
      .attr('x', x)
      .style('alignment-baseline', 'text-before-edge')
      .style('text-anchor', text_anchor)

    const subtitle_element = this.getAnnotationElement('subtitle', plotly_chart_layout)
    if (subtitle_element !== null) {
      const subtitle_x = config.subtitleAlignment === 'Left' ? 0 : (config.subtitleAlignment === 'Center' ? 0.5 * this.width : this.width)
      const subtitle_text_anchor = config.subtitleAlignment === 'Left' ? 'start' : (config.subtitleAlignment === 'Center' ? 'middle' : 'end')
      subtitle_element
        .select('.cursor-pointer')
        .attr('x', 0)
        .attr('y', 0)
        .attr('transform', `translate(${subtitle_x},${titleHeight(config)})`)
      subtitle_element
        .select('.annotation-text')
        .attr('x', 0)
        .attr('y', 0)
        .style('alignment-baseline', 'text-before-edge')
        .style('text-anchor', subtitle_text_anchor)
      subtitle_element.selectAll('.annotation-text tspan').attr('x', 0)
    }

    const footer_element = this.getAnnotationElement('footer', plotly_chart_layout)
    if (footer_element !== null) {
      const footer_height = footerHeight(config)
      footer_element
          .select('.cursor-pointer')
          .attr('x', 0)
          .attr('y', 0)
          .attr('transform', `translate(${0.5 * this.width},${this.height - footer_height})`)
      footer_element
        .select('.annotation-text')
        .attr('x', 0)
        .attr('y', 0)
        .style('alignment-baseline', 'text-before-edge')
      footer_element.selectAll('.annotation-text tspan').attr('x', 0)

      // We re-enlarge the height after it was shrunk to make way for the footer, otherwise the footer would not be shown
      d3.select(this.rootElement).selectAll('.main-svg').style('height', this.height)
    }

    const xtitle_element = this.getAnnotationElement('xtitle', plotly_chart_layout)
    if (xtitle_element !== null) {
      const chart_height = chartHeight(config, this.height)
      xtitle_element
        .select('.annotation-text-g')
        .attr('transform', `translate(${0.5 * this.width},${chart_height})`)

      xtitle_element
        .select('.cursor-pointer')
        .attr('transform', null)

      xtitle_element
        .select('.annotation-text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('alignment-baseline', 'text-after-edge')
    }

    const ytitle_element = this.getAnnotationElement('ytitle', plotly_chart_layout)
    if (ytitle_element !== null) {
      ytitle_element
        .select('.annotation-text-g')
        .attr('transform', `translate(0,${0.5 * this.height}) rotate(-90)`)

        ytitle_element
          .select('.cursor-pointer')
          .attr('transform', null)

        ytitle_element
          .select('.annotation-text')
          .attr('x', 0)
    }
  }

  getAnnotationElement (name, plotly_chart_layout) {
    const index = plotly_chart_layout.annotations.map(a => a.name).indexOf(name)
    if (index === -1) {
      return null
    }
    const annotations = d3.select(this.rootElement).selectAll('.annotation')
    return annotations[0][0] ? d3.select(annotations[0][index]) : null
  }

  // This is only used with small multiples
  // In other cases, a similar function is called via RectPlot
  drawResetButton (plotly_chart, config) {
    const svg = d3.select(this.rootElement).select('.draglayer')
    d3.select(this.rootElement).selectAll('.plot-reset-button').remove()
    const svgResetButton = svg
      .append('text')
      .attr('class', 'plot-reset-button')
      .attr('fill', '#5B9BD5')
      .attr('font-size', 10)
      .attr('font-weight', 'normal')
      .style('opacity', 0.0)
      .style('cursor', 'pointer')
      .text('Reset')
      .on('click', () => {
        this.stateObj.resetStateLegendPtsAndPositionedLabs()
        this.drawSmallMultipleLabels(plotly_chart, config)
      })
    d3.select(this.rootElement).on('mouseover', () => { if (this.stateObj.hasStateBeenAlteredByUser()) svgResetButton.style('opacity', 1) })
        .on('mouseout', () => svgResetButton.style('opacity', 0.0))

    const svgResetButtonBB = svgResetButton.node().getBBox()
    const xAxisPadding = 5
    svgResetButton.attr('x', this.width - svgResetButtonBB.width - xAxisPadding)
                  .attr('y', this.height - svgResetButtonBB.height)
  }

  marginLeftForYTitleAnnotation (config) {
    const nsew_rect = this.nsewdragRect()
    return nsew_rect.left + config.yTitleFontSize * LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE
  }

  marginBottomForXTitleAnnotation (config) {
    const nsew_rect = this.nsewdragRect()
    return chartHeight(config, this.height) - nsew_rect.bottom + config.xTitleFontSize * LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE
  }
}

module.exports = LabeledScatter
