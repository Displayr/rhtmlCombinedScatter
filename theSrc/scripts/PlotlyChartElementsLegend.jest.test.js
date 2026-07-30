import { createPlotlyLayout } from './PlotlyChartElements'
import { buildConfig } from './buildConfig'

const base = {
    X: [1, 2, 3],
    Y: [1, 2, 3],
    label: ['a', 'b', 'c'],
}
const cfg = (o) => buildConfig(Object.assign({}, base, o), 600, 400)

// itemsizing: 'constant' makes plotly substitute fixed sizes into the legend swatch
// (line.width -> 5, marker.size -> 12 in the bundled plotly) instead of drawing it from the
// trace's own values. That is wanted for a bubble chart, where the marker sizes are
// meaningful data and would otherwise vary wildly in the legend, but not for a line chart,
// where the legend must mirror the series: a chart specifying marker sizes 1, 2, 3, 4 across
// four series should show four different legend markers, and the swatch line should match
// the series line width rather than plotly's substituted 5px.
describe('legend itemsizing', () => {
    test('is left unset for a line chart, so the legend swatch mirrors the series', () => {
        const config = cfg({ lineShow: true })
        expect(createPlotlyLayout(config, 0, 400).legend.itemsizing).toBeUndefined()
    })

    test('is constant for a non-line chart, so bubble sizes do not vary wildly in the legend', () => {
        const config = cfg({ lineShow: false })
        expect(createPlotlyLayout(config, 0, 400).legend.itemsizing).toBe('constant')
    })

    // The case the setting was introduced for: a bubble chart does not draw joining lines,
    // so it keeps 'constant' under the lineShow gate too.
    test('is constant for a bubble chart', () => {
        const config = cfg({ lineShow: false, Z: [1, 2, 3], pointRadius: 4 })
        expect(createPlotlyLayout(config, 0, 400).legend.itemsizing).toBe('constant')
    })
})
