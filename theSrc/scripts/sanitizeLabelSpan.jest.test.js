import sanitizeLabel from './sanitizeLabel'

// Labels reach the d3 path as SVG, so callers must emit annotation markup as <tspan
// style='fill:...'>. An HTML <span> is not merely stripped of its styling: the sanitiser
// discards the element and the text inside it, leaving an empty label. flipStandardCharts
// relies on this by passing tspan = TRUE to applyAllAnnotationsToDataLabels.
describe('annotation markup in labels', () => {
    test('keeps tspan styling', () => {
        expect(sanitizeLabel("<tspan style='fill:#00FF00'>4</tspan>"))
            .toBe('<tspan style="fill:#00FF00">4</tspan>')
    })

    test('keeps nested tspan styling alongside plain text', () => {
        expect(sanitizeLabel("<tspan style='fill:#000000;font-family:Impact;'>1.00</tspan>1"))
            .toBe('<tspan style="fill:#000000;font-family:Impact;">1.00</tspan>1')
    })

    test('drops an html span and the text inside it', () => {
        expect(sanitizeLabel("<span style='color:#00FF00'>4</span>")).toBe('')
    })

    test('leaves a plain label untouched', () => {
        expect(sanitizeLabel('42')).toBe('42')
    })

    test('still strips scripts', () => {
        expect(sanitizeLabel('<script>alert(1)</script>42')).not.toContain('alert')
    })
})
