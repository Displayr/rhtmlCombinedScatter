// RS-22478: sanitise scatter labels before they are inserted via .html() into the
// SVG <text> element.
//
// Labels can legitimately carry annotation markup (styled <tspan>s, HTML entities), so
// we can't fall back to .text(). But DOMPurify is an HTML sanitiser and drops bare
// <tspan> (wrong namespace outside <svg>), which would erase annotated labels. So we
// sanitise the label as SVG: wrap it in <svg><text>...</text></svg>, run DOMPurify's SVG
// profile (which keeps <tspan> + inline style and the text, while stripping <script>,
// event-handler attributes, <img>, javascript:, etc.), then extract the sanitised
// <text> contents.
const DOMPurify = require('dompurify')

const TEXT_INNER = /<text[^>]*>([\s\S]*)<\/text>/i

module.exports = function sanitizeLabel (html) {
  const clean = DOMPurify.sanitize('<svg><text>' + html + '</text></svg>', { USE_PROFILES: { svg: true } })
  const match = clean.match(TEXT_INNER)
  return match ? match[1] : ''
}
