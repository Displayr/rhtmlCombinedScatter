import Plotly from 'plotly.js-basic-dist-min'
import TooltipUtils from './utils/TooltipUtils'
import { getPanelXAxisSuffix, getPanelYAxisSuffix } from './PlotlyChartElements'

class FitLine {
    static draw (element, config) {
        const n_groups = config.fitGroup.length
        const trace_data = []
        for (let i = 0; i < n_groups; i++) {
            const group = config.fitGroup[i]
            const xaxis = 'x' + getPanelXAxisSuffix(config.fitPanel[i], config)
            const yaxis = 'y' + getPanelYAxisSuffix(config.fitPanel[i], config)
            trace_data.push({
                name: config.fitLineNames[i],
                x: config.fitX[i],
                y: config.fitY[i],
                type: 'scatter',
                mode: 'lines',
                showlegend: false,
                legendgroup: group,
                xaxis: xaxis,
                yaxis: yaxis,
                hoverlabel: {
                    font: {
                        color: TooltipUtils.blackOrWhite(config.fitLineColors[i]),
                        size: config.tooltipFontSize,
                        family: config.tooltipFontFamily,
                    }
                },
                line: {
                    dash: config.fitLineType,
                    width: config.fitLineWidth,
                    shape: 'spline',
                    color: config.fitLineColors[i]
                },
                opacity: config.fitLineOpacity
            })

            if (config.fitLowerBound && config.fitUpperBound) {
                trace_data.push({
                    name: 'Lower bound of 95% CI',
                    x: config.fitX[i],
                    y: config.fitLowerBound[i],
                    type: 'scatter',
                    mode: 'lines',
                    showlegend: false,
                    legendgroup: group,
                    xaxis: xaxis,
                    yaxis: yaxis,
                    hoverlabel: {
                        font: {
                            color: TooltipUtils.blackOrWhite(config.fitCIColors[i]),
                            size: config.tooltipFontSize,
                            family: config.tooltipFontFamily,
                        }
                    },
                    line: {
                        width: 0,
                        shape: 'spline',
                        color: config.fitCILabelColors[i]
                    }
                })
                trace_data.push({
                    name: 'Upper bound of 95% CI',
                    x: config.fitX[i],
                    y: config.fitUpperBound[i],
                    type: 'scatter',
                    mode: 'lines',
                    showlegend: false,
                    legendgroup: group,
                    xaxis: xaxis,
                    yaxis: yaxis,
                    hoverlabel: {
                        font: {
                            color: TooltipUtils.blackOrWhite(config.fitCILabelColors[i]),
                            size: config.tooltipFontSize,
                            family: config.tooltipFontFamily,
                        }
                    },
                    fill: 'tonexty',
                    fillcolor: config.fitCIColors[i],
                    line: {
                        width: 0,
                        shape: 'spline',
                        color: config.fitCILabelColors[i]
                    }
                })
            }
        }
        Plotly.addTraces(element, trace_data)
    }

    static isFitDataAvailable (config) {
        return config.fitX && config.fitY
    }
}

module.exports = FitLine
