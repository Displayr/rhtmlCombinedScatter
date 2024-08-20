import Plotly from 'plotly.js-basic-dist-min'

async function drawQuadrants (plotly_chart, config) {
    const layout = plotly_chart.layout
    const x_range = plotly_chart._fullLayout.xaxis.range
    const y_range = plotly_chart._fullLayout.yaxis.range
    drawMidpointLines(layout, config, x_range, y_range)
    await Plotly.relayout(plotly_chart, layout)
}

function drawMidpointLines (layout, config, x_range, y_range) {
    if (config.midpointLineWidth === 0) {
        return
    }

    // The range may be reversed, hence we still need to compute the min and max
    const x_min = Math.min(...x_range)
    const x_max = Math.max(...x_range)
    const y_min = Math.min(...y_range)
    const y_max = Math.max(...y_range)

    if (config.xMidpoint >= x_min && config.xMidpoint <= x_max) {
        layout.shapes.push({
            type: 'line',
            layer: 'above',
            line: {
                color: config.midpointLineColor,
                dash: config.midpointLineDash,
                width: config.midpointLineWidth
            },
            x0: config.xMidpoint,
            x1: config.xMidpoint,
            xref: 'x',
            y0: 0,
            y1: 1,
            yref: 'y domain'
        })
    }
    if (config.yMidpoint >= y_min && config.yMidpoint <= y_max) {
        layout.shapes.push({
            type: 'line',
            layer: 'above',
            line: {
                color: config.midpointLineColor,
                dash: config.midpointLineDash,
                width: config.midpointLineWidth
            },
            x0: 0,
            x1: 1,
            xref: 'x domain',
            y0: config.yMidpoint,
            y1: config.yMidpoint,
            yref: 'y'
        })
    }
}

module.exports = {
    drawQuadrants
}
