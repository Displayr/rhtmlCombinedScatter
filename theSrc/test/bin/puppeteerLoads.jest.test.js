// Guards the puppeteer/jest compatibility that the visual suite depends on.
//
// The project resolves jest 25.5.4, because jest-image-snapshot@3.1.0 caps it
// via peerDependencies { jest: '>=20 <=25' }. Jest 25's resolver predates
// package.json "exports" maps, so a puppeteer new enough to use one loads as
// an object whose launch is undefined -- and every visual test calls
// puppeteer.launch. This must be asserted from inside jest; from plain node
// a modern puppeteer loads fine and the breakage is invisible.
const puppeteer = require('puppeteer')

describe('puppeteer loads under the project jest', () => {
  it('exposes launch', () => {
    expect(typeof puppeteer.launch).toBe('function')
  })

  it('still provides page.waitFor, which rhtmlBuildUtils calls', () => {
    const { Page } = require('puppeteer/lib/cjs/puppeteer/common/Page.js')
    expect(typeof Page.prototype.waitFor).toBe('function')
  })
})
