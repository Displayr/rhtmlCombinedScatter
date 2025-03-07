import Plotly from 'plotly.js-basic-dist-min'

async function drawQuadrants (plotly_chart, config, state) {
    const layout = plotly_chart.layout
    const x_range = plotly_chart._fullLayout.xaxis.range
    const y_range = plotly_chart._fullLayout.yaxis.range
    const ranges = getRanges(x_range, y_range)
    drawMidpointLines(layout, config, ranges)
    drawQuadrantColors(layout, config, ranges)
    drawQuadrantTitles(layout, config, ranges, state)
    layout.xaxis.range = x_range
    layout.xaxis.autorange = false
    layout.yaxis.range = y_range
    layout.yaxis.autorange = false
    await Plotly.relayout(plotly_chart, layout)
}

function drawMidpointLines (layout, config, ranges) {
    const { x_min, x_max, y_min, y_max } = ranges

    if (config.xMidpointLineWidth > 0 && config.xMidpoint >= x_min && config.xMidpoint <= x_max) {
        layout.shapes.push({
            type: 'line',
            layer: 'between',
            line: {
                color: config.xMidpointLineColor,
                dash: config.xMidpointLineDash,
                width: config.xMidpointLineWidth
            },
            x0: config.xMidpoint,
            x1: config.xMidpoint,
            y0: y_min,
            y1: y_max,
        })
    }
    if (config.yMidpointLineWidth > 0 && config.yMidpoint >= y_min && config.yMidpoint <= y_max) {
        layout.shapes.push({
            type: 'line',
            layer: 'between',
            line: {
                color: config.yMidpointLineColor,
                dash: config.yMidpointLineDash,
                width: config.yMidpointLineWidth
            },
            x0: x_min,
            x1: x_max,
            y0: config.yMidpoint,
            y1: config.yMidpoint,
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

    // Keep track of the index of the annotation because this is
    // used to link to state saved
    let index = layout.annotations.length
    if (config.quadrantTopLeftTitle && config.yMidpoint < y_max &&
        config.xMidpoint > x_min) {
        const initial_pos = { ax: x_min, ay: y_max }
        const curr_pos = state.isStoredInState('quadrantTitle' + index)
            ? state.getStored('quadrantTitle' + index)
            : initial_pos
        layout.annotations.push({
            text: config.quadrantTopLeftTitle,
            xref: 'x',
            x: initial_pos.ax,
            axref: 'x',
            ax: curr_pos.ax,
            yref: 'y',
            y: initial_pos.ay,
            ayref: 'y',
            ay: curr_pos.ay,
            xanchor: 'left',
            yanchor: 'top',
            xshift: 5,
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
    if (config.quadrantTopRightTitle && config.yMidpoint < y_max &&
        config.xMidpoint < x_max) {
        const initial_pos = { ax: x_max, ay: y_max }
        const curr_pos = state.isStoredInState('quadrantTitle' + index)
            ? state.getStored('quadrantTitle' + index)
            : initial_pos
        layout.annotations.push({
            text: config.quadrantTopRightTitle,
            xref: 'x',
            x: initial_pos.ax,
            axref: 'x',
            ax: curr_pos.ax,
            yref: 'y',
            y: initial_pos.ay,
            ayref: 'y',
            ay: curr_pos.ay,
            xanchor: 'right',
            yanchor: 'top',
            xshift: -5,
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
        const initial_pos = { ax: x_min, ay: y_min }
        const curr_pos = state.isStoredInState('quadrantTitle' + index)
            ? state.getStored('quadrantTitle' + index)
            : initial_pos
        layout.annotations.push({
            text: config.quadrantBottomLeftTitle,
            xref: 'x',
            x: initial_pos.ax,
            axref: 'x',
            ax: curr_pos.ax,
            yref: 'y',
            y: initial_pos.ay,
            ayref: 'y',
            ay: curr_pos.ay,
            xanchor: 'left',
            yanchor: 'bottom',
            xshift: 5,
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
        const initial_pos = { ax: x_max, ay: y_min }
        const curr_pos = state.isStoredInState('quadrantTitle' + index)
            ? state.getStored('quadrantTitle' + index)
            : initial_pos
        layout.annotations.push({
            text: config.quadrantBottomRightTitle,
            xref: 'x',
            x: initial_pos.ax,
            axref: 'x',
            ax: curr_pos.ax,
            yref: 'y',
            y: initial_pos.ay,
            ayref: 'y',
            ay: curr_pos.ay,
            xanchor: 'right',
            yanchor: 'bottom',
            xshift: -5,
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
