import _ from 'lodash'
import d3 from 'd3'
import DataTypeEnum from './utils/DataTypeEnum'

function createPlotlyData (config) {
    // Create tooltip text
    const indices = _.range(config.X.length)
    let tooltip_labels = (!Array.isArray(config.labelAlt) || config.labelAlt.length === 0) ? config.label : config.labelAlt
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
        i => `${tooltip_labels[i]} (${xFormatter(config.X[i])}, ${yFormatter(config.Y[i])})`
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

    if (!Array.isArray(config.group)) {
        const marker_size = config.normZ === null ? config.pointRadius * 2 : config.normZ
        plot_data.push(createScatterTrace(config.X, config.Y, tooltips, ' ', marker_size,
            config.colors[0], marker_opacity, config.pointBorderColor, config.pointBorderWidth))
    } else if (config.colorScale !== null && config.colorScale.length >= 2) {
        const colorFormatter = getFormatter(config.colorScaleFormat, config.group, config.colorIsDateTime)
        tooltips = indices.map(i => `${tooltips[i]}<br>${
            config.colorLevels ? config.colorLevels[config.group[i] - 1] : colorFormatter(config.group[i])
        }`)
        const marker_size = config.normZ === null ? config.pointRadius * 2 : config.normZ
        let trace = createScatterTrace(config.X, config.Y, tooltips, ' ', marker_size,
            config.colors[0], marker_opacity, config.pointBorderColor, config.pointBorderWidth)
        addColorScale(trace, config)
        plot_data.push(trace)
    } else {
        const indices_by_group = _.groupBy(indices, i => config.group[i])
        const group_names = Object.keys(indices_by_group)
        for (let g = 0; g < group_names.length; g++) {
            const g_name = group_names[g]
            const g_index = indices_by_group[g_name]
            const marker_size = config.normZ === null ? config.pointRadius * 2 : _.at(config.normZ, g_index)
            plot_data.push(createScatterTrace(_.at(config.X, g_index), _.at(config.Y, g_index),
                _.at(tooltips, g_index), g_name, marker_size, config.colors[g],
                marker_opacity, config.pointBorderColor, config.pointBorderWidth))
        }
    }
    return plot_data
}

function createScatterTrace (X, Y, tooltips, name, size, color, opacity, outlinecolor, outlinewidth) {
    return {
        x: X,
        y: Y,
        name: name,
        text: tooltips,
        hoverinfo: 'name+text',
        hoverlabel: { font: { color: blackOrWhite(color) } },
        type: 'scatter',
        mode: 'markers',
        marker: {
            color: color,
            size: size,
            sizemode: 'diameter',
            opacity: opacity,
            line: {
                color: outlinecolor,
                width: outlinewidth
            }
        },
        cliponaxis: false
    }
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
    const color_normalized = color_values.map(x => (x - color_min) / (color_max - color_min))
    const n = config.colorScale.length
    const delta = 1.0 / (n - 1)
    let color_scale = []
    let tmp_font_color = []
    for (let i = 0; i < n; i++) {
        color_scale.push([i * delta, config.colorScale[i]])
        tmp_font_color.push(blackOrWhite(config.colorScale[i]))
    }
    const hover_font_color = color_normalized.map(x => tmp_font_color[Math.round(x / delta)])
    const colorFormatter = getFormatter(config.colorScaleFormat, color_values[0], config.colorIsDateTime)
    const tick_values = color_scale.map(x => x[0])
    const tick_labels = config.colorLevels
        ? config.colorLevels
        : tick_values.map(x => (colorFormatter((x * (color_max - color_min)) + color_min)))
    const color_bar = {
        tickvals: tick_values,
        ticktext: tick_labels,
        tickfont: {
            family: config.legendFontFamily,
            color: config.legendFontColor,
            size: config.legendFontSize
        },
        outlinewidth: 0
    }
    trace['marker'].color = color_normalized
    trace['marker'].showscale = true
    trace['marker'].colorbar = color_bar
    trace['marker'].colorscale = color_scale
    trace['marker'].cmin = 0
    trace['marker'].cmax = 1
    trace['hoverlabel'].font = { color: hover_font_color }
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
    const dvals = dates.map(x => x.getTime()) // all values in milliseconds
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

function createPlotlyLayout (config, margin_right) {
    const plot_layout = {
        xaxis: {
            title: {
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
            linecolor: config.plotBorderShow ? config.xAxisLineColor : 'transparent',
            linewidth: config.xAxisLineWidth,
            scaleratio: 1,
            scaleanchor: config.fixedAspectRatio ? 'y' : null,
            // draw zero line separately to ensure it sit on top layer
            zeroline: false,
            automargin: true,
            autotypenumbers: 'strict',
            type: plotlyNumberType(config.xDataType),
            range: getRange(config.xBoundsMinimum, config.xBoundsMaximum, config.xDataType, config.X, _.max(config.normZ), config.width),
            rangemode: 'normal',
            dtick: parseTickDistance(config.xBoundsUnitsMajor),
            tickprefix: config.xPrefix,
            ticksuffix: config.xSuffix,
            tickformat: checkD3Format(config.xFormat, config.X, config.xIsDateTime),
            layer: 'below traces'
         },
        yaxis: {
            title: {
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
            linecolor: config.plotBorderShow ? config.yAxisLineColor : 'transparent',
            linewidth: config.yAxisLineWidth,
            scaleratio: 1,
            scaleanchor: config.fixedAspectRatio ? 'x' : null,
            // draw zero line separately to ensure it sit on top layer
            zeroline: false,
            type: plotlyNumberType(config.yDataType),
            range: getRange(config.yBoundsMinimum, config.yBoundsMaximum, config.yDataType, config.Y, _.max(config.normZ), config.width),
            rangemode: 'normal',
            dtick: parseTickDistance(config.yBoundsUnitsMajor),
            tickprefix: config.yPrefix,
            ticksuffix: config.ySuffix,
            tickformat: checkD3Format(config.yFormat, config.Y, config.yIsDateTime),
            automargin: true,
            layer: 'below traces'
        },
        title: {
            text: config.title,
            font: {
                family: config.titleFontFamily,
                color: config.titleFontColor,
                size: config.titleFontSize
            },
            xref: 'paper',
            automargin: false // setting this to true stuffs up alignment with labeledscatterlayer
        },
        showlegend: config.legendShow && config.colorScale === null && config.group !== null && config.group.length > 0,
        legend: {
            font: {
                family: config.legendFontFamily,
                color: config.legendFontColor,
                size: config.legendFontSize
            },
            itemsizing: 'constant',
            yref: 'paper',
            y: 1,
            yanchor: 'top',
        },
        margin: {
            t: config.marginTop,
            b: config.marginBottom,
            r: !isNaN(margin_right) ? margin_right : config.marginRight,
            l: config.marginLeft,
            automargin: true
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
    }
    return plot_layout
}

function getRange (minBounds, maxBounds, type, values, maxBubbleSize, plotWidth) {
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
    }
    return bounds
}

function addLines (config) {
    const lines = []
    if (config.origin && (!config.xLevels || !config.xLevels.length)) {
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
            xref: 'x',
            y0: 0,
            y1: 1,
            yref: 'paper'
        })
    }
    if (config.origin && (!config.yLevels || !config.yLevels.length)) {
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
            yref: 'y',
            x0: 0,
            x1: 1,
            xref: 'paper'
        })
    }
    if (config.plotBorderShow) {
        lines.push({
            type: 'line',
            layer: 'below',
            line: { color: config.xAxisLineColor, width: config.xAxisLineWidth },
            y0: 1,
            y1: 1,
            yref: 'paper',
            x0: 0,
            x1: 1,
            xref: 'paper'
        })
        lines.push({
            type: 'line',
            layer: 'below',
            line: { color: config.yAxisLineColor, width: config.yAxisLineWidth },
            y0: 0,
            y1: 1,
            yref: 'paper',
            x0: 1,
            x1: 1,
            xref: 'paper'
        })
    }
    return lines
}

function parseTickDistance (x) {
    if (x === undefined) return null
    return x
}

function blackOrWhite (bg_color) {
    let parts = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(bg_color)
    if (parts) {
        parts.shift()
        const [r, g, b] = parts.map((part) => parseInt(part, 16))
        const luminosity = 0.299 * r + 0.587 * g + 0.114 * b
        return luminosity > 126 ? '#2C2C2C' : '#FFFFFF'
    }
    return '#2C2C2C'
}

function plotlyNumberType (type) {
    switch (type) {
        case DataTypeEnum.date: return 'date'
        case DataTypeEnum.numeric: return 'linear'
        default: return 'category'
    }
}

module.exports = {
    createPlotlyData,
    createPlotlyLayout
}
