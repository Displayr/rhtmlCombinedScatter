import _ from 'lodash'
import d3 from 'd3'
import DataTypeEnum from './utils/DataTypeEnum'
import TooltipUtils from './utils/TooltipUtils'
import Utils from './utils/Utils'

// Plotly uses 1.3 for line spacing but we allocate 0.1 more per line
// when computing the total height to add extra padding.
const LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE = 1.4
const PLOTLY_LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE = 1.3
const FOOTER_PADDING_TOP_AS_PROPORTION_OF_FONT_SIZE = 0.8
const FOOTER_PADDING_BOTTOM_AS_PROPORTION_OF_FONT_SIZE = 0.2

function createPlotlyData (config) {
    // Create tooltip text
    const indices = _.range(config.X.length)
    let tooltip_labels = (!config.labelAlt || !Array.isArray(config.labelAlt) || config.labelAlt.length === 0) ? config.label : config.labelAlt
    if (!Array.isArray(tooltip_labels)) tooltip_labels = indices.map(i => '')
    const xFormatter = getFormatter(
        config.xTooltipFormat ? config.xTooltipFormat : config.xFormat,
        config.X,
        config.xIsDateTime
    )
    const yFormatter = getFormatter(
        config.yTooltipFormat ? config.yTooltipFormat : config.yFormat,
        config.Y,
        config.yIsDateTime
    )
    let tooltips = indices.map(
        i => `${tooltip_labels[i]} (${config.xPrefix}${xFormatter(config.X[i])}${config.xSuffix}, ${config.yPrefix}${yFormatter(config.Y[i])}${config.ySuffix})`
    )

    // Check if this is a bubbleplot
    let marker_opacity = config.transparency
    if (config.normZ) {
        if (marker_opacity === null) marker_opacity = 0.4
        const z_title = config.zTitle ? config.zTitle + ': ' : ''
        tooltips = indices.map(i => `${tooltips[i]}<br>${z_title}${config.Z[i]}`)
    }
    if (marker_opacity === null) marker_opacity = 1.0

    const plot_data = []
    if (config.xLevels || config.yLevels) {
        plot_data.push(createBaseTrace(config))
    }

    const n_panels = Array.isArray(config.panelLabels) ? config.panelLabels.length : 1
    const indices_by_panel = n_panels > 1 ? _.groupBy(indices, i => config.panels[i]) : {}
    const panel_nm = Object.keys(indices_by_panel)
    config.wrappedX = isXAxisLabelsWrapping(config) ? config.X.map(x => wrapByNumberOfCharacters(x, config.xAxisLabelWrapNChar)) : config.X
    const marker_size = config.normZ === null ? config.pointRadius * 2 : config.normZ

    if (!Array.isArray(config.group)) {
        for (let p = 0; p < n_panels; p++) {
            const index = n_panels > 1 ? indices_by_panel[panel_nm[p]] : null
            plot_data.push(createScatterTraceForMarker(config, tooltips, 'Series 1', marker_size, marker_opacity, 0, p, index))
            if (hasMarkerBorder(config, index)) {
                plot_data.push(createScatterTraceForMarkerBorder(config, 'Series 1', marker_size, p, index))
            }
            if (hasMarkerAnnotations(config, index)) {
                plot_data.push(createScatterTraceForMarkerAnnotation(config, 'Series 1', marker_size, p, index))
            }
        }
    } else if (config.colorScale !== null && config.colorScale.length >= 2) {
        // Numeric colorscale
        const colorFormatter = getFormatter(config.colorScaleFormat, config.group, config.colorIsDateTime)
        tooltips = indices.map(i => `${tooltips[i]}<br>${
            Array.isArray(config.colorLevels) ? config.colorLevels[config.group[i] - 1] : colorFormatter(config.group[i])
        }`)
        for (let p = 0; p < n_panels; p++) {
            const index = n_panels > 1 ? indices_by_panel[panel_nm[p]] : null
            const trace = createScatterTraceForMarker(config, tooltips, ' ', marker_size, marker_opacity, 0, p, index)
            if (p === 0) addColorScale(trace, config)
            // We set the marker colors again since
            // createScatterTraceForMarker is not able to set multiple colors in a trace
            setTraceMarkerColorsFromConfig(trace, config, p)
            plot_data.push(trace)
            if (hasMarkerBorder(config, index)) {
                plot_data.push(createScatterTraceForMarkerBorder(config, ' ', marker_size, p, index))
            }
            if (hasMarkerAnnotations(config, index)) {
                plot_data.push(createScatterTraceForMarkerAnnotation(config, ' ', marker_size, p, index))
            }
        }
    } else {
        const indices_by_group = _.groupBy(indices, i => config.group[i])
        const group_names = _.uniq(config.group)
        const group_added = []
        for (let g = 0; g < group_names.length; g++) {
            for (let p = 0; p < n_panels; p++) {
                const p_index = n_panels > 1 ? indices_by_panel[panel_nm[p]] : indices
                const g_name = group_names[g]
                const g_add = group_added.indexOf(g_name) === -1
                const g_index = indices_by_group[g_name]
                const gp_index = _.intersection(g_index, p_index)
                const g_name_to_show = isLegendWrapping(config) ? wrapByNumberOfCharacters(g_name, config.legendWrapNChar) : g_name
                if (gp_index.length === 0) continue
                plot_data.push(createScatterTraceForMarker(config, tooltips, g_name_to_show, marker_size, marker_opacity, g, p, gp_index, g_add, true))
                if (hasMarkerBorder(config, gp_index)) {
                    plot_data.push(createScatterTraceForMarkerBorder(config, g_name_to_show, marker_size, p, gp_index))
                }
                if (hasMarkerAnnotations(config, gp_index)) {
                    plot_data.push(createScatterTraceForMarkerAnnotation(config, g_name_to_show, marker_size, p, gp_index))
                }
                if (g_add) group_added.push(g_name)
            }
        }
    }
    return plot_data
}

function createScatterTraceForMarker (config, tooltips, group_name, marker_size, marker_opacity, group_index, panel_index, data_index, showlegend = true, has_groups = false) {
    const X = data_index ? _.at(config.wrappedX, data_index) : config.wrappedX
    const Y = data_index ? _.at(config.Y, data_index) : config.Y
    const trace_marker_size = data_index && Array.isArray(marker_size) ? _.at(marker_size, data_index) : marker_size
    const indexed_tooltips = data_index ? _.at(tooltips, data_index) : tooltips
    const marker_color = config.colors[group_index % config.colors.length]
    const x_axis = getPanelXAxisSuffix(panel_index, config)
    const y_axis = getPanelYAxisSuffix(panel_index, config)
    return {
        x: X,
        y: Y,
        name: group_name,
        text: indexed_tooltips,
        hoverinfo: has_groups ? 'name+text' : 'text',
        hoverlabel: { font: { color: TooltipUtils.blackOrWhite(marker_color) } },
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: marker_color,
            size: trace_marker_size,
            sizemode: 'diameter',
            opacity: marker_opacity,
            line: {
                width: 0 // this is needed otherwise plotly draws a thin white border
            }
        },
        legendgroup: group_name,
        showlegend: showlegend,
        cliponaxis: false,
        xaxis: 'x' + x_axis,
        yaxis: 'y' + y_axis
    }
}

function createScatterTraceForMarkerBorder (config, group_name, marker_size, panel_index, data_index) {
    // We draw the marker border separately from the marker otherwise the legend symbols will also have borders
    // with a colors taken from the border colors
    const X = data_index ? _.at(config.wrappedX, data_index) : config.wrappedX
    const Y = data_index ? _.at(config.Y, data_index) : config.Y
    const trace_marker_size = data_index && Array.isArray(marker_size) ? _.at(marker_size, data_index) : marker_size
    const border_color = data_index ? _.at(config.pointBorderColor, data_index) : config.pointBorderColor
    const border_width = data_index ? _.at(config.pointBorderWidth, data_index) : config.pointBorderWidth
    const x_axis = getPanelXAxisSuffix(panel_index, config)
    const y_axis = getPanelYAxisSuffix(panel_index, config)
    return {
        x: X,
        y: Y,
        hoverinfo: 'skip',
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: 'transparent',
            size: trace_marker_size,
            sizemode: 'diameter',
            opacity: 1, // somehow this applies to the border, so it needs to be 1
            line: {
                color: border_color,
                width: border_width
            }
        },
        legendgroup: group_name,
        showlegend: false,
        cliponaxis: false,
        xaxis: 'x' + x_axis,
        yaxis: 'y' + y_axis
    }
}

function createScatterTraceForMarkerAnnotation (config, group_name, marker_size, panel_index, data_index) {
    const X = data_index ? _.at(config.wrappedX, data_index) : config.wrappedX
    const Y = data_index ? _.at(config.Y, data_index) : config.Y
    const trace_marker_size = data_index && Array.isArray(marker_size) ? _.at(marker_size, data_index) : marker_size
    const text = data_index ? _.at(config.markerAnnotations, data_index) : config.markerAnnotations
    const x_axis = getPanelXAxisSuffix(panel_index, config)
    const y_axis = getPanelYAxisSuffix(panel_index, config)
    return {
        x: X,
        y: Y,
        hoverinfo: 'skip',
        type: 'scatter',
        mode: 'markers+text',
        marker: {
            color: 'transparent',
            size: adjustMarkerSizeForAnnotation(trace_marker_size),
            sizemode: 'diameter',
            line: {
                width: 0 // this is needed otherwise plotly draws a thin white border
            }
        },
        legendgroup: group_name,
        showlegend: false,
        cliponaxis: false,
        xaxis: 'x' + x_axis,
        yaxis: 'y' + y_axis,
        text: text,
        textposition: 'middle right'
    }
}

function adjustMarkerSizeForAnnotation (marker_size) {
    const adjustment = 1.25
    return Array.isArray(marker_size) ? marker_size.map(s => s / adjustment) : marker_size / adjustment
}

function hasMarkerBorder (config, index) {
    if (!config.pointBorderColor || !config.pointBorderWidth) {
        return false
    }
    const border_color = index ? _.at(config.pointBorderColor, index) : config.pointBorderColor
    const border_width = index ? _.at(config.pointBorderWidth, index) : config.pointBorderWidth
    return border_color && border_width
}

function hasMarkerAnnotations (config, index) {
    if (!config.markerAnnotations) {
        return false
    }
    return !!(index ? _.at(config.markerAnnotations, index) : config.markerAnnotations)
}

// Creates the first trace to ensure categorical data is ordered properly
function createBaseTrace (config) {
    let x_levels = config.xLevels ? config.xLevels : []
    let y_levels = config.yLevels ? config.yLevels : []
    if (x_levels.length < y_levels.length) {
        x_levels = x_levels.concat(new Array(y_levels.length - x_levels.length).fill(config.X[0]))
    }
    if (y_levels.length < x_levels.length) {
        y_levels = y_levels.concat(new Array(x_levels.length - y_levels.length).fill(config.Y[0]))
    }
    if (config.xLevels && isXAxisLabelsWrapping(config)) {
        x_levels = x_levels.map(l => wrapByNumberOfCharacters(l, config.xAxisLabelWrapNChar))
    }

    return {
        x: x_levels,
        y: y_levels,
        type: 'scatter',
        mode: 'lines',
        hoverinfo: 'skip',
        showlegend: false,
        opacity: 0
    }
}

function addColorScale (trace, config) {
    const color_values = config.colorIsDateTime
        ? config.group.map(x => new Date(x).getTime())
        : config.group
    const color_min = Math.min(...color_values)
    const color_max = Math.max(...color_values)
    const n = config.colorScale.length
    const delta = 1.0 / (n - 1)
    let color_scale = []
    for (let i = 0; i < n; i++) {
        color_scale.push([i * delta, Utils.addOpacity(config.colorScale[i], config.transparency)])
    }
    const hover_font_color = config.colors.map(x => TooltipUtils.blackOrWhite(x))
    const colorFormatter = getFormatter(config.colorScaleFormat, color_values, config.colorIsDateTime)
    const tick_values = color_scale.map(x => x[0])
    const tick_labels = Array.isArray(config.colorLevels)
        ? config.colorLevels
        : tick_values.map(x => (colorFormatter((x * (color_max - color_min)) + color_min)))
    const color_bar = {
        tickfont: {
            family: config.legendFontFamily,
            color: config.legendFontColor,
            size: config.legendFontSize
        },
        outlinewidth: 0,
        title: {
            font: {
                family: config.colorScaleTitleFontFamily,
                color: config.colorScaleTitleFontColor,
                size: config.colorScaleTitleFontSize
            },
            text: config.colorScaleTitle
        }
    }
    if (config.colorIsDateTime || Array.isArray(config.colorLevels)) {
        color_bar.tickvals = tick_values
        color_bar.ticktext = tick_labels
        trace['marker'].cmin = 0
        trace['marker'].cmax = 1
    } else {
        color_bar.tickformat = config.colorScaleFormat
        trace['marker'].cmin = color_min
        trace['marker'].cmax = color_max
    }
    trace['marker'].color = config.colors
    trace['marker'].showscale = config.colorScaleShow
    trace['marker'].colorbar = color_bar
    trace['marker'].colorscale = color_scale
    trace['hoverlabel'].font = { color: hover_font_color }
}

function setTraceMarkerColorsFromConfig (trace, config, panel_index) {
    const group_colors = createGroupColors(config)
    const marker_colors = []
    const n = config.group.length
    for (let i = 0; i < n; i++) {
        if (!config.panels || config.panels[i] === panel_index) {
            marker_colors.push(group_colors[config.group[i]])
        }
    }
    trace['marker'].color = marker_colors
    trace['hoverlabel'].font = { color: marker_colors.map(x => TooltipUtils.blackOrWhite(x)) }
}

// Returns a function that can be applied later
function getFormatter (format, values, value_is_date) {
    if (!value_is_date && !_.isNumber(values[0])) return function (x) { return x }
    if (value_is_date) {
        if (!format) format = getDefaultDateFormat(values)
        const formatter = d3.time.format(format)
        return function (x) { return formatter(new Date(x)) }
    }
    return d3.format(checkD3Format(format, values, value_is_date))
}

function checkD3Format (format, values, value_is_date) {
    if (value_is_date && !format) return getDefaultDateFormat(values)
    if (value_is_date) return format

    // Specify precision for some formats that tend to cause trouble
    // for plotly (version 2 and above) - copied from flipChartBasics::ChartNumberFormat
    switch (format) {
        case '%': return '.0%'
        case 'e': return '~e'
        case 'f': return '~f'
        case ',f': return ',.f'
        case null: case undefined: case '': return '~f' // avoid SI prefix
        default: return format
    }
}

function getDefaultDateFormat (dates) {
    const dvals = dates.map(x => new Date(x).getTime()) // all values in milliseconds
    const dmin = Math.min(...dvals)
    const dmax = Math.max(...dvals)
    const diff = dmax - dmin
    const min_mult = 4

    // Values after new line only appear uniquely
    // https://plotly.com/python/time-series/#configuring-tick-labels
    if (diff < min_mult * 60 * 60 * 1000) return '%H:%M:%s:%L\n%b %d %Y'
    else if (diff < min_mult * 24 * 60 * 60 * 1000) return '%H:%M\n%b %d %Y'
    else if (diff < min_mult * 30 * 24 * 60 * 60 * 1000) return '%b %d\n%Y'
    else return '%b %Y'
}

function getPanelXAxisSuffix (panel, config) {
    if (panel === 0 || !Array.isArray(config.panelLabels)) return ''
    return '' + (panel + 1)
}

function getPanelYAxisSuffix (panel, config) {
    if (panel === 0 || !Array.isArray(config.panelLabels)) return ''
    return '' + (panel + 1)
}

function createPlotlyLayout (config, margin_right, height) {
    const npanel = Array.isArray(config.panelLabels) ? config.panelLabels.length : 1
    let grid = null
    if (npanel > 1) {
        grid = {}
        grid.pattern = 'independent'
        grid.rows = Math.min(config.panelNumRows, npanel)
        grid.columns = Math.ceil(npanel / grid.rows)
        grid.xgap = config.panelXGap
        grid.ygap = config.panelYGap
    }

    const x_range = getRange(config.xBoundsMinimum,
                             config.xBoundsMaximum,
                             config.xDataType,
                             config.X,
                             _.max(config.normZ),
                             config.width,
                             config.fixedAspectRatio)
    const x_axis = {
        title: (npanel > 1 && config.panelShareAxes) ? null : {
            text: config.xTitle,
            font: {
                family: config.xTitleFontFamily,
                color: config.xTitleFontColor,
                size: config.xTitleFontSize
            },
        },
        showgrid: config.grid,
        gridcolor: config.xAxisGridColor,
        griddash: config.xAxisGridDash,
        gridwidth: config.xAxisGridWidth,
        showticklabels: config.showXAxis,
        tickcolor: config.xAxisTickColor,
        ticklen: config.xAxisTickLength,
        tickfont: {
            family: config.xAxisFontFamily,
            color: config.xAxisFontColor,
            size: config.xAxisFontSize
        },
        scaleratio: config.fixedAspectRatio ? 1 : null,
        scaleanchor: config.fixedAspectRatio ? 'y' : null,
        // draw zero line separately to ensure it sit on top layer
        zeroline: false,
        automargin: true,
        autotypenumbers: 'strict',
        type: plotlyNumberType(config.xDataType),
        range: x_range,
        autorange: getAutoRange(x_range),
        autorangeoptions: getAutoRangeOptions(x_range),
        rangemode: 'normal',
        dtick: parseTickDistance(config.xBoundsUnitsMajor),
        tickprefix: config.xPrefix,
        ticksuffix: config.xSuffix,
        tickformat: checkD3Format(config.xFormat, config.X, config.xIsDateTime),
        tickangle: config.xAxisTickAngle,
        layer: 'below traces'
    }
    // Somehow plotly still draws an axis line even when the width = 0, so we only specify the line settings when width > 0
    if (config.plotBorderShow && config.plotBorderWidth > 0) {
        x_axis.linecolor = config.plotBorderColor
        x_axis.linewidth = config.plotBorderWidth
    } else if (config.xAxisLineWidth) {
        x_axis.linecolor = config.xAxisLineColor
        x_axis.linewidth = config.xAxisLineWidth
    }
    const y_range = getRange(config.yBoundsMinimum,
                             config.yBoundsMaximum,
                             config.yDataType,
                             config.Y,
                             _.max(config.normZ),
                             config.width,
                             config.fixedAspectRatio)
    const y_axis = {
        title: (npanel > 1 && config.panelShareAxes) ? null : {
            text: config.yTitle,
            font: {
                family: config.yTitleFontFamily,
                color: config.yTitleFontColor,
                size: config.yTitleFontSize
            },
        },
        showgrid: config.grid,
        gridcolor: config.yAxisGridColor,
        griddash: config.yAxisGridDash,
        gridwidth: config.yAxisGridWidth,
        showticklabels: config.showYAxis,
        tickcolor: config.yAxisTickColor,
        ticklen: config.yAxisTickLength,
        tickfont: {
            family: config.yAxisFontFamily,
            color: config.yAxisFontColor,
            size: config.yAxisFontSize
        },
        scaleratio: 1,
        scaleanchor: config.fixedAspectRatio ? 'x' : null,
        // draw zero line separately to ensure it sit on top layer
        zeroline: false,
        type: plotlyNumberType(config.yDataType),
        range: y_range,
        autorange: getAutoRange(y_range),
        autorangeoptions: getAutoRangeOptions(y_range),
        rangemode: 'normal',
        dtick: parseTickDistance(config.yBoundsUnitsMajor),
        tickprefix: config.yPrefix,
        ticksuffix: config.ySuffix,
        tickformat: checkD3Format(config.yFormat, config.Y, config.yIsDateTime),
        automargin: true,
        layer: 'below traces'
    }
    // Somehow plotly still draws an axis line even when the width = 0, so we only specify the line settings when width > 0
    if (config.plotBorderShow && config.plotBorderWidth > 0) {
        y_axis.linecolor = config.plotBorderColor
        y_axis.linewidth = config.plotBorderWidth
    } else if (config.yAxisLineWidth) {
        y_axis.linecolor = config.yAxisLineColor
        y_axis.linewidth = config.yAxisLineWidth
    }

    const plot_layout = {
        grid: grid,
        title: {
            text: config.title,
            font: {
                family: config.titleFontFamily,
                color: config.titleFontColor,
                size: config.titleFontSize
            },
            automargin: true
        },
        showlegend: getShowLegend(config),
        legend: createLegendSettings(config),
        margin: {
            t: marginTop(config),
            b: config.marginBottom !== null ? config.marginBottom : 20,
            r: config.marginRight !== null ? config.marginRight : margin_right,
            l: config.marginLeft !== null ? config.marginLeft : 20,
            autoexpand: config.marginAutoexpand
        },
        hoverlabel: {
            namelength: -1, // prevents trace name truncating
            bordercolor: 'transparent',
            font: {
                family: config.tooltipFontFamily,
                size: config.tooltipFontSize
            }
        },
        shapes: addLines(config),
        paper_bgcolor: config.backgroundColor,
        plot_bgcolor: config.plotAreaBackgroundColor,
        height: chartHeight(config, height)
    }
    addAxesToGrid(plot_layout, x_axis, y_axis, npanel, config.panelNumRows, config.panelShareAxes)
    if (config.subtitle.length > 0) {
        plot_layout.annotations = [{
            name: 'subtitle',
            text: config.subtitle,
            font: {
                family: config.subtitleFontFamily,
                color: config.subtitleFontColor,
                size: config.subtitleFontSize
            },
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 1,
            yanchor: 'bottom',
            showarrow: false,
        }]
    }
    if (config.footer.length > 0) {
        const footer_annotation = {
            name: 'footer',
            text: config.footer,
            font: {
                family: config.footerFontFamily,
                color: config.footerFontColor,
                size: config.footerFontSize
            },
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0,
            yanchor: 'top',
            showarrow: false,
        }
        if (!plot_layout.annotations) {
            plot_layout.annotations = [footer_annotation]
        } else {
            plot_layout.annotations.push(footer_annotation)
        }
    }
    return plot_layout
}

function getRange (minBounds, maxBounds, type, values, maxBubbleSize, plotWidth, fixedAspectRatio) {
    let bounds = [minBounds, maxBounds]
    // Plotly seems to find a reasonable default range for non-date values
    if (type === DataTypeEnum.date && (minBounds === null || maxBounds === null)) {
        const dates = values.map(d => d.getTime())
        dates.sort()
        let min_diff = 1000 * 60 * 60 * 24 // defaults to a day
        for (let i = 1; i < dates.length; i++) {
            min_diff = Math.min(min_diff, dates[i] - dates[i - 1])
        }
        if (minBounds === null) bounds[0] = dates[0] - min_diff
        if (maxBounds === null) bounds[1] = dates[dates.length - 1] + min_diff

        // Estimate the extra space we need to add for bubbles
        // This is approximate because we don't know plotWidth yet
        const bubble_offset = !maxBubbleSize ? 0
            : (bounds[1] - bounds[0]) * maxBubbleSize / plotWidth
        bounds[0] -= bubble_offset
        bounds[1] += bubble_offset
    } else if (fixedAspectRatio && values.every(v => v === 0) && (minBounds === null || maxBounds === null)) {
        // When values are all zero, Plotly sets a range of [-1,1],
        // which is not suitable when the aspect ratio is fixed.
        // By setting it below, the actual range is determined by the data in the other axis
        bounds = [-1e-16, 1e-16]
    }
    return bounds
}

function getAutoRange (range) {
    const has_min = range[0] !== '' && range[0] !== null
    const has_max = range[1] !== '' && range[1] !== null
    if (!has_min && !has_max) {
        return true
    } else if (has_min && has_max) {
        return false
    } else if (has_min && !has_max) {
        return 'max'
    } else { // !has_min && has_max
        return 'min'
    }
}

function getAutoRangeOptions (range) {
    const has_min = range[0] !== '' && range[0] !== null
    const has_max = range[1] !== '' && range[1] !== null
    if (has_min && !has_max) {
        return { minallowed: range[0] }
    } else if (!has_min && has_max) {
        return { maxallowed: range[1] }
    } else {
        return {}
    }
}

function getShowLegend (config) {
    if (config.legendShow === 'Automatic') {
        return !Array.isArray(config.colorScale) && Array.isArray(config.group) && config.group.length > 0
    } else if (config.legendShow === 'Show' || config.legendShow === true) {
        return !Array.isArray(config.colorScale)
    } else { // config.legendShow === 'Hide' || config.legendShow === false
        return false
    }
}

function createLegendSettings (config) {
    const settings = {
        font: {
            family: config.legendFontFamily,
            color: config.legendFontColor,
            size: config.legendFontSize
        },
        itemsizing: 'constant',
        tracegroupgap: 0,
        orientation: config.legendOrientation === 'Horizontal' ? 'h' : 'v',
        bgcolor: 'rgba(0,0,0,0)'
    }
    if (config.legendX !== null) {
        settings.x = Math.max(-2, Math.min(3, config.legendX))
        if (config.legendXAnchor) {
            settings.xanchor = config.legendXAnchor
        } else {
            if (config.legendOrientation === 'Vertical') {
                if (config.legendX <= 0) {
                    settings.xanchor = 'right'
                } else if (config.legendX >= 1) {
                    settings.xanchor = 'left'
                } else {
                    settings.xanchor = 'left'
                }
            } else {
                if (config.legendX <= 0) {
                    settings.xanchor = 'left'
                } else if (config.legendX >= 1) {
                    settings.xanchor = 'right'
                } else {
                    settings.xanchor = 'center'
                }
            }
        }
    }
    if (config.legendY !== null) {
        settings.y = Math.max(-2, Math.min(3, config.legendY))
        if (config.legendYAnchor) {
            settings.yanchor = config.legendYAnchor
        } else {
            if (config.legendOrientation === 'Horizontal') {
                if (config.legendY <= 0) {
                    settings.yanchor = 'top'
                } else if (config.legendY >= 1) {
                    settings.yanchor = 'bottom'
                } else {
                    settings.yanchor = 'top'
                }
            } else {
                if (config.legendY <= 0) {
                    settings.yanchor = 'bottom'
                } else if (config.legendY >= 1) {
                    settings.yanchor = 'top'
                } else {
                    settings.yanchor = 'center'
                }
            }
        }
    }
    if (config.legendTitle) {
        settings.title = {
            text: config.legendTitle,
            font: {
                color: config.legendTitleFontColor,
                family: config.legendTitleFontFamily,
                size: config.legendTitleFontSize
            },
            side: 'top center'
        }
    }
    return settings
}

function addLines (config) {
    const lines = []
    const npanel = Array.isArray(config.panelLabels) ? config.panelLabels.length : 1
    for (let p = 0; p < npanel; p++) {
        const x = 'x' + getPanelXAxisSuffix(p, config)
        const y = 'y' + getPanelYAxisSuffix(p, config)
        if (config.origin && (!config.xLevels || !config.xLevels.length) && config.xAxisZeroLineWidth > 0) {
            lines.push({
                type: 'line',
                layer: 'above',
                line: {
                    color: config.xAxisZeroLineColor,
                    dash: config.xAxisZeroLineDash,
                    width: config.xAxisZeroLineWidth
                },
                x0: 0,
                x1: 0,
                xref: x,
                y0: 0,
                y1: 1,
                yref: y + ' domain'
            })
        }
        if (config.origin && (!config.yLevels || !config.yLevels.length) && config.yAxisZeroLineWidth > 0) {
            lines.push({
                type: 'line',
                layer: 'above',
                line: {
                    color: config.yAxisZeroLineColor,
                    dash: config.yAxisZeroLineDash,
                    width: config.yAxisZeroLineWidth
                },
                y0: 0,
                y1: 0,
                yref: y,
                x0: 0,
                x1: 1,
                xref: x + ' domain'
            })
        }
        if (config.plotBorderShow) {
            lines.push({
                type: 'line',
                layer: 'below',
                line: { color: config.plotBorderColor, width: config.plotBorderWidth },
                y0: 1,
                y1: 1,
                yref: y + ' domain',
                x0: 0,
                x1: 1,
                xref: x + ' domain',
            })
            lines.push({
                type: 'line',
                layer: 'below',
                line: { color: config.plotBorderColor, width: config.plotBorderWidth },
                y0: 0,
                y1: 1,
                yref: y + ' domain',
                x0: 1,
                x1: 1,
                xref: x + ' domain'
            })
        }
    }
    return lines
}

function parseTickDistance (x) {
    if (x === undefined) return null
    return x
}

function plotlyNumberType (type) {
    switch (type) {
        case DataTypeEnum.date: return 'date'
        case DataTypeEnum.numeric: return 'linear'
        default: return 'category'
    }
}

function addSmallMultipleSettings (plotly_layout, config, saved_annotations) {
    const npanels = config.panelLabels.length
    const colors = Array.isArray(config.group) ? createGroupColors(config) : config.colors

    // Add marker labels
    // Do this first so the indices line up with config.group
    let j = 0
    let k = 0
    let annotations = plotly_layout.annotations ? removeSmallMultipleAnnotations(plotly_layout.annotations) : []
    const n = config.labelsMaxShown !== null ? Math.min(config.X.length, config.labelsMaxShown) : config.X.length
    if (config.label && config.showLabels) {
        for (let i = 0; i < n; i++) {
            const curr_is_saved = saved_annotations !== null &&
                k < saved_annotations.length &&
                j === saved_annotations[k].index
            const xaxis = 'x' + getPanelXAxisSuffix(config.panels[i], config)
            const yaxis = 'y' + getPanelYAxisSuffix(config.panels[i], config)
            annotations.push({
                name: 'markerlabel',
                text: combineLabelAndAnnotations(config, i).trim(),
                yanchor: 'bottom',
                arrowhead: 0,
                arrowwidth: 0.5,
                arrowcolor: colors[Array.isArray(config.group) ? config.group[i] : 0],
                ax: curr_is_saved ? saved_annotations[k].xpos : config.X[i],
                ay: curr_is_saved ? saved_annotations[k].ypos : config.Y[i],
                axref: xaxis,
                ayref: yaxis,
                visible: curr_is_saved ? saved_annotations[k].visible : true,
                clicktoshow: 'onoff',
                captureevents: false,
                font: {
                    family: config.labelsFontFamily,
                    color: config.labelsFontColor !== null
                        ? config.labelsFontColor
                        : colors[Array.isArray(config.group) ? config.group[i] : 0],
                    size: config.labelsFontSize
                },
                x: config.X[i],
                y: config.Y[i],
                xref: xaxis,
                yref: yaxis
            })
            if (curr_is_saved) k++
            j++
        }
    }

    // Add panel titles
    for (let p = 0; p < npanels; p++) {
        annotations.push({
            name: 'panellabel',
            text: config.panelLabels[p],
            x: 0.5,
            y: 1,
            font: {
                family: config.panelTitleFontFamily,
                color: config.panelTitleFontColor,
                size: config.panelTitleFontSize
            },
            showarrow: false,
            xanchor: 'center',
            yanchor: 'bottom',
            xref: 'x' + getPanelXAxisSuffix(p, config) + ' domain',
            yref: 'y' + getPanelYAxisSuffix(p, config) + ' domain'
        })
        j++
    }

    const settings = { annotations: annotations }
    if (npanels > 1 && config.panelShareAxes) {
        annotations.push({
            name: 'ytitle',
            text: config.yTitle,
            textangle: 270,
            showarrow: false,
            font: {
                family: config.yTitleFontFamily,
                color: config.yTitleFontColor,
                size: config.yTitleFontSize
            },
            xref: 'paper',
            x: 0,
            xanchor: 'right',
            yref: 'paper',
            y: 0.5,
            yanchor: 'middle',
        })
        annotations.push({
            name: 'xtitle',
            text: config.xTitle,
            showarrow: false,
            font: {
                family: config.xTitleFontFamily,
                color: config.xTitleFontColor,
                size: config.xTitleFontSize
            },
            xref: 'paper',
            x: 0.5,
            xanchor: 'center',
            yref: 'paper',
            y: 0,
            yanchor: 'top',
        })
    }
    return settings
}

function createGroupColors (config) {
    const colors = {}
    const gnames = _.uniq(config.group)
    for (let i = 0; i < gnames.length; i++) {
        colors[gnames[i]] = config.colors[i]
    }
    return colors
}

function removeSmallMultipleAnnotations (annotations) {
    return annotations.filter(a => a.name !== 'markerlabel' && a.name !== 'panellabel' && a.name !== 'ytitle' && a.name !== 'xtitle')
}

function combineLabelAndAnnotations (config, index) {
    let label = config.label[index]
    if (config.preLabelAnnotations && config.preLabelAnnotations[index]) {
      label = config.preLabelAnnotations[index] + label
    }
    if (config.postLabelAnnotations && config.postLabelAnnotations[index]) {
      label = label + config.postLabelAnnotations[index]
    }
    return label
}

function marginTop (config) {
    if (config.marginTop !== null) {
        return config.marginTop
    }
    let margin_top = 0
    if (config.title && config.title.length > 0) {
        margin_top += config.title.split('<br>').length * config.titleFontSize * LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE
    }
    if (config.subtitle && config.subtitle.length > 0) {
        margin_top += config.subtitle.split('<br>').length * config.subtitleFontSize * LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE
    }
    if (config.panelLabels && config.panelLabels.length > 0) {
        const n_columns = Math.ceil(config.panelLabels.length / config.panelNumRows)
        const max_lines = Math.max(...config.panelLabels.filter((_, i) => i < n_columns).map(l => l.split('<br>').length))
        margin_top += max_lines * config.xTitleFontSize * LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE
    } else if (margin_top > 0) { // has title or subtitle
        margin_top += 0.5 * config.titleFontSize
    }
    return Math.max(margin_top, 20)
}

function titleHeight (config) {
    if (config.title && config.title.length > 0) {
      return config.title.split('<br>').length * config.titleFontSize * LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE
    } else {
      return 0
    }
  }

function footerHeight (config) {
    if (config.footer && config.footer.length > 0) {
        const n_lines = config.footer.split('<br>').length
        return n_lines * config.footerFontSize * PLOTLY_LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE
    } else {
        return 0
    }
}

function chartHeight (config, height) {
    if (config.footer && config.footer.length > 0) {
        // We shrink the height so that elements are moved up for the footer
        return height - footerHeight(config) - config.footerFontSize * (FOOTER_PADDING_TOP_AS_PROPORTION_OF_FONT_SIZE + FOOTER_PADDING_BOTTOM_AS_PROPORTION_OF_FONT_SIZE)
    } else {
        return height
    }
}

function isLegendWrapping (config) {
    return config.legendWrap && config.legendWrapNChar
}

function isXAxisLabelsWrapping (config) {
    return config.xAxisLabelWrap && config.xAxisLabelWrapNChar
}

function wrapByNumberOfCharacters (text, n_char) {
    if (typeof text !== 'string' || n_char <= 0) {
        return text
    }
    const tokens = text
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length > 0)
    if (tokens.length === 0) {
        return ''
    }
    let current_line = []
    const lines = []
    let token
    while ((token = tokens.shift())) {
        current_line.push(token)
        const width = _.sum(current_line.map(l => l.length)) + (current_line.length - 1)
        if (width > n_char && current_line.length > 1) {
                tokens.unshift(current_line.pop())
                lines.push(`${current_line.join(' ')}`)
                current_line = []
        }
    }
    if (current_line.length > 0) {
        lines.push(`${current_line.join(' ')}`)
    }
    return lines.join('<br>')
}

function addAxesToGrid (plot_layout, x_axis, y_axis, n_panels, n_rows, share_axes) {
    n_rows = Math.min(n_rows, n_panels)
    if (share_axes && n_rows > 1) {
        // Hide x-axis of first panel if there is more than one row
        plot_layout.xaxis = hideAxis(_.clone(x_axis))
    } else {
        plot_layout.xaxis = x_axis
    }
    plot_layout.yaxis = y_axis

    const n_cols = Math.ceil(n_panels / n_rows)
    for (let p = 2; p <= n_panels; p++) {
        if (share_axes && p <= n_panels - n_cols) {
            // Hide x-axis of subsequent panels if they aren't the bottommost
            plot_layout['xaxis' + p] = hideAxis(_.clone(x_axis))
        } else {
            plot_layout['xaxis' + p] = x_axis
        }
        if (share_axes && n_cols > 1 && p % n_cols !== 1) {
            // Hide y-axis of subsequent panels if they aren't the leftmost
            plot_layout['yaxis' + p] = hideAxis(_.clone(y_axis))
        } else {
            plot_layout['yaxis' + p] = y_axis
        }
    }
}

function hideAxis (axis) {
    axis.showticklabels = false
    axis.ticklen = 0
    return axis
}

module.exports = {
    createPlotlyData,
    createPlotlyLayout,
    addSmallMultipleSettings,
    getPanelXAxisSuffix,
    getPanelYAxisSuffix,
    titleHeight,
    footerHeight,
    chartHeight,
    wrapByNumberOfCharacters,
    LINE_HEIGHT_AS_PROPORTION_OF_FONT_SIZE,
    FOOTER_PADDING_BOTTOM_AS_PROPORTION_OF_FONT_SIZE
}
