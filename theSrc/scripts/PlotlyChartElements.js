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
    // Caller-supplied tooltip text replaces the generated text. Any extra dimensions
    // (bubble size, color scale) are still appended to it below.
    if (Array.isArray(config.tooltipText) && config.tooltipText.length === config.X.length) {
        tooltips = config.tooltipText
    }

    // Check if this is a bubbleplot
    let marker_opacity = config.transparency
    if (config.normZ) {
        if (marker_opacity === null) marker_opacity = 0.4
        const z_title = config.zTitle ? config.zTitle + ': ' : ''
        tooltips = indices.map(i => `${tooltips[i]}<br>${z_title}${config.Z[i]}`)
    }
    if (marker_opacity === null) marker_opacity = 1.0

    const plot_data = []
    const plot_legend_data = []
    const plot_annotation_data = []
    if (config.xLevels || config.yLevels) {
        plot_data.push(createBaseTrace(config))
    }

    const n_panels = Array.isArray(config.panelLabels) ? config.panelLabels.length : 1
    const indices_by_panel = n_panels > 1 ? _.groupBy(indices, i => config.panels[i]) : {}
    const panel_nm = Object.keys(indices_by_panel)
    config.wrappedX = isXAxisLabelsWrapping(config) ? config.X.map(x => wrapByNumberOfCharacters(x, config.xAxisLabelWrapNChar)) : config.X
    // pointRadius may be a per-point array, so it cannot be scaled with a plain multiply
    const marker_size = config.normZ !== null
        ? config.normZ
        : (Array.isArray(config.pointRadius)
            ? config.pointRadius.map(r => r * 2)
            : config.pointRadius * 2)

    // Whether any marker is drawn anywhere in the chart, not per series: this is a chart-wide
    // decision, not a per-series one, because it feeds the legend proxy trace (see
    // createLegendProxyTrace) rather than the real series trace - every real series trace
    // stays mode: 'lines+markers' regardless, so that plotly computes its usual autorange
    // padding for the axis (plotly decides that padding from whether a trace has markers, not
    // from their size, so a chart with radius-0 markers everywhere still needs the marker
    // block to get the padding a line chart is drawn with). marker.show defaults to FALSE for
    // a line chart (flipStandardCharts sends point.radius = rep(0, n)), so the legend proxy
    // falls back to mode: 'lines' with no marker block when nothing is drawn anywhere, rather
    // than drawing a stray dot from the bundled plotly's swatch-size clamp on a mean of 0.
    const markersDrawn = Array.isArray(marker_size) ? marker_size.some(size => size !== 0) : marker_size !== 0

    const makeSeriesTrace = config.lineShow ? createSeriesTrace : createScatterTraceForMarker

    if (!Array.isArray(config.group)) {
        for (let p = 0; p < n_panels; p++) {
            const index = n_panels > 1 ? indices_by_panel[panel_nm[p]] : null
            // Only the first panel takes the legend entry, otherwise every panel repeats it
            const show_in_legend = p === 0
            plot_data.push(makeSeriesTrace(config, tooltips, 'Series 1', marker_size, marker_opacity, 0, p, index, show_in_legend, false))
            if (config.lineShow) {
                plot_legend_data.push(createLegendProxyTrace(config, 'Series 1', 0, index, marker_size, show_in_legend, markersDrawn))
            }
            if (hasMarkerBorder(config, index)) {
                plot_annotation_data.push(createScatterTraceForMarkerBorder(config, 'Series 1', marker_size, p, index))
            }
            if (hasMarkerAnnotations(config, index)) {
                plot_annotation_data.push(createScatterTraceForMarkerAnnotation(config, 'Series 1', marker_size, p, index))
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
                plot_annotation_data.push(createScatterTraceForMarkerBorder(config, ' ', marker_size, p, index))
            }
            if (hasMarkerAnnotations(config, index)) {
                plot_annotation_data.push(createScatterTraceForMarkerAnnotation(config, ' ', marker_size, p, index))
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
                plot_data.push(makeSeriesTrace(config, tooltips, g_name_to_show, marker_size, marker_opacity, g, p, gp_index, g_add, true))
                if (config.lineShow) {
                    plot_legend_data.push(createLegendProxyTrace(config, g_name_to_show, g, gp_index, marker_size, g_add, markersDrawn))
                }
                if (hasMarkerBorder(config, gp_index)) {
                    plot_annotation_data.push(createScatterTraceForMarkerBorder(config, g_name_to_show, marker_size, p, gp_index))
                }
                if (hasMarkerAnnotations(config, gp_index)) {
                    plot_annotation_data.push(createScatterTraceForMarkerAnnotation(config, g_name_to_show, marker_size, p, gp_index))
                }
                if (g_add) group_added.push(g_name)
            }
        }
    }
    // Legend proxy traces carry no data (x: [null], y: [null]), so plotly's translatePoint
    // fails for them and the .point element it provisionally appends is removed before it
    // ever renders - confirmed against the bundled plotly's scatter point join, which calls
    // translatePoint per point and does `n.remove()` on failure. They are ordered here purely
    // to stay clear of the real marker traces regardless, and the annotation traces are added
    // last so that they don't interfere with the order of the marker points in the DOM, which
    // is relied upon by code that handles marker label toggling.
    return [...plot_data, ...plot_legend_data, ...plot_annotation_data]
}

// plotly takes a marker symbol per point, so a per-point array is sliced for this group the
// way the radius is. Left undefined when not supplied, so plotly keeps its own default.
function symbolForTrace (config, data_index) {
    if (config.pointSymbol === null || config.pointSymbol === undefined) return undefined
    return data_index && Array.isArray(config.pointSymbol)
        ? _.at(config.pointSymbol, data_index)
        : config.pointSymbol
}

function createScatterTraceForMarker (config, tooltips, group_name, marker_size, marker_opacity, group_index, panel_index, data_index, showlegend = true, has_groups = false) {
    const X = data_index ? _.at(config.wrappedX, data_index) : config.wrappedX
    const Y = data_index ? _.at(config.Y, data_index) : config.Y
    const trace_marker_size = data_index && Array.isArray(marker_size) ? _.at(marker_size, data_index) : marker_size
    const trace_marker_symbol = symbolForTrace(config, data_index)
    const indexed_tooltips = data_index ? _.at(tooltips, data_index) : tooltips
    const marker_color = config.colors[group_index % config.colors.length]
    const x_axis = getPanelXAxisSuffix(panel_index, config)
    const y_axis = getPanelYAxisSuffix(panel_index, config)
    // When joining lines are drawn, createSeriesTrace builds on this trace: it adds the
    // joining line on top and replaces the hoverlabel below with one derived from the line
    // colour instead of the marker's. The legend entry and tooltip set here are unchanged.
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
            symbol: trace_marker_symbol,
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

// The plotly line for a group. Per-group styling is recycled by group index in the same way
// as config.colors.
function lineForGroup (config, group_index) {
    const line = {
        color: config.lineColors[group_index % config.lineColors.length],
        width: config.lineThickness[group_index % config.lineThickness.length],
        dash: config.lineType[group_index % config.lineType.length],
        shape: config.lineShape
    }
    // plotly only honours smoothing for splines, and warns if it is set otherwise
    if (config.lineShape === 'spline') line.smoothing = config.lineSmoothing
    return line
}

// A series whose joining line is drawn is one trace, not two: plotly draws a trace's line
// beneath its own markers, and the tooltip stays keyed off this one trace. The tooltip font
// colour stays keyed off the line colour, which is what owned the tooltip while these were
// separate traces.
// This trace always stays mode: 'lines+markers' with its marker block intact, whatever the
// radius - even a radius of 0 - because plotly decides its usual autorange padding from
// whether a trace *has* markers, not from their size or visibility. Dropping the marker
// block for a markerless chart (the previous approach) saved the legend a stray dot, but it
// also lost that padding, since plotly no longer saw a trace with markers at all: labels at
// the extreme points then overlapped the axis. The legend entry is carried by a separate,
// data-free proxy trace instead (see createLegendProxyTrace), so this trace never shows in
// the legend while lineShow is on.
function createSeriesTrace (config, tooltips, group_name, marker_size, marker_opacity, group_index, panel_index, data_index, showlegend = true, has_groups = false) {
    const trace = createScatterTraceForMarker(config, tooltips, group_name, marker_size,
        marker_opacity, group_index, panel_index, data_index, showlegend, has_groups)
    trace.line = lineForGroup(config, group_index)
    trace.connectgaps = false
    trace.hoverlabel = { font: { color: TooltipUtils.blackOrWhite(trace.line.color) } }
    trace.mode = 'lines+markers'
    trace.showlegend = false
    return trace
}

// The legend swatch cannot show a value that varies by point, since the whole series is one
// legend entry: it takes the series' first point, the same slice createScatterTraceForMarker
// would draw first for this group.
function representativeMarkerSize (marker_size, data_index) {
    if (!Array.isArray(marker_size)) return marker_size
    return marker_size[Array.isArray(data_index) ? data_index[0] : 0]
}

// A data-free trace (x: [null], y: [null]) that exists only to carry a line-chart series'
// legend entry, styled explicitly for the swatch rather than inherited from a real trace's
// data. Splitting the legend out this way is what lets createSeriesTrace always stay mode:
// 'lines+markers' (see its comment) without also drawing a stray legend dot when nothing is
// actually drawn: this proxy falls back to a plain 'lines' swatch in that case instead.
// Having no data means plotly's translatePoint fails for it, so it renders no .point element
// of its own in the plot area - see the comment on createPlotlyData's return.
function createLegendProxyTrace (config, group_name, group_index, data_index, marker_size, showlegend, markers_drawn) {
    const trace = {
        x: [null],
        y: [null],
        name: group_name,
        hoverinfo: 'skip',
        type: 'scatter',
        line: lineForGroup(config, group_index),
        legendgroup: group_name,
        showlegend: showlegend
    }
    if (markers_drawn) {
        const symbol = symbolForTrace(config, data_index)
        trace.mode = 'lines+markers'
        trace.marker = {
            color: config.colors[group_index % config.colors.length],
            size: representativeMarkerSize(marker_size, data_index),
            symbol: Array.isArray(symbol) ? symbol[0] : symbol,
            sizemode: 'diameter'
        }
    } else {
        trace.mode = 'lines'
    }
    return trace
}

function createScatterTraceForMarkerBorder (config, group_name, marker_size, panel_index, data_index) {
    // We draw the marker border separately from the marker otherwise the legend symbols will also have borders
    // with a colors taken from the border colors
    const X = data_index ? _.at(config.wrappedX, data_index) : config.wrappedX
    const Y = data_index ? _.at(config.Y, data_index) : config.Y
    const trace_marker_size = data_index && Array.isArray(marker_size) ? _.at(marker_size, data_index) : marker_size
    const trace_marker_symbol = symbolForTrace(config, data_index)
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
            symbol: trace_marker_symbol,
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
    return Array.isArray(border_color) ? border_color.some((color, i) => !!color && !!border_width[i]) : border_color && border_width
}

function hasMarkerAnnotations (config, index) {
    if (!config.markerAnnotations) {
        return false
    }
    const marker_annotations = index ? _.at(config.markerAnnotations, index) : config.markerAnnotations
    return marker_annotations.some(annotations => !!annotations)
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
            text: isLegendTitleWrapping(config)
                ? wrapByNumberOfCharacters(config.colorScaleTitle, config.legendTitleWrapNChar)
                : config.colorScaleTitle
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
    // A series may begin with a gap, so the type is decided from the first value that is
    // there. Reading values[0] would fall back to returning the value unformatted, and
    // the requested hover format would be lost for the whole series.
    const present = _.reject(values, v => Utils.isMissingValue(v))
    if (!value_is_date && !_.isNumber(present[0])) return function (x) { return x }
    if (value_is_date) {
        if (!format) format = getDefaultDateFormat(present)
        const formatter = d3.time.format(format)
        return function (x) { return Utils.isMissingValue(x) ? '' : formatter(new Date(x)) }
    }
    const formatter = d3.format(checkD3Format(format, present, value_is_date))
    return function (x) { return Utils.isMissingValue(x) ? '' : formatter(x) }
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
        case null: case undefined: return '' // this format yields SI but without "m" (thousandths).
        default: return format
    }
}

function getDefaultDateFormat (dates) {
    // all values in milliseconds, gaps left out so they do not read as the epoch
    const dvals = _.reject(dates, d => Utils.isMissingValue(d)).map(x => new Date(x).getTime())
    const dmin = Math.min(...dvals)
    const dmax = Math.max(...dvals)
    const diff = dmax - dmin
    const min_mult = 5

    // Values after new line only appear uniquely
    // https://plotly.com/python/time-series/#configuring-tick-labels
    // The cutoffs are set to approximately where plotly transitions the tick formats
    if (diff < min_mult * 60 * 1000) return '%H:%M:%S.%L\n%b %d %Y'
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

// Giving plotly a title with empty text is not the same as giving it no title: it
// reserves the height of the title font for one it never draws, which is a margin that
// nothing accounts for. Only line charts skip it, so that they can reserve the same
// margins as the plotly line chart they stand in for. Applying it to every chart would
// be the real fix, but it would move the plot area of every existing scatter plot.
function omitEmptyAxisTitle (config, title) {
    return placeTextInMargins(config) && !title
}

// Where the title, subtitle and footer go. By default this widget lays them out itself,
// pinning the title to the top of the chart and hanging the subtitle beneath it, with the
// footer below a shortened plot. A line chart instead places them the way the plotly line
// chart it stands in for does: inside the margins that have been reserved for them, with
// the title centred vertically in the top margin. Turning automatic data label placement
// on would otherwise move all three.
function placeTextInMargins (config) {
    return config.lineShow
}

// The alignment arguments are documented in title case, but flipStandardCharts passes its
// own lower case spellings straight through, so they are read case insensitively. Returns
// one of the four documented values.
function normaliseAlignment (alignment) {
    switch (String(alignment).toLowerCase()) {
        case 'left': return 'Left'
        case 'right': return 'Right'
        case 'center': return 'Center'
        default: return 'Center of plot area'
    }
}

// Matches the x position and anchor that flipStandardCharts uses for its own title,
// subtitle and footer annotations, so that they land in the same place under either
// renderer.
function titleAlignmentToX (alignment) {
    switch (normaliseAlignment(alignment)) {
        case 'Left': return { x: 0, xanchor: 'left', align: 'left' }
        case 'Right': return { x: 1, xanchor: 'right', align: 'right' }
        default: return { x: 0.5, xanchor: 'center', align: 'center' }
    }
}

// The title annotation as flipStandardCharts positions it: anchored to the top of the
// plot area and shifted up by half the top margin, so that it sits in the middle of it.
function createTitleAnnotation (config) {
    const a = titleAlignmentToX(config.titleAlignment)
    return {
        name: 'title',
        text: config.title,
        font: {
            family: config.titleFontFamily,
            color: config.titleFontColor,
            size: config.titleFontSize
        },
        align: a.align,
        xref: 'paper',
        yref: 'paper',
        x: a.x,
        xanchor: a.xanchor,
        y: 1,
        yanchor: 'middle',
        yshift: marginTop(config) * 0.5,
        showarrow: false,
    }
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
        title: (npanel > 1 && config.panelShareAxes) || omitEmptyAxisTitle(config, config.xTitle) ? null : {
            text: config.xTitle,
            font: {
                family: config.xTitleFontFamily,
                color: config.xTitleFontColor,
                size: config.xTitleFontSize
            },
        },
        showgrid: config.grid && config.xAxisGridWidth > 0,
        gridcolor: config.xAxisGridColor,
        griddash: config.xAxisGridDash,
        gridwidth: config.xAxisGridWidth,
        showticklabels: config.showXAxis && config.xAxisFontSize > 0,
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
        rangemode: config.xAxisRangeMode,
        dtick: parseTickDistance(config.xBoundsUnitsMajor),
        tickprefix: config.xPrefix,
        ticksuffix: config.xSuffix,
        tickformat: checkD3Format(config.xFormat, config.X, config.xIsDateTime),
        tickangle: config.xAxisTickAngle,
        mirror: config.plotBorderShow,
        layer: 'below traces',
        exponentformat: 'SI'
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
        title: (npanel > 1 && config.panelShareAxes) || omitEmptyAxisTitle(config, config.yTitle) ? null : {
            text: config.yTitle,
            font: {
                family: config.yTitleFontFamily,
                color: config.yTitleFontColor,
                size: config.yTitleFontSize
            },
        },
        showgrid: config.grid && config.yAxisGridWidth > 0,
        gridcolor: config.yAxisGridColor,
        griddash: config.yAxisGridDash,
        gridwidth: config.yAxisGridWidth,
        showticklabels: config.showYAxis && config.yAxisFontSize > 0,
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
        rangemode: config.yAxisRangeMode,
        tickangle: config.yAxisTickAngle,
        dtick: parseTickDistance(config.yBoundsUnitsMajor),
        tickprefix: config.yPrefix,
        ticksuffix: config.ySuffix,
        tickformat: checkD3Format(config.yFormat, config.Y, config.yIsDateTime),
        automargin: true,
        mirror: config.plotBorderShow,
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
        title: placeTextInMargins(config) ? { text: '' } : {
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
    // Only set when asked for: plotly reads nticks as a hint, and giving it a null would
    // override the axis choosing a tick count for itself
    if (config.xAxisTickMaxnum !== null) x_axis.nticks = config.xAxisTickMaxnum
    if (config.yAxisTickMaxnum !== null) y_axis.nticks = config.yAxisTickMaxnum

    // Only set when hover is turned off, so that a chart which shows a tooltip keeps
    // whatever plotly would choose for it
    if (!config.tooltipShow) plot_layout.hovermode = false

    addAxesToGrid(plot_layout, x_axis, y_axis, npanel, config.panelNumRows, config.panelShareAxes)
    if (placeTextInMargins(config) && config.title.length > 0) {
        plot_layout.annotations = [createTitleAnnotation(config)]
    }
    if (config.subtitle.length > 0) {
        const sa = titleAlignmentToX(config.subtitleAlignment)
        const subtitle_annotation = {
            name: 'subtitle',
            text: config.subtitle,
            font: {
                family: config.subtitleFontFamily,
                color: config.subtitleFontColor,
                size: config.subtitleFontSize
            },
            align: sa.align,
            xref: 'paper',
            yref: 'paper',
            x: sa.x,
            xanchor: sa.xanchor,
            y: 1,
            yanchor: 'bottom',
            showarrow: false,
        }
        if (!plot_layout.annotations) {
            plot_layout.annotations = [subtitle_annotation]
        } else {
            plot_layout.annotations.push(subtitle_annotation)
        }
    }
    if (config.footer.length > 0) {
        const fa = titleAlignmentToX(config.footerAlignment)
        const footer_annotation = {
            name: 'footer',
            text: config.footer,
            font: {
                family: config.footerFontFamily,
                color: config.footerFontColor,
                size: config.footerFontSize
            },
            align: fa.align,
            xref: 'paper',
            yref: 'paper',
            x: fa.x,
            xanchor: fa.xanchor,
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
    // Plotly seems to find a reasonable default range for non-date values
    if (type === DataTypeEnum.date) {
        if (minBounds !== null && typeof minBounds === 'string' && minBounds) {
            minBounds = Utils.parseDateAsUtc(minBounds)
        }
        if (maxBounds !== null && typeof maxBounds === 'string' && maxBounds) {
            maxBounds = Utils.parseDateAsUtc(maxBounds)
        }
        const bounds = [minBounds, maxBounds]
        const has_min_bounds = minBounds !== null && minBounds
        const has_max_bounds = maxBounds !== null && maxBounds
        if (!has_min_bounds || !has_max_bounds) {
            const dates = _.reject(values, d => Utils.isMissingValue(d)).map(d => d.getTime())
            dates.sort()
            let min_diff = 1000 * 60 * 60 * 24 // defaults to a day
            for (let i = 1; i < dates.length; i++) {
                min_diff = Math.min(min_diff, dates[i] - dates[i - 1])
            }
            if (!has_min_bounds) bounds[0] = dates[0] - min_diff
            if (!has_max_bounds) bounds[1] = dates[dates.length - 1] + min_diff
            // Estimate the extra space we need to add for bubbles
            // This is approximate because we don't know plotWidth yet
            const bubble_offset = !maxBubbleSize ? 0
                : (bounds[1] - bounds[0]) * maxBubbleSize / plotWidth
            if (!has_min_bounds) {
                bounds[0] -= bubble_offset
            }
            if (!has_max_bounds) {
                bounds[1] += bubble_offset
            }
        }
        return bounds
    } else if (fixedAspectRatio && values.every(v => v === 0) && (minBounds === null || maxBounds === null)) {
        // When values are all zero, Plotly sets a range of [-1,1],
        // which is not suitable when the aspect ratio is fixed.
        // By setting it below, the actual range is determined by the data in the other axis
        return [-1e-16, 1e-16]
    } else {
        return [minBounds, maxBounds]
    }
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
        tracegroupgap: 0,
        orientation: config.legendOrientation === 'Horizontal' ? 'h' : 'v',
        bgcolor: 'rgba(0,0,0,0)'
    }
    // itemsizing: 'constant' exists so that bubble charts do not show legend markers of
    // wildly different sizes. Line charts are the case where the legend must mirror the
    // series instead: a chart specifying marker sizes 1, 2, 3, 4 across four series should
    // show four different legend markers, with the swatch line matching the series line
    // width rather than plotly's substituted 5px. So it is set for every chart except one
    // that draws joining lines; plotly's own default ('trace') applies when omitted.
    if (!config.lineShow) {
        settings.itemsizing = 'constant'
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
            text: isLegendTitleWrapping(config) ? wrapByNumberOfCharacters(config.legendTitle, config.legendTitleWrapNChar) : config.legendTitle,
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
    if (config.panelTitleFontSize > 0) {
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
    // The footer sits inside the bottom margin that has been reserved for it, so there is
    // no room to make for it below the plot
    if (placeTextInMargins(config)) return height
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

function isLegendTitleWrapping (config) {
    return config.legendTitleWrap && config.legendTitleWrapNChar
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
        if (share_axes) {
            plot_layout['xaxis' + p].matches = 'x'
            plot_layout['yaxis' + p].matches = 'y'
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
    placeTextInMargins,
    normaliseAlignment,
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
