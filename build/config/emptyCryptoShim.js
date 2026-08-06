// Stands in for node's `crypto` when esbuild bundles this widget. See the esbuildOptions block in
// widget.config.js for why.
//
// An empty object rather than a throwing module: bignumber.js assigns whatever it gets to its internal
// cryptoObj and only ever reaches for cryptoObj.getRandomValues / cryptoObj.randomBytes inside
// BigNumber.random, which this widget never calls. If some future code did call it, bignumber raises its
// own 'crypto unavailable' error rather than silently producing bad numbers.
module.exports = {}
