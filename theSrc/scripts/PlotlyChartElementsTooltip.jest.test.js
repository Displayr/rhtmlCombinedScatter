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

// checkD3Format maps the shorthand formats onto spellings for plotly's tickformat, which
// bundles a newer d3-format. d3 3.5.16 either predates those spellings or gives the type no
// default precision, so it applies the parts it understood and spells out the rest.
describe('a format that names no precision', () => {
    test('keeps the thousands separator ",f" asked for while still shortening', () => {
        const data = createPlotlyData(cfg({ X: [1234567.891], Y: [1 / 3], label: ['a'], xFormat: ',f', yFormat: ',f' }))
        expect(tooltips(data)[0]).toBe('a (1,234,567.891, 0.3333)')
    })

    test('keeps SI notation for "s"', () => {
        const data = createPlotlyData(cfg({ X: [1 / 3], Y: [1 / 3], label: ['a'], xFormat: 's', yFormat: 's' }))
        expect(tooltips(data)[0]).toBe('a (333.3m, 333.3m)')
    })

    // "e" is the one shorthand that loses its notation: checkD3Format maps it to "~e", which
    // d3 3.5.16 cannot parse at all, so there is nothing left to apply once the value is
    // shortened. That is what it did before the payload moved to full precision too -- the
    // rounded 0.3333 came out of d3.format('~e') as "0.3333" -- so it is unchanged here, not
    // a regression. Making "e" actually render as exponential is a separate fix.
    test('falls back to plain notation for "e", as it did before', () => {
        const data = createPlotlyData(cfg({ X: [1 / 3], Y: [1 / 3], label: ['a'], xFormat: 'e', yFormat: 'e' }))
        expect(tooltips(data)[0]).toBe('a (0.3333, 0.3333)')
    })
})

// A numeric group with no colour scale is left as numbers by the R side, and plotly puts the
// value straight into the legend entry and, via hoverinfo 'name+text', the hover box too.
describe('a numeric group used as the series name', () => {
    test('is shortened for the legend entry', () => {
        const data = createPlotlyData(cfg({ X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: [1 / 3, 2 / 3] }))
        expect(data.filter(t => t.name !== undefined).map(t => t.name)).toEqual(['0.3333', '0.6667'])
    })

    test('leaves a text group alone', () => {
        const data = createPlotlyData(cfg({ X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: ['G1', 'G2'] }))
        expect(data.filter(t => t.name !== undefined).map(t => t.name)).toEqual(['G1', 'G2'])
    })
})

// legendgroup is the key plotly uses to tie a group's traces together and to toggle them, so
// it has to stay the raw value. Shortening it for display collapsed two distinct groups into
// one entry, and clicking either hid both series along with their borders and annotations.
describe('the legend grouping key', () => {
    const differPastFourDp = { X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: [3.14159, 3.14162] }

    test('stays distinct for groups that differ past four decimal places', () => {
        const data = createPlotlyData(cfg(differPastFourDp)).filter(t => t.name !== undefined)
        expect(new Set(data.map(t => t.legendgroup)).size).toBe(2)
    })

    test('still draws the two groups in different colours', () => {
        const data = createPlotlyData(cfg(differPastFourDp)).filter(t => t.name !== undefined)
        expect(new Set(data.map(t => t.marker && t.marker.color)).size).toBe(2)
    })

    test('ties the border and annotation traces to their own group', () => {
        const data = createPlotlyData(cfg(Object.assign({}, differPastFourDp, {
            pointBorderWidth: 2, pointBorderColor: '#000000',
        })))
        const keys = data.filter(t => t.legendgroup !== undefined).map(t => t.legendgroup)
        // Every trace's key is one of the two group keys, and both groups are represented.
        expect(new Set(keys).size).toBe(2)
    })

    test('is the raw value where the displayed name is shortened', () => {
        const data = createPlotlyData(cfg({ X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: [1 / 3, 2 / 3] }))
            .filter(t => t.name !== undefined)
        expect(data.map(t => t.name)).toEqual(['0.3333', '0.6667'])
        expect(data.map(t => t.legendgroup)).toEqual(['0.3333333333333333', '0.6666666666666666'])
    })

    test('is unchanged for a text group', () => {
        const data = createPlotlyData(cfg({ X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: ['G1', 'G2'] }))
            .filter(t => t.name !== undefined)
        expect(data.map(t => t.legendgroup)).toEqual(['G1', 'G2'])
    })

    test('is unchanged for an ungrouped chart', () => {
        const data = createPlotlyData(cfg({ X: [1, 2], Y: [1, 2], label: ['a', 'b'] }))
            .filter(t => t.name !== undefined)
        expect(data.map(t => t.legendgroup)).toEqual(['Series 1'])
    })
})

// Shortening keeps the legend narrow, but two groups differing only past the cutoff would
// then read identically. A reader cannot act on two entries they cannot tell apart, so the
// shortening is all-or-nothing across the group set.
describe('shortening a numeric group legend', () => {
    const names = (o) => createPlotlyData(cfg(o)).filter(t => t.name !== undefined).map(t => t.name)

    test('applies when every shortened label stays distinct', () => {
        expect(names({ X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: [1 / 3, 2 / 3] })).toEqual(['0.3333', '0.6667'])
    })

    test('is skipped entirely when two labels would collide', () => {
        expect(names({ X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: [3.14159, 3.14162] }))
            .toEqual(['3.14159', '3.14162'])
    })

    test('is skipped for every group, not just the colliding pair', () => {
        // 0.5 would shorten harmlessly, but a legend where some entries are rounded and
        // others are not is harder to read than one that is consistently exact.
        expect(names({ X: [1, 2, 3], Y: [1, 2, 3], label: ['a', 'b', 'c'], group: [3.14159, 3.14162, 0.5] }))
            .toEqual(['3.14159', '3.14162', '0.5'])
    })

    test('applies to a single numeric group', () => {
        expect(names({ X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: [1 / 3, 1 / 3] })).toEqual(['0.3333'])
    })

    test('leaves the grouping key raw either way', () => {
        const collide = createPlotlyData(cfg({ X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: [3.14159, 3.14162] }))
            .filter(t => t.name !== undefined)
        expect(collide.map(t => t.legendgroup)).toEqual(['3.14159', '3.14162'])
    })

    test('does not disturb a text group that happens to look numeric', () => {
        expect(names({ X: [1, 2], Y: [1, 2], label: ['a', 'b'], group: ['3.14159', '3.14162'] }))
            .toEqual(['3.14159', '3.14162'])
    })
})
