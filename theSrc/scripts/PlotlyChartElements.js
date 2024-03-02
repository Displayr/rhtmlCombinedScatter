import _ from 'lodash'
import LegendUtils from './utils/LegendUtils'

function createPlotlyData (data, config) {
    let normZ
    let marker_opacity = config.transparency
    if (data.Z !== undefined) {
        const maxZ = _.max(data.Z)
        normZ = LegendUtils.normalizeZValues(data.Z, maxZ).map(z => 2 * LegendUtils.normalizedZtoRadius(config.pointRadius, z))
        if (marker_opacity === null) marker_opacity = 0.4
    }
    if (marker_opacity === null) marker_opacity = 1.0
    const plot_data = []
    if (data.group === null || !Array.isArray(data.group)) {
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
                opacity: marker_opacity
            },
            cliponaxis: 'false',
        })
    } else {
        const indices_by_group = _.groupBy(_.range(data.group.length), i => data.group[i])
        const group_names = Object.keys(indices_by_group)
        for (let g = 0; g < group_names.length; g++) {
            const gname = group_names[g]
            const marker_size = data.Z === undefined 
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
                    opacity: marker_opacity
                },
                cliponaxis: 'false',
            })
        }
    }
    return plot_data
}

function createPlotlyLayout (config) {
    const plot_layout = {
        xaxis: {
            visible: config.showXAxis,
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
            tickcolor: '#444',
            ticklen: config.showXAxis ? 5 : 0,
            tickfont: {
                family: config.xAxisFontFamily,
                color: config.xAxisFontColor,
                size: config.xAxisFontSize
            },
            linecolor: config.plotBorderShow ? config.plotBorderColor : 'transparent',
            linewidth: 1,
            scaleratio: 1,
            scaleanchor: config.fixedAspectRatio ? 'y' : null,
            rangemode: config.originAlign ? 'tozero' : 'normal',
            // draw zero line separately to ensure it sit on top layer
            automargin: true,
            range: [config.xBoundsMinimum, config.xBoundsMaximum],
            layer: 'below traces'
         },
        yaxis: {
            visible: config.showYAxis,
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
            tickcolor: '#444',
            ticklen: config.showYAxis ? 5 : 0,
            tickfont: {
                family: config.yAxisFontFamily,
                color: config.yAxisFontColor,
                size: config.yAxisFontSize
            },
            linecolor: config.plotBorderShow ? config.plotBorderColor : 'transparent',
            linewidth: 1,
            scaleratio: 1,
            scaleanchor: config.fixedAspectRatio ? 'x' : null,
            rangemode: config.originAlign ? 'tozero' : 'normal',
            // draw zero line separately to ensure it sit on top layer
            range: [config.yBoundsMinimum, config.yBoundsMaximum],
            automargin: true,
            layer: 'below traces'
        },
        title: {
            text: config.title,
            font: {
                family: config.titleFontFamily,
                size: config.titleFontSize,
                color: config.titleFontColor
            }
        },
        showlegend: config.legendShow,
        legend: {
            font: {
                family: config.legendFontFamily,
                color: config.legendFontColor,
                size: config.legendFontSize
            },
            itemsizing: 'constant'
        }
    }
    return plot_layout
}

module.exports = {
    createPlotlyData,
    createPlotlyLayout
}
