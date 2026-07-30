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
// meaningful data and would otherwise vary wildly in the legend, but not otherwise: a line
// chart with a 1px series line should not get a 5px legend line.
describe('legend itemsizing', () => {
    test('is constant when Z is supplied, so bubble sizes do not vary wildly in the legend', () => {
        const config = cfg({ Z: [1, 2, 3], pointRadius: 4 })
        expect(createPlotlyLayout(config, 0, 400).legend.itemsizing).toBe('constant')
    })

    test('is left unset when Z is not supplied, so the legend swatch mirrors the trace', () => {
        const config = cfg()
        expect(createPlotlyLayout(config, 0, 400).legend.itemsizing).toBeUndefined()
    })
})
