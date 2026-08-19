// Replaces theSrc/test/bin/puppeteerLoads.jest.test.js, deleted in this PR. Its ASSERTIONS were
// obsolete -- they checked that `page.waitFor` exists and that puppeteer loads under jest 25 -- but the
// signal it provided was not.
//
// NB rhtmlBuildUtils owns the puppeteer version, deliberately, because that version decides whether the
// image baselines are valid. This repo declares jest and yargs independently of buildUtils' own pins,
// which is the right fix for the hoisting bug described in the PR, but nothing enforces the lockstep. A
// future bump on either side can leave the visual suite running under a jest that buildUtils was never
// tested against -- and that failure is only observable from inside jest, which is exactly how it hid
// last time.
//
// So this keeps the check in the 30 second unit job instead of leaving it to the 90 minute visual one.
// It lives under theSrc/scripts because that is specTestingDirectory, which is where `rhtml testSpecs`
// looks.
const { snapshotTesting: { puppeteer } } = require('rhtmlBuildUtils')

test('puppeteer resolves through rhtmlBuildUtils and is usable from inside jest', () => {
  expect(typeof puppeteer.launch).toBe('function')
})
