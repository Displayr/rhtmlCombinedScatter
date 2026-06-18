const sanitizeLabel = require('./sanitizeLabel')

describe('sanitizeLabel (RS-22478)', () => {
  test('preserves annotation markup: styled <tspan> and entities', () => {
    const out = sanitizeLabel('<tspan style="fill:red">A</tspan>&amp;B')
    expect(out).toContain('<tspan')
    expect(out).toContain('fill:red')
    expect(out).toContain('A')
    expect(out).toContain('B')
  })

  test('strips script, img and event-handler attributes', () => {
    const out = sanitizeLabel('<tspan onclick="evil()">a</tspan><script>alert(1)</script><img src=x onerror=hack()>')
    expect(out).toContain('a')
    expect(out).not.toContain('script')
    expect(out).not.toContain('onclick')
    expect(out).not.toContain('onerror')
    expect(out).not.toContain('<img')
  })

  test('passes plain text through unchanged', () => {
    expect(sanitizeLabel('Just a label')).toBe('Just a label')
  })

  // Review comment 3432585031: a label containing a literal </text><text> previously made the
  // greedy regex capture from the first <text> to the last </text>, pulling the intermediate
  // </text><text> markup back into the live node and producing malformed nested SVG. Reading the
  // <text> element's innerHTML via the DOM must not leak that markup.
  test('a </text><text> breakout does not leak nested-element markup', () => {
    const out = sanitizeLabel('foo</text><text>bar')
    expect(out).not.toContain('</text>')
    expect(out).not.toContain('<text')
  })
})
