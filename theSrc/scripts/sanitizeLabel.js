// RS-22478: sanitise scatter labels before they are inserted via .html() into the
// SVG <text> element.
//
// Labels can legitimately carry annotation markup (styled <tspan>s, HTML entities), so
// we can't fall back to .text(). But DOMPurify is an HTML sanitiser and drops bare
// <tspan> (wrong namespace outside <svg>), which would erase annotated labels. So we
// sanitise the label as SVG: wrap it in <svg><text>...</text></svg>, run DOMPurify's SVG
// profile (which keeps <tspan> + inline style and the text, while stripping <script>,
// event-handler attributes, <img>, javascript:, etc.), then read the sanitised <text>
// element's contents straight off the returned DOM. We read the DOM node rather than
// regex-extracting from the serialised string: DOMPurify's safety guarantee is for the whole
// output, and a greedy regex would, on a `</text><text>` breakout, capture across the
// injected element boundary and re-emit malformed nested SVG.
const DOMPurify = require('dompurify')

module.exports = function sanitizeLabel (html) {
  const dom = DOMPurify.sanitize('<svg><text>' + html + '</text></svg>', {
    USE_PROFILES: { svg: true },
    RETURN_DOM: true,
  })
  const text = dom.querySelector('text')
  return text ? text.innerHTML : ''
}
