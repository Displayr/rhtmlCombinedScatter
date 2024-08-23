import Plotly from 'plotly.js-basic-dist-min'

async function drawQuadrants (plotly_chart, config) {
    const layout = plotly_chart.layout
    const x_range = plotly_chart._fullLayout.xaxis.range
    const y_range = plotly_chart._fullLayout.yaxis.range
    const ranges = getRanges(x_range, y_range)
    drawMidpointLines(layout, config, ranges)
    drawQuadrantColors(layout, config, ranges)
    await Plotly.relayout(plotly_chart, layout)
}

function drawMidpointLines (layout, config, ranges) {
    const { x_min, x_max, y_min, y_max } = ranges

    if (config.xMidpointLineWidth > 0 && config.xMidpoint >= x_min && config.xMidpoint <= x_max) {
        layout.shapes.push({
            type: 'line',
            layer: 'above',
            line: {
                color: config.xMidpointLineColor,
                dash: config.xMidpointLineDash,
                width: config.xMidpointLineWidth
            },
            x0: config.xMidpoint,
            x1: config.xMidpoint,
            xref: 'x',
            y0: 0,
            y1: 1,
            yref: 'y domain'
        })
    }
    if (config.yMidpointLineWidth > 0 && config.yMidpoint >= y_min && config.yMidpoint <= y_max) {
        layout.shapes.push({
            type: 'line',
            layer: 'above',
            line: {
                color: config.yMidpointLineColor,
                dash: config.yMidpointLineDash,
                width: config.yMidpointLineWidth
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

function drawQuadrantColors (layout, config, ranges) {
    const { x_min, x_max, y_min, y_max } = ranges

    if (config.topLeftQuadrantColor && config.yMidpoint < y_max && config.xMidpoint > x_min) {
        layout.shapes.push({
            type: 'rect',
            x0: x_min,
            x1: config.xMidpoint > x_max ? x_max : config.xMidpoint,
            xref: 'x',
            y0: config.yMidpoint < y_min ? y_min : config.yMidpoint,
            y1: y_max,
            yref: 'y',
            fillcolor: config.topLeftQuadrantColor,
            line: {
                width: 0
            },
            layer: 'below'
        })
    }

    if (config.topRightQuadrantColor && config.yMidpoint < y_max && config.xMidpoint < x_max) {
        layout.shapes.push({
            type: 'rect',
            x0: config.xMidpoint < x_min ? x_min : config.xMidpoint,
            x1: x_max,
            xref: 'x',
            y0: config.yMidpoint < y_min ? y_min : config.yMidpoint,
            y1: y_max,
            yref: 'y',
            fillcolor: config.topRightQuadrantColor,
            line: {
                width: 0
            },
            layer: 'below'
        })
    }

    if (config.bottomLeftQuadrantColor && config.yMidpoint > y_min && config.xMidpoint > x_min) {
        layout.shapes.push({
            type: 'rect',
            x0: x_min,
            x1: config.xMidpoint > x_max ? x_max : config.xMidpoint,
            xref: 'x',
            y0: y_min,
            y1: config.yMidpoint > y_max ? y_max : config.yMidpoint,
            yref: 'y',
            fillcolor: config.bottomLeftQuadrantColor,
            line: {
                width: 0
            },
            layer: 'below'
        })
    }

    if (config.bottomRightQuadrantColor && config.yMidpoint > y_min && config.xMidpoint < x_max) {
        layout.shapes.push({
            type: 'rect',
            x0: config.xMidpoint < x_min ? x_min : config.xMidpoint,
            x1: x_max,
            xref: 'x',
            y0: y_min,
            y1: config.yMidpoint > y_max ? y_max : config.yMidpoint,
            yref: 'y',
            fillcolor: config.bottomRightQuadrantColor,
            line: {
                width: 0
            },
            layer: 'below'
        })
    }
}

function getRanges (x_range, y_range) {
    // The range may be reversed, hence we still need to compute the min and max
    const x_min = Math.min(...x_range)
    const x_max = Math.max(...x_range)
    const y_min = Math.min(...y_range)
    const y_max = Math.max(...y_range)
    return { x_min, x_max, y_min, y_max }
}

module.exports = {
    drawQuadrants
}
