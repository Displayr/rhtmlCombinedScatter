import { createPlotlyLayout, chartHeight, normaliseAlignment } from './PlotlyChartElements'
import { buildConfig } from './buildConfig'

// A line chart needs the same axis range and tick count as the plotly chart it replaces,
// so both are passed in rather than left to the axis.
function layout (overrides = {}) {
    const config = buildConfig(Object.assign({
        X: [1, 2, 3, 4],
        Y: [10, 11, 12, 13],
        group: ['A', 'A', 'A', 'A'],
        label: ['a', 'b', 'c', 'd'],
    }, overrides), 600, 400)
    return createPlotlyLayout(config, 0, 400)
}

describe('axis range mode', () => {
    test('defaults to normal on both axes', () => {
        const l = layout()
        expect(l.xaxis.rangemode).toBe('normal')
        expect(l.yaxis.rangemode).toBe('normal')
    })

    test('can extend an axis to zero', () => {
        const l = layout({ xAxisRangeMode: 'tozero', yAxisRangeMode: 'tozero' })
        expect(l.xaxis.rangemode).toBe('tozero')
        expect(l.yaxis.rangemode).toBe('tozero')
    })

    test('is set per axis', () => {
        const l = layout({ yAxisRangeMode: 'tozero' })
        expect(l.xaxis.rangemode).toBe('normal')
        expect(l.yaxis.rangemode).toBe('tozero')
    })
})

describe('where the title, subtitle and footer go', () => {
    const named = { title: 'T', subtitle: 'S', footer: 'F', marginTop: 60 }
    const annotation = (l, name) => (l.annotations || []).find(a => a.name === name)

    test('a scatter plot keeps laying them out itself', () => {
        const l = layout(named)
        // a real plotly title, which the widget then positions in d3
        expect(l.title.text).toBe('T')
        expect(annotation(l, 'title')).toBeUndefined()
        expect(annotation(l, 'subtitle')).toBeDefined()
        expect(annotation(l, 'footer')).toBeDefined()
    })

    test('a line chart puts the title in the top margin instead', () => {
        const l = layout(Object.assign({ linesShow: true }, named))
        expect(l.title.text).toBe('')
        const t = annotation(l, 'title')
        expect(t).toBeDefined()
        expect(t.text).toBe('T')
        // anchored to the top of the plot area, then lifted half the top margin, which is
        // how flipStandardCharts centres it in the space reserved for it
        expect(t).toMatchObject({ yref: 'paper', y: 1, yanchor: 'middle', yshift: 30 })
        expect(annotation(l, 'subtitle')).toBeDefined()
        expect(annotation(l, 'footer')).toBeDefined()
    })

    test('the title annotation follows the requested alignment', () => {
        const left = annotation(layout(Object.assign({ linesShow: true, titleAlignment: 'left' }, named)), 'title')
        expect(left).toMatchObject({ x: 0, xanchor: 'left', align: 'left' })
        const right = annotation(layout(Object.assign({ linesShow: true, titleAlignment: 'Right' }, named)), 'title')
        expect(right).toMatchObject({ x: 1, xanchor: 'right', align: 'right' })
        const mid = annotation(layout(Object.assign({ linesShow: true }, named)), 'title')
        expect(mid).toMatchObject({ x: 0.5, xanchor: 'center' })
    })

    test('a line chart is not shortened for the footer, a scatter plot is', () => {
        const { buildConfig: bc } = require('./buildConfig')
        const base = { X: [1, 2], Y: [1, 2], group: ['A', 'A'], label: ['a', 'b'], footer: 'F' }
        expect(chartHeight(bc(base, 600, 400), 400)).toBeLessThan(400)
        expect(chartHeight(bc(Object.assign({ linesShow: true }, base), 600, 400), 400)).toBe(400)
    })
})

describe('subtitle and footer alignment', () => {
    const named = { title: 'T', subtitle: 'S', footer: 'F' }
    const annotation = (l, name) => (l.annotations || []).find(a => a.name === name)

    test('both default to the centre, whatever the chart', () => {
        for (const linesShow of [true, false]) {
            const l = layout(Object.assign({ linesShow }, named))
            expect(annotation(l, 'subtitle')).toMatchObject({ x: 0.5, xanchor: 'center' })
            expect(annotation(l, 'footer')).toMatchObject({ x: 0.5, xanchor: 'center' })
        }
    })

    test('both follow the alignment they are given', () => {
        const l = layout(Object.assign({ subtitleAlignment: 'Left', footerAlignment: 'Right' }, named))
        expect(annotation(l, 'subtitle')).toMatchObject({ x: 0, xanchor: 'left', align: 'left' })
        expect(annotation(l, 'footer')).toMatchObject({ x: 1, xanchor: 'right', align: 'right' })
    })

    // flipStandardCharts spells these in lower case
    test('the alignment is read case insensitively', () => {
        const l = layout(Object.assign({ subtitleAlignment: 'left', footerAlignment: 'right' }, named))
        expect(annotation(l, 'subtitle')).toMatchObject({ x: 0, xanchor: 'left' })
        expect(annotation(l, 'footer')).toMatchObject({ x: 1, xanchor: 'right' })
    })

    test('an unrecognised alignment falls back to the centre rather than the right', () => {
        expect(normaliseAlignment('center')).toBe('Center')
        expect(normaliseAlignment('Center of plot area')).toBe('Center of plot area')
        expect(normaliseAlignment(undefined)).toBe('Center of plot area')
        expect(normaliseAlignment('LEFT')).toBe('Left')
    })
})

describe('tooltip', () => {
    test('hover is left to plotly when the tooltip is shown', () => {
        expect(layout().hovermode).toBeUndefined()
        expect(layout({ tooltipShow: true }).hovermode).toBeUndefined()
    })

    test('hover is turned off when the tooltip is not shown', () => {
        expect(layout({ tooltipShow: false }).hovermode).toBe(false)
    })
})

describe('empty axis titles', () => {
    // An empty title is not the same as no title: plotly reserves the title font height
    // for a title it never draws. Line charts have to match the margins of the plotly
    // line chart they replace, so they omit it; every other chart keeps the old
    // behaviour, because dropping it would move the plot area of every scatter plot.
    test('are omitted for a line chart', () => {
        const l = layout({ linesShow: true, xTitle: '', yTitle: '' })
        expect(l.xaxis.title).toBeNull()
        expect(l.yaxis.title).toBeNull()
    })

    test('are kept for any other chart', () => {
        const l = layout({ xTitle: '', yTitle: '' })
        expect(l.xaxis.title).not.toBeNull()
        expect(l.xaxis.title.text).toBe('')
        expect(l.yaxis.title).not.toBeNull()
    })

    test('a real title survives either way', () => {
        for (const linesShow of [true, false]) {
            const l = layout({ linesShow, xTitle: 'X', yTitle: 'Y' })
            expect(l.xaxis.title.text).toBe('X')
            expect(l.yaxis.title.text).toBe('Y')
        }
    })
})

describe('axis tick maximum', () => {
    test('is left to the axis when not given', () => {
        const l = layout()
        expect(l.xaxis.nticks).toBeUndefined()
        expect(l.yaxis.nticks).toBeUndefined()
    })

    test('is passed through when given', () => {
        const l = layout({ xAxisTickMaxnum: 6, yAxisTickMaxnum: 4 })
        expect(l.xaxis.nticks).toBe(6)
        expect(l.yaxis.nticks).toBe(4)
    })

    test('is set per axis', () => {
        const l = layout({ yAxisTickMaxnum: 4 })
        expect(l.xaxis.nticks).toBeUndefined()
        expect(l.yaxis.nticks).toBe(4)
    })
})
