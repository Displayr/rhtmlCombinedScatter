import _ from 'lodash'
import LegendUtils from './utils/LegendUtils'

function createPlotlyData (data, config) {
    let normZ
    let marker_opacity = config.transparency
    if (Array.isArray(data.Z)) {
        const maxZ = _.max(data.Z)
        normZ = LegendUtils.normalizeZValues(data.Z, maxZ).map(z => 2 * LegendUtils.normalizedZtoRadius(config.pointRadius, z))
        if (marker_opacity === null) marker_opacity = 0.4
    }
    if (marker_opacity === null) marker_opacity = 1.0
    const plot_data = []
    if (!Array.isArray(data.group)) {
        const marker_size = data.Z === undefined ? config.pointRadius * 2 : normZ
        plot_data.push({
            x: data.X,
            y: data.Y,
            text: data.label,
            type: 'scatter',
            mode: 'markers',
            marker: {
                color: config.colors[0],
                size: marker_size,
                sizemode: 'diameter',
                opacity: marker_opacity,
                outlinewidth: 0
            },
            cliponaxis: 'false',
        })
    } else {
        const indices_by_group = _.groupBy(_.range(data.group.length), i => data.group[i])
        const group_names = Object.keys(indices_by_group)
        for (let g = 0; g < group_names.length; g++) {
            const gname = group_names[g]
            const marker_size = normZ === undefined
                ? config.pointRadius * 2
                : _.at(normZ, indices_by_group[gname])
            plot_data.push({
                x: _.at(data.X, indices_by_group[gname]),
                y: _.at(data.Y, indices_by_group[gname]),
                text: _.at(data.label, indices_by_group[gname]),
                name: gname,
                type: 'scatter',
                mode: 'markers',
                marker: {
                    color: config.colors[g % config.colors.length],
                    size: marker_size,
                    sizemode: 'diameter',
                    opacity: marker_opacity,
                    line: { width: 0 },
                },
                cliponaxis: 'false',
            })
        }
    }
    return plot_data
}

function createPlotlyLayout (config) {
    const margin_lines = []
    if (config.origin) {
        margin_lines.push({
            type: 'line',
            layer: 'above',
            line: { color: '#000', width: 1, dash: 'dot' },
            x0: 0,
            x1: 0,
            xref: 'x',
            y0: 0,
            y1: 1,
            yref: 'paper'
        })
        margin_lines.push({
            type: 'line',
            layer: 'above',
            line: { color: '#000', width: 1, dash: 'dot' },
            y0: 0,
            y1: 0,
            yref: 'y',
            x0: 0,
            x1: 1,
            xref: 'paper'
        })
    }
    if (config.plotBorderShow) {
        margin_lines.push({
            type: 'line',
            layer: 'below',
            line: { color: config.plotBorderColor, width: config.plotBorderWidth },
            y0: 1,
            y1: 1,
            yref: 'paper',
            x0: 0,
            x1: 1,
            xref: 'paper'
        })
        margin_lines.push({
            type: 'line',
            layer: 'below',
            line: { color: config.plotBorderColor, width: config.plotBorderWidth },
            y0: 0,
            y1: 1,
            yref: 'paper',
            x0: 1,
            x1: 1,
            xref: 'paper'
        })
    }
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
            color: '#444',
            showgrid: config.grid,
            gridcolor: '#eee',
            tickcolor: '#eee',
            ticklen: config.showXAxis ? 5 : 0,
            tickfont: {
                family: config.xAxisFontFamily,
                color: config.xAxisFontColor,
                size: config.showXAxis ? config.xAxisFontSize : 0
            },
            linecolor: config.plotBorderShow ? config.plotBorderColor : 'transparent',
            linewidth: 1,
            scaleratio: 1,
            scaleanchor: config.fixedAspectRatio ? 'y' : null,
            rangemode: config.originAlign ? 'tozero' : 'normal',
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
            color: '#444',
            showgrid: config.grid,
            gridcolor: '#eee',
            tickcolor: '#eee',
            ticklen: config.showYAxis ? 5 : 0,
            tickfont: {
                family: config.yAxisFontFamily,
                color: config.yAxisFontColor,
                size: config.showYAxis ? config.yAxisFontSize : 0
            },
            linecolor: config.plotBorderShow ? config.plotBorderColor : 'transparent',
            linewidth: 1,
            scaleratio: 1,
            scaleanchor: config.fixedAspectRatio ? 'x' : null,
            rangemode: config.originAlign ? 'tozero' : 'normal',
            // draw zero line separately to ensure it sit on top layer
            zeroline: false,
            range: [config.yBoundsMinimum, config.yBoundsMaximum],
            dtick: parseTickDistance(config.yBoundsUnitsMajor),
            tickprefix: config.yPrefix,
            ticksuffix: config.ySuffix,
            automargin: true,
            mirror: 'true',
            layer: 'below traces'
        },
        title: {
            text: config.title,
            font: {
                family: config.titleFontFamily,
                size: config.titleFontSize,
                color: config.titleFontColor
            },
            automargin: true
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
        margin: { // may be overriden because automargin is true, but this makes defaults smaller
            t: 20,
            b: 20,
            r: 60,
            l: 80
        },
        hoverlabel: {
            namelength: -1, // prevents trace name truncating
            // bordercolor: "transparent",
            /* font: {
                family: config.tooltipFontFamily,
                //size: config.tooltipFontSize
            } */
        },
        shapes: margin_lines
    }
    return plot_layout
}

function parseTickDistance (x) {
    if (x === undefined) return null
    return x
}

module.exports = {
    createPlotlyData,
    createPlotlyLayout
}
