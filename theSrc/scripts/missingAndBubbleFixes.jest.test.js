import { createPlotlyData, createPlotlyLayout } from './PlotlyChartElements'
import { buildConfig } from './buildConfig'

const base = {
    X: [1, 2, 3, 4],
    Y: [10, 11, 12, 13],
    label: ['a', 'b', 'c', 'd'],
}
const cfg = (o) => buildConfig(Object.assign({}, base, o), 600, 400)
const DATES = [null, '2020-02-01', '2020-03-01', '2020-04-01']
const GAPPED_Y = [null, 1.23456, 2.34567, 3.45678]

describe('the legend entry of a line chart with one series', () => {
    // The series' line and markers are drawn by one merged trace, so that trace is the only
    // one that can ask for the legend entry, or the legend comes out empty.
    test('a line trace asks to be in the legend', () => {
        const shown = createPlotlyData(cfg({ lineShow: true }))
            .filter(t => t.showlegend === true)
        expect(shown.length).toBe(1)
        expect(shown[0].mode).toBe('lines+markers')
        expect(shown[0].name).toBe('Series 1')
    })

    test('nothing else asks for the legend, so the entry is not duplicated', () => {
        const data = createPlotlyData(cfg({ lineShow: true }))
        expect(data.filter(t => t.showlegend === true)).toHaveLength(1)
    })

    test('only one entry when the chart is split into panels', () => {
        const config = cfg({
            lineShow: true,
            panels: [1, 1, 2, 2],
            panelLabels: ['one', 'two'],
        })
        expect(createPlotlyData(config).filter(t => t.showlegend === true)).toHaveLength(1)
    })

    test('a chart with groups still gets one entry per group', () => {
        const config = cfg({ lineShow: true, group: ['A', 'A', 'B', 'B'] })
        expect(createPlotlyData(config).filter(t => t.showlegend === true).map(t => t.name))
            .toEqual(['A', 'B'])
    })
})

describe('the title of a line chart that does not ask for a top margin', () => {
    // The title is centred in the top margin, so the shift has to be half of the margin
    // the layout actually uses, which is worked out when the caller has not given one.
    test('is shifted by half of the margin the layout reserves', () => {
        const config = cfg({ lineShow: true, title: 'A title' })
        const l = createPlotlyLayout(config, 0, 400)
        expect(config.marginTop).toBeNull()
        expect(l.margin.t).toBeGreaterThan(0)
        expect(l.annotations.find(a => a.name === 'title').yshift)
            .toBeCloseTo(l.margin.t * 0.5, 6)
    })

    test('and by half of the margin it was given, when it was given one', () => {
        const config = cfg({ lineShow: true, title: 'A title', marginTop: 60 })
        expect(createPlotlyLayout(config, 0, 400)
            .annotations.find(a => a.name === 'title').yshift).toBe(30)
    })
})

describe('bubble sizes with a radius for each point', () => {
    // CombinedScatter rejects this combination, because the bubble legend has only one
    // radius to size its reference bubbles from. buildConfig still resolves the radius
    // per bubble so that a caller reaching it directly gets sizes rather than NaN, and
    // says why.
    let warn
    beforeEach(() => { warn = jest.spyOn(console, 'warn').mockImplementation(() => {}) })
    afterEach(() => { warn.mockRestore() })

    test('each bubble is scaled by its own radius', () => {
        const config = cfg({ Z: [1, 2, 3, 4], pointRadius: [1, 2, 3, 4] })
        expect(config.normZ.every(v => Number.isFinite(v))).toBe(true)
        // the largest z with the largest radius gives the largest bubble
        expect(config.normZ[3]).toBeGreaterThan(config.normZ[0])
    })

    test('but the caller is told that the bubble legend cannot be drawn from it', () => {
        cfg({ Z: [1, 2, 3, 4], pointRadius: [1, 2, 3, 4] })
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('pointRadius must be a single value'))
    })

    test('a single radius still applies to them all, and is not warned about', () => {
        const config = cfg({ Z: [1, 2, 3, 4], pointRadius: 4 })
        expect(config.normZ.every(v => Number.isFinite(v))).toBe(true)
        expect(warn).not.toHaveBeenCalled()
    })
})

describe('a gap on a date axis', () => {
    // new Date(null) is the epoch, so a gap has to be left alone or the line runs to 1970
    test('stays a gap rather than becoming 1970', () => {
        const config = cfg({ X: DATES, xIsDateTime: true })
        expect(config.X[0]).toBeNull()
        expect(config.X[1] instanceof Date).toBe(true)
        expect(config.X[1].getUTCFullYear()).toBe(2020)
    })

    test('is left out of the range, so it does not stretch the axis back to 1970', () => {
        const l = createPlotlyLayout(cfg({ X: DATES, xIsDateTime: true }), 0, 400)
        expect(new Date(l.xaxis.range[0]).getUTCFullYear()).toBe(2020)
    })
})

describe('the hover format of a series that begins with a gap', () => {
    // The type was read from the first value, so a leading gap lost the format for the
    // whole series
    test('is applied to the values that are there', () => {
        const t = createPlotlyData(cfg({ Y: GAPPED_Y, yFormat: '.2f' })).find(x => x.text)
        expect(t.text[1]).toContain('1.23')
        expect(t.text[1]).not.toContain('1.23456')
    })

    test('and the gap itself has no value to show', () => {
        const t = createPlotlyData(cfg({ Y: GAPPED_Y, yFormat: '.2f' })).find(x => x.text)
        expect(t.text[0]).not.toContain('null')
        expect(t.text[0]).not.toContain('NaN')
    })
})
