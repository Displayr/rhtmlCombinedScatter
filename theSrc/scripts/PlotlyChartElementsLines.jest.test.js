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
        lineShow: true,
    }, overrides)
}

// A series' joining line and its markers may be one trace or two, so these select by what
// a trace draws rather than by an exact mode string. Named traces only, which excludes the
// base trace that forces categorical labels and the border and annotation traces.
function drawsLine (t) { return Boolean(t.name) && typeof t.mode === 'string' && t.mode.includes('lines') }
function drawsMarkers (t) { return Boolean(t.name) && typeof t.mode === 'string' && t.mode.includes('markers') }

function lineTraces (data) { return data.filter(drawsLine) }
function markerTraces (data) { return data.filter(drawsMarkers) }
// Every trace that belongs to a series, however many traces that is
function seriesTraces (data) { return data.filter(t => drawsLine(t) || drawsMarkers(t)) }

describe('joining lines', () => {
    test('are not drawn unless line.show is set', () => {
        const config = buildConfig(lineUserConfig({ lineShow: false }), 600, 400)
        expect(lineTraces(createPlotlyData(config))).toHaveLength(0)
    })

    test('draw one trace per group, carrying that group of points', () => {
        const config = buildConfig(lineUserConfig(), 600, 400)
        const traces = lineTraces(createPlotlyData(config))
        expect(traces.map(t => t.name)).toEqual(['A', 'B'])
        expect(traces[0].y).toEqual([1, 2, 3])
        expect(traces[1].y).toEqual([4, 5, 6])
    })

    test('are drawn by the same trace as the markers, so plotly puts them underneath', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig(), 600, 400))
        expect(seriesTraces(data).map(t => t.mode)).toEqual(['lines+markers', 'lines+markers'])
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

    test('carry the legend entry and the tooltip on the merged trace', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({
            colors: ['#000000', '#000000'],
            lineColors: ['#ffffff', '#ffffff'],
        }), 600, 400))
        const traces = seriesTraces(data)
        expect(traces.map(t => t.showlegend)).toEqual([true, true])
        expect(traces.every(t => t.hoverinfo === 'name+text')).toBe(true)
        // Judged from the line colour, not the marker's: white line gives dark text,
        // where the black marker colour would give white
        expect(traces.every(t => t.hoverlabel.font.color === '#2C2C2C')).toBe(true)
    })

    test('leave the legend and tooltip on the markers when no lines are drawn', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({ lineShow: false }), 600, 400))
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

    // A bare string is not text for one point: its length is a character count, which
    // would be indexed per character if it happened to match. The R layer encodes the
    // text as an array however many points there are, so this stays a rejection.
    test('is ignored when it arrives as a bare string', () => {
        const config = buildConfig({
            X: ['Jan'], Y: [1], label: ['1'], tooltipText: 'a',
        }, 600, 400)
        expect(createPlotlyData(config).find(t => t.text).text[0]).toBe('1 (Jan, 1)')
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

// These four hold before and after the line and marker traces merge. They are the contract
// the merge must not break, so they are deliberately silent about how many traces a series
// is drawn with.
describe('invariants across the trace structure', () => {
    test('exactly one trace per series carries the tooltip payload, covering every point', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig(), 600, 400))
        const hovered = seriesTraces(data).filter(t => t.hoverinfo !== 'skip')
        expect(hovered.map(t => t.name)).toEqual(['A', 'B'])
        // Every point of the series, so hover still works where the marker has radius 0,
        // which is the default for a line chart
        expect(hovered.map(t => t.text.length)).toEqual([3, 3])
        expect(hovered.map(t => t.y)).toEqual([[1, 2, 3], [4, 5, 6]])
    })

    test('exactly one trace per series carries the legend entry', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig(), 600, 400))
        const legended = seriesTraces(data).filter(t => t.showlegend === true)
        expect(legended.map(t => t.name)).toEqual(['A', 'B'])
    })

    test('marker traces come before the border and annotation traces', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({
            pointBorderColor: ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000'],
            pointBorderWidth: [1, 1, 1, 1, 1, 1],
        }), 600, 400))
        const modes = data.map(t => (typeof t.mode === 'string' && t.mode.includes('markers')) ? 'markers' : 'other')
        const last_series_marker = data.reduce((acc, t, i) => drawsMarkers(t) ? i : acc, -1)
        const first_unnamed_marker = modes.findIndex((m, i) => m === 'markers' && !data[i].name)
        expect(last_series_marker).toBeGreaterThanOrEqual(0)
        expect(first_unnamed_marker).toBeGreaterThan(last_series_marker)
    })

    test('the trace structure is untouched when no joining line is drawn', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({ lineShow: false }), 600, 400))
        expect(seriesTraces(data).map(t => ({
            name: t.name, mode: t.mode, showlegend: t.showlegend, hoverinfo: t.hoverinfo,
        }))).toEqual([
            { name: 'A', mode: 'markers', showlegend: true, hoverinfo: 'name+text' },
            { name: 'B', mode: 'markers', showlegend: true, hoverinfo: 'name+text' },
        ])
    })
})

describe('point symbol', () => {
    // flipStandardCharts sends one symbol per point, repeated across each series, the same
    // shape it sends pointRadius and pointBorderColor in
    const perPoint = ['square', 'square', 'square', 'diamond', 'diamond', 'diamond']

    test('is sliced per group from a per-point array', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({ pointSymbol: perPoint }), 600, 400))
        expect(seriesTraces(data).map(t => t.marker.symbol))
            .toEqual([['square', 'square', 'square'], ['diamond', 'diamond', 'diamond']])
    })

    test('is passed straight through when given as a single value', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({ pointSymbol: 'square' }), 600, 400))
        expect(seriesTraces(data).every(t => t.marker.symbol === 'square')).toBe(true)
    })

    test('is left to plotly when not supplied', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig(), 600, 400))
        expect(seriesTraces(data).every(t => t.marker.symbol === undefined)).toBe(true)
    })

    test('is matched by the marker border, so a square marker is not circled', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({
            pointSymbol: perPoint,
            pointBorderColor: ['#000000', '#000000', '#000000', '#000000', '#000000', '#000000'],
            pointBorderWidth: [1, 1, 1, 1, 1, 1],
        }), 600, 400))
        const borders = data.filter(t => !t.name && typeof t.mode === 'string'
            && t.mode.includes('markers') && t.marker.color === 'transparent')
        expect(borders.map(t => t.marker.symbol))
            .toEqual([['square', 'square', 'square'], ['diamond', 'diamond', 'diamond']])
    })
})
