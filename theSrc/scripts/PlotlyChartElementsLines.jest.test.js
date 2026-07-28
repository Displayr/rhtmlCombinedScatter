import { createPlotlyData } from './PlotlyChartElements'
import { buildConfig } from './buildConfig'

// Two groups of three points each, in the long form that flipStandardCharts sends
// for a line chart: X repeated per series, group naming the series.
function lineUserConfig (overrides = {}) {
    return Object.assign({
        X: ['Jan', 'Feb', 'Mar', 'Jan', 'Feb', 'Mar'],
        Y: [1, 2, 3, 4, 5, 6],
        group: ['A', 'A', 'A', 'B', 'B', 'B'],
        label: ['1', '2', '3', '4', '5', '6'],
        colors: ['#ff0000', '#00ff00'],
        linesShow: true,
    }, overrides)
}

function lineTraces (data) {
    return data.filter(t => t.mode === 'lines' && t.name)
}

function markerTraces (data) {
    return data.filter(t => t.mode === 'markers' && t.name)
}

describe('joining lines', () => {
    test('are not drawn unless lines.show is set', () => {
        const config = buildConfig(lineUserConfig({ linesShow: false }), 600, 400)
        expect(lineTraces(createPlotlyData(config))).toHaveLength(0)
    })

    test('draw one line trace per group', () => {
        const config = buildConfig(lineUserConfig(), 600, 400)
        const traces = lineTraces(createPlotlyData(config))
        expect(traces.map(t => t.name)).toEqual(['A', 'B'])
        expect(traces[0].y).toEqual([1, 2, 3])
        expect(traces[1].y).toEqual([4, 5, 6])
    })

    test('are ordered before the marker traces so they render underneath', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig(), 600, 400))
        const last_line = data.map(t => t.mode).lastIndexOf('lines')
        const first_marker = data.map(t => t.mode).indexOf('markers')
        expect(last_line).toBeLessThan(first_marker)
    })

    test('apply per-group thickness, dash and color', () => {
        const config = buildConfig(lineUserConfig({
            lineThickness: [3, 7],
            lineType: ['solid', 'dot'],
            lineColors: ['#111111', '#222222'],
        }), 600, 400)
        const traces = lineTraces(createPlotlyData(config))
        expect(traces[0].line).toMatchObject({ width: 3, dash: 'solid', color: '#111111' })
        expect(traces[1].line).toMatchObject({ width: 7, dash: 'dot', color: '#222222' })
    })

    test('recycle per-group settings by group index, as colors does', () => {
        const config = buildConfig(lineUserConfig({
            lineThickness: [5],
            lineType: ['dash'],
        }), 600, 400)
        const traces = lineTraces(createPlotlyData(config))
        expect(traces.map(t => t.line.width)).toEqual([5, 5])
        expect(traces.map(t => t.line.dash)).toEqual(['dash', 'dash'])
    })

    test('fall back to colors when lineColors is not supplied', () => {
        const config = buildConfig(lineUserConfig(), 600, 400)
        const traces = lineTraces(createPlotlyData(config))
        expect(traces.map(t => t.line.color)).toEqual(['#ff0000', '#00ff00'])
    })

    test('only set smoothing for splines', () => {
        const linear = lineTraces(createPlotlyData(buildConfig(lineUserConfig(), 600, 400)))
        expect(linear[0].line.smoothing).toBeUndefined()
        const spline = lineTraces(createPlotlyData(buildConfig(
            lineUserConfig({ lineShape: 'spline', lineSmoothing: 1.3 }), 600, 400)))
        expect(spline[0].line).toMatchObject({ shape: 'spline', smoothing: 1.3 })
    })

    test('take over the legend entry and tooltip from the markers', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig(), 600, 400))
        expect(lineTraces(data).map(t => t.showlegend)).toEqual([true, true])
        expect(markerTraces(data).every(t => t.showlegend === false)).toBe(true)
        expect(markerTraces(data).every(t => t.hoverinfo === 'skip')).toBe(true)
        expect(lineTraces(data).every(t => t.hoverinfo === 'name+text')).toBe(true)
    })

    test('leave the legend and tooltip on the markers when no lines are drawn', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({ linesShow: false }), 600, 400))
        expect(markerTraces(data).map(t => t.showlegend)).toEqual([true, true])
        expect(markerTraces(data).every(t => t.hoverinfo === 'name+text')).toBe(true)
    })

    test('do not connect across missing values', () => {
        const config = buildConfig(lineUserConfig(), 600, 400)
        expect(lineTraces(createPlotlyData(config)).every(t => t.connectgaps === false)).toBe(true)
    })
})

describe('tooltip text', () => {
    test('is generated from the labels and coordinates by default', () => {
        const config = buildConfig(lineUserConfig(), 600, 400)
        expect(lineTraces(createPlotlyData(config))[0].text[0]).toBe('1 (Jan, 1)')
    })

    test('is replaced by caller-supplied text', () => {
        const config = buildConfig(lineUserConfig({
            tooltipText: ['a', 'b', 'c', 'd', 'e', 'f'],
        }), 600, 400)
        const traces = lineTraces(createPlotlyData(config))
        expect(traces[0].text).toEqual(['a', 'b', 'c'])
        expect(traces[1].text).toEqual(['d', 'e', 'f'])
    })

    test('is ignored when its length does not match the data', () => {
        const config = buildConfig(lineUserConfig({ tooltipText: ['a', 'b'] }), 600, 400)
        expect(lineTraces(createPlotlyData(config))[0].text[0]).toBe('1 (Jan, 1)')
    })
})

describe('point radius', () => {
    test('is doubled to a diameter when given per point', () => {
        const config = buildConfig(lineUserConfig({
            pointRadius: [1, 2, 3, 4, 5, 6],
        }), 600, 400)
        const traces = markerTraces(createPlotlyData(config))
        expect(traces[0].marker.size).toEqual([2, 4, 6])
        expect(traces[1].marker.size).toEqual([8, 10, 12])
    })

    test('is still doubled when given as a single value', () => {
        const config = buildConfig(lineUserConfig({ pointRadius: 4 }), 600, 400)
        expect(markerTraces(createPlotlyData(config))[0].marker.size).toBe(8)
    })
})
