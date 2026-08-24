import { createPlotlyData } from './PlotlyChartElements'
import { buildConfig } from './buildConfig'

// The payload now reaches the widget at full precision (see toJsonOrNull in
// theSrc/R/htmlwidget.R). Values that are rendered as text with no format requested used
// to arrive already shortened by jsonlite's four decimal places, so the "no format" case
// has to do that shortening itself or the hover text reads 0.333333333333333.
const base = {
    X: [1, 2, 3],
    Y: [1, 2, 3],
    label: ['a', 'b', 'c'],
}
const cfg = (o) => buildConfig(Object.assign({}, base, o), 600, 400)

// The generated hover text for each point, in point order. Traces that draw no hover text
// (the base trace, borders, annotations, legend proxies) carry no text array.
function tooltips (data) {
    return data.filter(t => Array.isArray(t.text)).flatMap(t => t.text)
}

describe('unformatted numbers in the hover text', () => {
    test('are shortened to four decimal places', () => {
        const data = createPlotlyData(cfg({ X: [1 / 3], Y: [2 / 3], label: ['a'] }))
        expect(tooltips(data)[0]).toBe('a (0.3333, 0.6667)')
    })

    test('drop trailing zeros rather than padding to four places', () => {
        const data = createPlotlyData(cfg({ X: [1.521035], Y: [2.5], label: ['a'] }))
        expect(tooltips(data)[0]).toBe('a (1.521, 2.5)')
    })

    test('keep the whole integer part of a large number', () => {
        const data = createPlotlyData(cfg({ X: [1234567.891], Y: [1e20], label: ['a'] }))
        expect(tooltips(data)[0]).toBe('a (1234567.891, 100000000000000000000)')
    })

    // Four decimal places would report a real measurement as 0, which is the failure this
    // PR is about; below that cutoff the value falls back to four significant digits.
    test('fall back to significant digits when four decimal places would read as zero', () => {
        const data = createPlotlyData(cfg({ X: [0.000012345678], Y: [-0.000012345678], label: ['a'] }))
        expect(tooltips(data)[0]).toBe('a (0.00001235, -0.00001235)')
    })

    test('leave zero alone', () => {
        const data = createPlotlyData(cfg({ X: [0], Y: [0], label: ['a'] }))
        expect(tooltips(data)[0]).toBe('a (0, 0)')
    })

    test('shorten the bubble size, which has no format of its own', () => {
        const data = createPlotlyData(cfg({ X: [1], Y: [1], Z: [1 / 3], label: ['a'], zTitle: 'Size' }))
        expect(tooltips(data)[0]).toBe('a (1, 1)<br>Size: 0.3333')
    })

    test('shorten the value on a numeric colour scale', () => {
        const data = createPlotlyData(cfg({
            X: [1, 2],
            Y: [1, 2],
            label: ['a', 'b'],
            group: [1 / 3, 2 / 3],
            colorScale: ['#0000ff', '#ff0000'],
        }))
        expect(tooltips(data)[0]).toBe('a (1, 1)<br>0.3333')
    })
})

describe('a requested format', () => {
    test('is still honoured instead of the default shortening', () => {
        const data = createPlotlyData(cfg({ X: [1 / 3], Y: [2 / 3], label: ['a'], xFormat: '.1%', yFormat: '.6f' }))
        expect(tooltips(data)[0]).toBe('a (33.3%, 0.666667)')
    })

    test('is still honoured when given only for the hover text', () => {
        const data = createPlotlyData(cfg({ X: [1 / 3], Y: [2 / 3], label: ['a'], xTooltipFormat: '.2f' }))
        expect(tooltips(data)[0]).toBe('a (0.33, 0.6667)')
    })
})
