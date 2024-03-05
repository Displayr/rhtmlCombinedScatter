import _ from 'lodash'
import LegendUtils from './utils/LegendUtils'

function createPlotlyData (data, config) {
    // Check for empty labels
    const indices = _.range(data.X.length)
    let tooltip_labels = data.labelAlt === undefined ? data.label : data.labelAlt
    if (tooltip_labels === undefined) tooltip_labels = indices.map(i => '')
    let tooltips = indices.map(i => `${tooltip_labels[i]} (${data.X[i]}, ${data.Y[i]})`)

    // Check if this is a bubbleplot
    let normZ
    let marker_opacity = config.transparency
    if (Array.isArray(data.Z)) {
        const maxZ = _.max(data.Z)
        normZ = LegendUtils.normalizeZValues(data.Z, maxZ)
            .map(z => 2 * LegendUtils.normalizedZtoRadius(config.pointRadius, z))
        if (marker_opacity === null) marker_opacity = 0.4
        const z_title = config.zTitle.length === 0 ? '' : config.zTitle + ': '
        tooltips = indices.map(i => `${tooltips[i]}<br>${z_title}${data.Z[i]}`)
    }
    if (marker_opacity === null) marker_opacity = 1.0

    const plot_data = []
    if (!Array.isArray(data.group)) {
        const marker_size = data.Z === undefined ? config.pointRadius * 2 : normZ
        plot_data.push(createScatterTrace(data.X, data.Y, tooltips, ' ', marker_size,
            config.colors[0], marker_opacity, config.pointBorderColor, config.pointBorderWidth))
    } else {
        const indices_by_group = _.groupBy(indices, i => data.group[i])
        const group_names = Object.keys(indices_by_group)
        for (let g = 0; g < group_names.length; g++) {
            const g_name = group_names[g]
            const g_index = indices_by_group[g_name]
            const marker_size = normZ === undefined ? config.pointRadius * 2 : _.at(normZ, g_index)
            plot_data.push(createScatterTrace(_.at(data.X, g_index), _.at(data.Y, g_index),
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
            outlinecolor: outlinecolor,
            outlinewidth: outlinewidth
        },
        cliponaxis: false
    }
}

function createPlotlyLayout (config) {
    const plot_layout = {
        xaxis: {
            title: {
                text: config.xTitle,
                font: {
                    family: config.xTitleFontFamily,
                    color: config.xTitleFontColor,
                    size: config.xTitleFontSize
                }
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
            range: [config.xBoundsMinimum, config.xBoundsMaximum],
            dtick: parseTickDistance(config.xBoundsUnitsMajor),
            tickprefix: config.xPrefix,
            ticksuffix: config.xSuffix,
            layer: 'below traces'
         },
        yaxis: {
            title: {
                text: config.yTitle,
                font: {
                    family: config.yTitleFontFamily,
                    color: config.yTitleFontColor,
                    size: config.yTitleFontSize
                }
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
            range: [config.yBoundsMinimum, config.yBoundsMaximum],
            dtick: parseTickDistance(config.yBoundsUnitsMajor),
            tickprefix: config.yPrefix,
            ticksuffix: config.ySuffix,
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
        showlegend: config.legendShow,
        legend: {
            font: {
                family: config.legendFontFamily,
                color: config.legendFontColor,
                size: config.legendFontSize
            },
            itemsizing: 'constant',
            yref: 'paper',
            y: 0.5,
            yanchor: 'middle',
        },
        margin: {
            t: config.marginTop,
            b: config.marginBottom,
            r: config.marginRight,
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

function addLines (config) {
    const lines = []
    if (config.origin) {
        lines.push({
            type: 'line',
            layer: 'above',
            line: {
                color: config.xAxisZeroLineColor,
                dash: config.xAxisZeroLineType,
                width: config.xAxisZeroLineWidth
            },
            x0: 0,
            x1: 0,
            xref: 'x',
            y0: 0,
            y1: 1,
            yref: 'paper'
        })
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

module.exports = {
    createPlotlyData,
    createPlotlyLayout
}
