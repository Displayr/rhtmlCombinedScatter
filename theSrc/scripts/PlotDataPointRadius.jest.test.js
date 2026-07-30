const PlotData = require('./PlotData.js')
const DataTypeEnum = require('./utils/DataTypeEnum.js')
const LegendUtils = require('./utils/LegendUtils.js')

// The line chart passes a radius per point, so that a point whose marker is hidden can
// be given a radius of zero. The label sits a fixed padding above its point's marker,
// so the radius of that one point has to be picked out of the array before it is used
// in arithmetic.
const makePlotData = (pointRadius, Z = null) => new PlotData(
  [1, 2, 3],                                  // X
  [10, 20, 30],                               // Y
  Z,                                          // Z
  DataTypeEnum.numeric,                       // xDataType
  DataTypeEnum.numeric,                       // yDataType
  null,                                       // xLevels
  null,                                       // yLevels
  ['G1', 'G1', 'G1'],                         // group
  ['a', 'b', 'c'],                            // label
  ['a', 'b', 'c'],                            // originalLabel
  null,                                       // labelAlt
  {                                           // vb
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    labelFontSize: 10,
    labelFontFamily: 'Arial',
    labelFontColor: '#2C2C2C',
    labelLogoScale: null,
  },
  {                                           // legend
    pts: [],
    addGroup: () => {},
    setLegendGroupsAndPts: () => {},
  },
  null,                                       // bubbleLegend
  ['red'],                                    // colorWheel
  false,                                      // originAlign
  pointRadius,
  { xmin: 1, xmax: 3, ymin: 10, ymax: 30 },   // bounds
  null,                                       // transparency
  {                                           // legendSettings
    wrap: false,
    wrapNChar: null,
    showBubblesInLegend: () => false,
    zPrefix: '',
    zSuffix: '',
    bubbleSizesAsDiameter: false,
  },
  [],                                         // hiddenSeries
)

// y of the point itself, so the expected label y is this minus radius minus padding
const pointY = (i) => [100, 50, 0][i]
const LABEL_TOP_PADDING = 3

describe('PlotData label placement with a per-point radius:', function () {
  it('offsets each label by the scalar radius when one radius is given', async function () {
    const data = makePlotData(4)
    await data.getPtsAndLabs('test')

    expect(data.lab).toHaveLength(3)
    data.lab.forEach((l, i) => {
      expect(l.y).toBe(pointY(i) - 4 - LABEL_TOP_PADDING)
    })
  })

  it('offsets each label by its own radius when a radius per point is given', async function () {
    const data = makePlotData([4, 0, 10])
    await data.getPtsAndLabs('test')

    expect(data.lab).toHaveLength(3)
    expect(data.lab[0].y).toBe(pointY(0) - 4 - LABEL_TOP_PADDING)
    expect(data.lab[1].y).toBe(pointY(1) - 0 - LABEL_TOP_PADDING)
    expect(data.lab[2].y).toBe(pointY(2) - 10 - LABEL_TOP_PADDING)
  })

  it('gives every label a finite y when a radius per point is given', async function () {
    const data = makePlotData([3, 3, 3])
    await data.getPtsAndLabs('test')

    // A whole array reaching the subtraction makes every label y NaN, which places the
    // labels nowhere and renders the chart with no labels at all.
    data.lab.forEach(l => expect(Number.isFinite(l.y)).toBe(true))
  })

  it('records the radius of the point on the point itself', async function () {
    const data = makePlotData([4, 0, 10])
    await data.getPtsAndLabs('test')

    expect(data.pts.map(p => p.r)).toEqual([4, 0, 10])
  })
})

// A bubbleplot scales the radius by the point's Z instead of using it directly, so the
// radius picked out of the array has to reach that scaling rather than bypass it.
describe('PlotData bubble radius:', function () {
  it('scales a scalar radius by Z, exactly as it did before per-point radii', async function () {
    const data = makePlotData(4, [1, 2, 4])
    await data.getPtsAndLabs('test')

    data.pts.forEach((p, i) => {
      expect(p.r).toBe(LegendUtils.normalizedZtoRadius(4, data.normZ[i]))
    })
    data.pts.forEach(p => expect(Number.isFinite(p.r)).toBe(true))
  })

  it('scales each point by its own radius when a radius per point is given', async function () {
    const radii = [4, 6, 10]
    const data = makePlotData(radii, [1, 2, 4])
    await data.getPtsAndLabs('test')

    data.pts.forEach((p, i) => {
      expect(p.r).toBe(LegendUtils.normalizedZtoRadius(radii[i], data.normZ[i]))
    })
  })

  it('keeps label y finite for bubbles with a radius per point', async function () {
    const data = makePlotData([4, 6, 10], [1, 2, 4])
    await data.getPtsAndLabs('test')

    data.lab.forEach(l => expect(Number.isFinite(l.y)).toBe(true))
  })
})
