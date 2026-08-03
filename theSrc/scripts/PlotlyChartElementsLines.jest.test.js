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

// The legend proxy trace (see createLegendProxyTrace) is data-free and carries a series'
// name too, so it satisfies drawsLine/drawsMarkers/seriesTraces along with the real trace
// that carries the series' actual data. It is always hoverinfo: 'skip', which the real
// trace never is (borders and annotation traces are also 'skip', but they have no name and
// are already excluded above), so that is what tells the two apart.
function realSeriesTraces (data) { return seriesTraces(data).filter(t => t.hoverinfo !== 'skip') }
function legendProxyTraces (data) { return seriesTraces(data).filter(t => t.hoverinfo === 'skip') }

describe('joining lines', () => {
    test('are not drawn unless line.show is set', () => {
        const config = buildConfig(lineUserConfig({ lineShow: false }), 600, 400)
        expect(lineTraces(createPlotlyData(config))).toHaveLength(0)
    })

    test('draw one trace per group, carrying that group of points', () => {
        const config = buildConfig(lineUserConfig(), 600, 400)
        const traces = realSeriesTraces(createPlotlyData(config))
        expect(traces.map(t => t.name)).toEqual(['A', 'B'])
        expect(traces[0].y).toEqual([1, 2, 3])
        expect(traces[1].y).toEqual([4, 5, 6])
    })

    test('are drawn by the same trace as the markers, so plotly puts them underneath', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig(), 600, 400))
        expect(realSeriesTraces(data).map(t => t.mode)).toEqual(['lines+markers', 'lines+markers'])
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
        const traces = realSeriesTraces(createPlotlyData(config))
        expect(traces.map(t => t.line.width)).toEqual([5, 5])
        expect(traces.map(t => t.line.dash)).toEqual(['dash', 'dash'])
    })

    test('fall back to colors when lineColors is not supplied', () => {
        const config = buildConfig(lineUserConfig(), 600, 400)
        const traces = realSeriesTraces(createPlotlyData(config))
        expect(traces.map(t => t.line.color)).toEqual(['#ff0000', '#00ff00'])
    })

    test('only set smoothing for splines', () => {
        const linear = lineTraces(createPlotlyData(buildConfig(lineUserConfig(), 600, 400)))
        expect(linear[0].line.smoothing).toBeUndefined()
        const spline = lineTraces(createPlotlyData(buildConfig(
            lineUserConfig({ lineShape: 'spline', lineSmoothing: 1.3 }), 600, 400)))
        expect(spline[0].line).toMatchObject({ shape: 'spline', smoothing: 1.3 })
    })

    test('takes a shape and a smoothing per series', () => {
        const traces = realSeriesTraces(createPlotlyData(buildConfig(lineUserConfig({
            lineShape: ['linear', 'spline'], lineSmoothing: [1, 1.3],
        }), 600, 400)))
        expect(traces[0].line.shape).toBe('linear')
        expect(traces[1].line.shape).toBe('spline')
        // smoothing still only reaches the series that can use it
        expect(traces[0].line.smoothing).toBeUndefined()
        expect(traces[1].line.smoothing).toBe(1.3)
    })

    test('recycles a shape that names fewer series than the chart has', () => {
        const traces = realSeriesTraces(createPlotlyData(buildConfig(lineUserConfig({
            lineShape: ['spline'],
        }), 600, 400)))
        expect(traces.map(t => t.line.shape)).toEqual(['spline', 'spline'])
    })

    test('carries the tooltip on the merged trace, but never the legend entry', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({
            colors: ['#000000', '#000000'],
            lineColors: ['#ffffff', '#ffffff'],
        }), 600, 400))
        const traces = realSeriesTraces(data)
        expect(traces.every(t => t.showlegend === false)).toBe(true)
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
        expect(realSeriesTraces(createPlotlyData(config)).every(t => t.connectgaps === false)).toBe(true)
    })

    // The axis-padding fix: plotly decides its usual autorange padding from whether a trace
    // *has* markers, not from their size or visibility, so a real series trace stays mode:
    // 'lines+markers' with its marker block intact even when every radius in the chart is 0
    // (marker.show defaults to FALSE for a line chart, so flipStandardCharts sends
    // point.radius = rep(0, n)). Dropping the marker block for that case, as the previous
    // mechanism did to save the legend a stray dot, lost this padding instead: labels at the
    // extreme points overlapped the axis. The legend is what still needs a plain-line swatch
    // in this case, and that is now the proxy trace's job (see the next describe block).
    test('every real series trace still merges lines+markers when no marker is drawn anywhere', () => {
        const config = buildConfig(lineUserConfig({ pointRadius: [0, 0, 0, 0, 0, 0] }), 600, 400)
        const traces = realSeriesTraces(createPlotlyData(config))
        expect(traces.every(t => t.mode === 'lines+markers')).toBe(true)
        expect(traces.every(t => 'marker' in t)).toBe(true)
    })

    // Real series traces are unconditionally lines+markers now (see createSeriesTrace), so a
    // series whose own points are all zero merges identically to a neighbour that draws
    // markers elsewhere in the chart - the mismatch this used to guard against (a series
    // silently falling back to mode: 'lines' while its neighbour didn't, shifting .point
    // indices and so addMarkerClickHandler's markerIndexToDataIndex mapping) can no longer
    // happen, because there is no such fallback on the real trace any more.
    test('stay merged for every series even when only some points across the chart draw a marker', () => {
        // Markers only at the ends of each series - a real flipStandardCharts option
        const config = buildConfig(lineUserConfig({ pointRadius: [3, 0, 0, 0, 0, 3] }), 600, 400)
        const traces = realSeriesTraces(createPlotlyData(config))
        expect(traces.map(t => t.mode)).toEqual(['lines+markers', 'lines+markers'])
    })

    test('leave a markers-only chart as markers, even with a radius of zero', () => {
        const config = buildConfig(lineUserConfig({
            lineShow: false,
            pointRadius: [0, 0, 0, 0, 0, 0],
        }), 600, 400)
        const traces = seriesTraces(createPlotlyData(config))
        expect(traces.every(t => t.mode === 'markers')).toBe(true)
    })
})

// createLegendProxyTrace: a data-free trace per series (x: [null], y: [null]) that exists
// only because the real trace above can no longer drop its marker block to keep the legend
// swatch clean - it always keeps lines+markers now, for the axis padding.
describe('the legend proxy trace of a line chart', () => {
    test('carries the legend entry, styled like the series line, when the real trace does not', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({
            colors: ['#000000', '#000000'],
            lineColors: ['#ffffff', '#ffffff'],
        }), 600, 400))
        const proxies = legendProxyTraces(data)
        expect(proxies.map(t => t.name)).toEqual(['A', 'B'])
        expect(proxies.every(t => t.showlegend === true)).toBe(true)
        expect(proxies.every(t => t.line.color === '#ffffff')).toBe(true)
    })

    test('is a plain line, with no marker block, when no marker is drawn anywhere', () => {
        const config = buildConfig(lineUserConfig({ pointRadius: [0, 0, 0, 0, 0, 0] }), 600, 400)
        const proxies = legendProxyTraces(createPlotlyData(config))
        expect(proxies.every(t => t.mode === 'lines')).toBe(true)
        expect(proxies.every(t => !('marker' in t))).toBe(true)
    })

    test('carries the series colour and its representative size and symbol when markers are drawn', () => {
        const config = buildConfig(lineUserConfig({
            pointRadius: [1, 2, 3, 4, 5, 6],
            pointSymbol: ['square', 'square', 'square', 'diamond', 'diamond', 'diamond'],
        }), 600, 400)
        const proxies = legendProxyTraces(createPlotlyData(config))
        // The first point of each series, doubled to a diameter - the swatch can only show
        // one size, so it takes the series' first entry rather than an average or a max.
        expect(proxies.map(t => t.marker.size)).toEqual([2, 8])
        expect(proxies.map(t => t.marker.symbol)).toEqual(['square', 'diamond'])
        expect(proxies.map(t => t.marker.color)).toEqual(['#ff0000', '#00ff00'])
    })

    // flipStandardCharts expands a per-series marker.show into point.radius, so a chart
    // showing markers on one series and not the other arrives as a single array with a
    // zero run in it. Deciding from the whole array gives the markerless series a marker
    // block of size 0, which is the input the plain-line fallback exists to avoid.
    test('is a plain line for a series with no markers, even when another series has them', () => {
        const config = buildConfig(lineUserConfig({ pointRadius: [3, 3, 3, 0, 0, 0] }), 600, 400)
        const [a, b] = legendProxyTraces(createPlotlyData(config))
        expect(a.mode).toBe('lines+markers')
        expect(a.marker.size).toBe(6)
        expect(b.mode).toBe('lines')
        expect('marker' in b).toBe(false)
    })

    // A radius of 0 is marker.show = FALSE encoded as a radius, not a small marker, so the
    // swatch has to show the first marker actually drawn. marker.show.at.last.end makes this
    // the ordinary shape: every series hides all but its final point.
    test('takes the first marker drawn, not the first point, when the first is hidden', () => {
        const config = buildConfig(lineUserConfig({ pointRadius: [0, 3, 3, 0, 0, 4] }), 600, 400)
        const proxies = legendProxyTraces(createPlotlyData(config))
        expect(proxies.map(t => t.marker.size)).toEqual([6, 8])
    })

    // Panels mean nothing to a proxy - it carries no data and references no axis - so one
    // per group is enough. Creating one per group x panel left the extras as no-ops with
    // showlegend false, which reads as though panel membership mattered.
    test('is created once per group, not once per group and panel', () => {
        const config = buildConfig(lineUserConfig({
            X: ['Jan', 'Feb', 'Jan', 'Feb', 'Jan', 'Feb', 'Jan', 'Feb'],
            Y: [1, 2, 3, 4, 5, 6, 7, 8],
            group: ['A', 'A', 'B', 'B', 'A', 'A', 'B', 'B'],
            label: ['1', '2', '3', '4', '5', '6', '7', '8'],
            panels: ['P1', 'P1', 'P1', 'P1', 'P2', 'P2', 'P2', 'P2'],
            panelLabels: ['P1', 'P2'],
        }), 600, 400)
        const proxies = legendProxyTraces(createPlotlyData(config))
        expect(proxies.map(t => t.name)).toEqual(['A', 'B'])
        expect(proxies.every(t => t.showlegend === true)).toBe(true)
    })

    test('does not exist at all when lineShow is false', () => {
        const data = createPlotlyData(buildConfig(lineUserConfig({ lineShow: false }), 600, 400))
        expect(legendProxyTraces(data)).toHaveLength(0)
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

// These four hold before and after the line and marker traces merge, and again after the
// legend was split out into its own proxy trace. They are the contract both restructurings
// must not break, so they are deliberately silent about how many traces a series is drawn
// with, and about which of those traces owns the legend.
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
            markerAnnotations: ['a', 'b', 'c', 'd', 'e', 'f'],
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
        expect(realSeriesTraces(data).map(t => t.marker.symbol))
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
        const borders = data.filter(t => !t.name && typeof t.mode === 'string' &&
            t.mode.includes('markers') && t.marker.color === 'transparent')
        expect(borders.map(t => t.marker.symbol))
            .toEqual([['square', 'square', 'square'], ['diamond', 'diamond', 'diamond']])
    })
})
