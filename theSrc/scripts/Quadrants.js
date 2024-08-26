import Plotly from 'plotly.js-basic-dist-min'

async function drawQuadrants (plotly_chart, config, state) {
    const layout = plotly_chart.layout
    const x_range = plotly_chart._fullLayout.xaxis.range
    const y_range = plotly_chart._fullLayout.yaxis.range
    const ranges = getRanges(x_range, y_range)
    drawMidpointLines(layout, config, ranges)
    drawQuadrantColors(layout, config, ranges)
    drawQuadrantTitles(layout, config, ranges, state)
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

    if (config.quadrantTopLeftColor && config.yMidpoint < y_max && config.xMidpoint > x_min) {
        layout.shapes.push({
            type: 'rect',
            x0: x_min,
            x1: config.xMidpoint > x_max ? x_max : config.xMidpoint,
            xref: 'x',
            y0: config.yMidpoint < y_min ? y_min : config.yMidpoint,
            y1: y_max,
            yref: 'y',
            fillcolor: config.quadrantTopLeftColor,
            line: {
                width: 0
            },
            layer: 'below'
        })
    }

    if (config.quadrantTopRightColor && config.yMidpoint < y_max && config.xMidpoint < x_max) {
        layout.shapes.push({
            type: 'rect',
            x0: config.xMidpoint < x_min ? x_min : config.xMidpoint,
            x1: x_max,
            xref: 'x',
            y0: config.yMidpoint < y_min ? y_min : config.yMidpoint,
            y1: y_max,
            yref: 'y',
            fillcolor: config.quadrantTopRightColor,
            line: {
                width: 0
            },
            layer: 'below'
        })
    }

    if (config.quadrantBottomLeftColor && config.yMidpoint > y_min && config.xMidpoint > x_min) {
        layout.shapes.push({
            type: 'rect',
            x0: x_min,
            x1: config.xMidpoint > x_max ? x_max : config.xMidpoint,
            xref: 'x',
            y0: y_min,
            y1: config.yMidpoint > y_max ? y_max : config.yMidpoint,
            yref: 'y',
            fillcolor: config.quadrantBottomLeftColor,
            line: {
                width: 0
            },
            layer: 'below'
        })
    }

    if (config.quadrantBottomRightColor && config.yMidpoint > y_min && config.xMidpoint < x_max) {
        layout.shapes.push({
            type: 'rect',
            x0: config.xMidpoint < x_min ? x_min : config.xMidpoint,
            x1: x_max,
            xref: 'x',
            y0: y_min,
            y1: config.yMidpoint > y_max ? y_max : config.yMidpoint,
            yref: 'y',
            fillcolor: config.quadrantBottomRightColor,
            line: {
                width: 0
            },
            layer: 'below'
        })
    }
}
function drawQuadrantTitles (layout, config, ranges, state) {
    const { x_min, x_max, y_min, y_max } = ranges
    if (!layout.annotations) layout.annotations = []
    let index = layout.annotations.length
    if (config.quadrantTopLeftTitle && config.yMidpoint < y_max &&
        config.xMidpoint > x_min) {
        const initial_offset = state.isStoredInState('quadrantTitle' + index)
            ? state.getStored('quadrantTitle' + index)
            : { ax: 0, ay: 0 }
        layout.annotations.push({
            text: config.quadrantTopLeftTitle,
            xanchor: 'left',
            xref: 'x',
            ax: initial_offset.ax,
            x: x_min,
            xshift: 5,
            yanchor: 'top',
            yref: 'y',
            ay: initial_offset.ay,
            y: y_max,
            yshift: -5,
            font: {
                family: config.quadrantTopLeftTitleFontFamily,
                color: config.quadrantTopLeftTitleFontColor,
                size: config.quadrantTopLeftTitleFontSize
            },
            arrowcolor: 'transparent' // invisible arrow to allow dragging
        })
        index++
    }
    if (config.quadrantTopRightTitle && config.yMidpoint < y_max) {
        const initial_offset = state.isStoredInState('quadrantTitle' + index)
            ? state.getStored('quadrantTitle' + index)
            : { ax: 0, ay: 0 }
        layout.annotations.push({
            text: config.quadrantTopRightTitle,
            xanchor: 'right',
            xref: 'x',
            ax: initial_offset.ax,
            x: x_max,
            xshift: -5,
            yanchor: 'top',
            yref: 'y',
            ay: initial_offset.ay,
            y: y_max,
            yshift: -5,
            font: {
                family: config.quadrantTopRightTitleFontFamily,
                color: config.quadrantTopRightTitleFontColor,
                size: config.quadrantTopRightTitleFontSize
            },
            arrowcolor: 'transparent'
        })
        index++
    }
    if (config.quadrantBottomLeftTitle && config.yMidpoint > y_min &&
        config.xMidpoint > x_min) {
        const initial_offset = state.isStoredInState('quadrantTitle' + index)
            ? state.getStored('quadrantTitle' + index)
            : { ax: 0, ay: 0 }
        layout.annotations.push({
            text: config.quadrantBottomLeftTitle,
            xanchor: 'left',
            xref: 'x',
            ax: initial_offset.ax,
            x: x_min,
            xshift: 5,
            yanchor: 'bottom',
            yref: 'y',
            ay: initial_offset.ay,
            y: y_min,
            yshift: 5,
            font: {
                family: config.quadrantBottomLeftTitleFontFamily,
                color: config.quadrantBottomLeftTitleFontColor,
                size: config.quadrantBottomLeftTitleFontSize
            },
            arrowcolor: 'transparent' // invisible arrow to allow dragging
        })
        index++
    }
    if (config.quadrantBottomRightTitle && config.yMidpoint > y_min &&
        config.xMidpoint < x_max) {
        const initial_offset = state.isStoredInState('quadrantTitle' + index)
            ? state.getStored('quadrantTitle' + index)
            : { ax: 0, ay: 0 }
        layout.annotations.push({
            text: config.quadrantBottomRightTitle,
            xanchor: 'right',
            xref: 'x',
            ax: initial_offset.ax,
            x: x_max,
            xshift: -5,
            yanchor: 'bottom',
            yref: 'y',
            ay: initial_offset.ay,
            y: y_min,
            yshift: 5,
            font: {
                family: config.quadrantBottomRightTitleFontFamily,
                color: config.quadrantBottomRightTitleFontColor,
                size: config.quadrantBottomRightTitleFontSize
            },
            arrowcolor: 'transparent' // invisible arrow to allow dragging
        })
        index++
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
