const PlotData = require('./PlotData.js')
const DataTypeEnum = require('./utils/DataTypeEnum.js')

// A line chart can colour its data labels by series, so the label colour arrives as one
// value per point, expanded from the per-series values the same way pointRadius is. A
// single value still colours every label, as it always has.
const makePlotData = (labelFontColor, group = ['G1', 'G1', 'G2']) => new PlotData(
  [1, 2, 3],                                  // X
  [10, 20, 30],                               // Y
  null,                                       // Z
  DataTypeEnum.numeric,                       // xDataType
  DataTypeEnum.numeric,                       // yDataType
  null,                                       // xLevels
  null,                                       // yLevels
  group,                                      // group
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
    labelFontColor: labelFontColor,
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
  4,                                          // pointRadius
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

describe('PlotData data label colour:', function () {
  it('colours every label the same when one colour is given', async function () {
    const data = makePlotData('#123456')
    await data.getPtsAndLabs('test')

    expect(data.lab.map(l => l.color)).toEqual(['#123456', '#123456', '#123456'])
  })

  it('gives each label its own colour when one colour per point is given', async function () {
    const data = makePlotData(['#FF0000', '#FF0000', '#00AA00'])
    await data.getPtsAndLabs('test')

    expect(data.lab.map(l => l.color)).toEqual(['#FF0000', '#FF0000', '#00AA00'])
  })

  it('recycles a colour array shorter than the data', async function () {
    const data = makePlotData(['#FF0000', '#00AA00'])
    await data.getPtsAndLabs('test')

    expect(data.lab.map(l => l.color)).toEqual(['#FF0000', '#00AA00', '#FF0000'])
  })

  it('falls back to the series colour when no colour is given', async function () {
    // How automatic colouring reaches the widget: nothing is sent, and each label takes
    // the colour of its own point
    const data = makePlotData(null)
    await data.getPtsAndLabs('test')

    expect(data.lab.map(l => l.color)).toEqual(['red', 'red', 'red'])
  })
})

// The config merge replaces a scalar default with whatever the caller supplied, so unlike
// the per-group arrays this one needs no special handling to survive it. Pinned here
// because the per-point form only works if it arrives intact.
const { buildConfig } = require('./buildConfig')

describe('buildConfig data label colour:', function () {
  const base = { X: [1, 2, 3], Y: [1, 2, 3], label: ['a', 'b', 'c'] }

  it('keeps a colour per point', function () {
    const config = buildConfig(Object.assign({}, base,
      { labelsFontColor: ['#FF0000', '#FF0000', '#00AA00'] }), 600, 400)
    expect(config.labelsFontColor).toEqual(['#FF0000', '#FF0000', '#00AA00'])
  })

  it('keeps a single colour', function () {
    const config = buildConfig(Object.assign({}, base, { labelsFontColor: '#123456' }), 600, 400)
    expect(config.labelsFontColor).toBe('#123456')
  })

  it('falls back to its default when none is given', function () {
    const config = buildConfig(Object.assign({}, base), 600, 400)
    expect(config.labelsFontColor).toBe('#2C2C2C')
  })
})

// The panelled chart draws its labels as plotly annotations rather than through PlotData, so
// the same value has to be read the same way there. Utils.labelColorAt is what both use.
const Utils = require('./utils/Utils')

describe('Utils.labelColorAt:', function () {
  it('returns the colour for that point when given one per point', function () {
    expect(Utils.labelColorAt(['#FF0000', '#00AA00', '#0000FF'], 1)).toBe('#00AA00')
  })

  it('returns the single colour whatever the point', function () {
    expect(Utils.labelColorAt('#123456', 2)).toBe('#123456')
  })

  it('recycles an array shorter than the data', function () {
    expect(Utils.labelColorAt(['#FF0000', '#00AA00'], 2)).toBe('#FF0000')
  })

  it('returns null when nothing was supplied, so the caller can fall back', function () {
    expect(Utils.labelColorAt(null, 0)).toBeNull()
    expect(Utils.labelColorAt('', 0)).toBeNull()
    expect(Utils.labelColorAt([], 0)).toBeNull()
  })
})
