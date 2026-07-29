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
    // The marker trace gives its legend entry up to the line trace when lines are drawn,
    // so the line trace has to take it, or the legend comes out empty.
    test('a line trace asks to be in the legend', () => {
        const shown = createPlotlyData(cfg({ linesShow: true }))
            .filter(t => t.showlegend === true)
        expect(shown.length).toBe(1)
        expect(shown[0].mode).toBe('lines')
        expect(shown[0].name).toBe('Series 1')
    })

    test('the marker trace stays out of it, so the entry is not duplicated', () => {
        const data = createPlotlyData(cfg({ linesShow: true }))
        expect(data.filter(t => t.mode === 'markers' && t.showlegend === true))
            .toHaveLength(0)
    })

    test('only one entry when the chart is split into panels', () => {
        const config = cfg({
            linesShow: true,
            panels: [1, 1, 2, 2],
            panelLabels: ['one', 'two'],
        })
        expect(createPlotlyData(config).filter(t => t.showlegend === true)).toHaveLength(1)
    })

    test('a chart with groups still gets one entry per group', () => {
        const config = cfg({ linesShow: true, group: ['A', 'A', 'B', 'B'] })
        expect(createPlotlyData(config).filter(t => t.showlegend === true).map(t => t.name))
            .toEqual(['A', 'B'])
    })
})

describe('the title of a line chart that does not ask for a top margin', () => {
    // The title is centred in the top margin, so the shift has to be half of the margin
    // the layout actually uses, which is worked out when the caller has not given one.
    test('is shifted by half of the margin the layout reserves', () => {
        const config = cfg({ linesShow: true, title: 'A title' })
        const l = createPlotlyLayout(config, 0, 400)
        expect(config.marginTop).toBeNull()
        expect(l.margin.t).toBeGreaterThan(0)
        expect(l.annotations.find(a => a.name === 'title').yshift)
            .toBeCloseTo(l.margin.t * 0.5, 6)
    })

    test('and by half of the margin it was given, when it was given one', () => {
        const config = cfg({ linesShow: true, title: 'A title', marginTop: 60 })
        expect(createPlotlyLayout(config, 0, 400)
            .annotations.find(a => a.name === 'title').yshift).toBe(30)
    })
})

describe('bubble sizes with a radius for each point', () => {
    test('each bubble is scaled by its own radius', () => {
        const config = cfg({ Z: [1, 2, 3, 4], pointRadius: [1, 2, 3, 4] })
        expect(config.normZ.every(v => Number.isFinite(v))).toBe(true)
        // the largest z with the largest radius gives the largest bubble
        expect(config.normZ[3]).toBeGreaterThan(config.normZ[0])
    })

    test('a single radius still applies to them all', () => {
        const config = cfg({ Z: [1, 2, 3, 4], pointRadius: 4 })
        expect(config.normZ.every(v => Number.isFinite(v))).toBe(true)
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
