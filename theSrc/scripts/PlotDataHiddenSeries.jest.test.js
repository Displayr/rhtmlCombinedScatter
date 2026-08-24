const PlotData = require('./PlotData.js')
const DataTypeEnum = require('./utils/DataTypeEnum.js')
const { createPlotlyData } = require('./PlotlyChartElements')
const { buildConfig } = require('./buildConfig')

// Clicking a legend entry hides the plotly trace, but the labels live in a separate
// scatterlabellayer overlay that PlotData draws. LabeledScatter.js builds hiddenSeries from
// the hidden traces and PlotData matches each point's group against it, so the two sides have
// to agree on one form. That form is the trace's legendgroup - the raw group value as a string
// - and deliberately not the legend entry text, which is shortened for display.
const makePlotData = (group, hiddenSeries, wrap = false) => new PlotData(
    [1, 2, 3], [10, 20, 30], null,
    DataTypeEnum.numeric, DataTypeEnum.numeric, null, null,
    group,
    ['a', 'b', 'c'], ['a', 'b', 'c'], null,
    { x: 0, y: 0, width: 100, height: 100, labelFontSize: 10, labelFontFamily: 'Arial', labelFontColor: '#000000', labelLogoScale: null },
    { pts: [], addGroup: () => {}, setLegendGroupsAndPts: () => {} },
    null, ['red'], false, 4,
    { xmin: 1, xmax: 3, ymin: 10, ymax: 30 }, null,
    { wrap: wrap, wrapNChar: wrap ? 20 : null, showBubblesInLegend: () => false, zPrefix: '', zSuffix: '', bubbleSizesAsDiameter: false },
    hiddenSeries,
)

async function hidden (group, hiddenSeries, wrap) {
    const data = makePlotData(group, hiddenSeries, wrap)
    await data.getPtsAndLabs('test')
    return data.lab.map(l => l.hidePointAndLabel)
}

// The keys LabeledScatter would collect if the last group's traces were hidden.
function legendGroupsFor (group) {
    const data = createPlotlyData(buildConfig({ X: [1, 2, 3], Y: [1, 2, 3], label: ['a', 'b', 'c'], group: group }, 600, 400))
    const last = group[group.length - 1]
    return data.filter(t => t.legendgroup !== undefined && t.legendgroup === '' + last).map(t => t.legendgroup)
}

describe('hiding a series from the legend', () => {
    test('hides the labels of a text group', async () => {
        expect(await hidden(['G1', 'G1', 'G2'], ['G2'])).toEqual([false, false, true])
    })

    test('hides the labels of an integer group', async () => {
        expect(await hidden([1, 1, 2], ['2'])).toEqual([false, false, true])
    })

    test('hides the labels of a numeric group whose legend entry was shortened', async () => {
        expect(await hidden([1 / 3, 1 / 3, 2 / 3], ['0.6666666666666666'])).toEqual([false, false, true])
    })

    test('hides the labels of a group whose label fell back to full precision', async () => {
        expect(await hidden([3.14159, 3.14159, 3.14162], ['3.14162'])).toEqual([false, false, true])
    })

    test('leaves everything drawn when nothing is hidden', async () => {
        expect(await hidden([1, 1, 2], [])).toEqual([false, false, false])
    })

    // legendgroup is not wrapped, so neither side of the comparison is.
    test('hides a wrapped text group', async () => {
        expect(await hidden(['G1', 'G1', 'G2'], ['G2'], true)).toEqual([false, false, true])
    })

    // The display label is 0.6667 while the key is the raw value; matching on the label would
    // be matching on something that rounding can change.
    test('does not match on the shortened legend entry text', async () => {
        expect(await hidden([1 / 3, 1 / 3, 2 / 3], ['0.6667'])).toEqual([false, false, false])
    })
})

// Guards the contract across the module boundary: whatever createPlotlyData puts in
// legendgroup is what PlotData has to recognise.
describe('the keys createPlotlyData produces', () => {
    test.each([
        ['a text group', ['G1', 'G1', 'G2']],
        ['an integer group', [1, 1, 2]],
        ['a shortened numeric group', [1 / 3, 1 / 3, 2 / 3]],
        ['a group that fell back to full precision', [3.14159, 3.14159, 3.14162]],
    ])('are the ones PlotData hides on, for %s', async (_name, group) => {
        const keys = legendGroupsFor(group)
        expect(keys.length).toBeGreaterThan(0)
        expect(await hidden(group, keys)).toEqual([false, false, true])
    })
})
