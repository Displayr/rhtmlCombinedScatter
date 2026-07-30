const PlotData = require('./PlotData.js')
const DataTypeEnum = require('./utils/DataTypeEnum.js')

// Clicking a marker toggles its label, and the two are joined by the position of the
// marker in the document. plotly draws no marker for a row with a missing coordinate, so
// those rows have to be left out of the mapping. Counting them shifts every marker after
// the first gap onto the wrong row.
const VIEW_BOX = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  labelFontSize: 10,
  labelFontFamily: 'Arial',
  labelFontColor: '#2C2C2C',
  labelLogoScale: null,
}
const LEGEND = {
  pts: [],
  addGroup: () => {},
  setLegendGroupsAndPts: () => {},
}
const LEGEND_SETTINGS = {
  wrap: false,
  wrapNChar: null,
  showBubblesInLegend: () => false,
  zPrefix: '',
  zSuffix: '',
  bubbleSizesAsDiameter: false,
}
const letters = (X) => X.map((v, i) => String.fromCharCode(97 + i))

const makePlotData = (X, Y, group, xDataType = DataTypeEnum.numeric, xLevels = null,
                      bounds = { xmin: 1, xmax: 4, ymin: 10, ymax: 40 }) => new PlotData(
  X, Y,
  null,                                       // Z
  xDataType,                                  // xDataType
  DataTypeEnum.numeric,                       // yDataType
  xLevels, null,                              // xLevels, yLevels
  group,
  letters(X),                                 // label
  letters(X),                                 // originalLabel
  null,                                       // labelAlt
  VIEW_BOX,
  LEGEND,
  null,                                       // bubbleLegend
  ['red'],                                    // colorWheel
  false,                                      // originAlign
  2,                                          // pointRadius
  bounds,
  null,                                       // transparency
  LEGEND_SETTINGS,
  []                                          // hiddenSeries
)

describe('mapping a marker back to its row', function () {
  const g = ['G1', 'G1', 'G1', 'G1']

  it('is one to one when nothing is missing', function () {
    const d = makePlotData([1, 2, 3, 4], [10, 20, 30, 40], g)
    expect(d.markerIndexToDataIndex).toEqual([0, 1, 2, 3])
  })

  it('leaves out a row whose value is missing', function () {
    const d = makePlotData([1, 2, 3, 4], [10, null, 30, 40], g)
    // three markers are drawn, and the second of them is row 2
    expect(d.markerIndexToDataIndex).toEqual([0, 2, 3])
  })

  it('leaves out a row whose coordinate is missing', function () {
    const d = makePlotData([1, null, 3, 4], [10, 20, 30, 40], g)
    expect(d.markerIndexToDataIndex).toEqual([0, 2, 3])
  })

  it('leaves them out group by group, in the order the markers are drawn', function () {
    const d = makePlotData([1, 2, 3, 4], [10, null, 30, 40], ['A', 'B', 'A', 'B'])
    // group A first, rows 0 and 2, then group B, row 3, since row 1 is missing
    expect(d.markerIndexToDataIndex).toEqual([0, 2, 3])
  })

  it('works without a group, which is the ungrouped branch', function () {
    const d = makePlotData([1, 2, 3, 4], [10, null, 30, 40], null)
    expect(d.markerIndexToDataIndex).toEqual([0, 2, 3])
  })

  it('toggles the label of the row the clicked marker belongs to', async function () {
    const d = makePlotData([1, 2, 3, 4], [10, null, 30, 40], g)
    await d.getPtsAndLabs('test')
    // the second marker drawn is row 2, so clicking it hides that label and no other
    d.toggleLabelShowFromMarkerIndex(1)
    expect(d.hiddenLabelsId).toEqual([2])
  })
})

// A line chart takes its x values from the row names of a table, so a category can be
// named anything, including "NA". plotly draws a marker for it like any other category,
// so it has to stay in the mapping. Treating the name as a gap shifted every marker from
// that category onward onto the wrong row.
describe('a category genuinely named "NA"', function () {
  const REGIONS = ['EMEA', 'NA', 'APAC', 'LATAM']
  const SALES = [10, 20, 30, 40]
  const g = ['G1', 'G1', 'G1', 'G1']
  // an ordinal axis places the categories at indices 0..3, so the bounds differ from the
  // numeric cases above
  const categorical = (group) =>
    makePlotData(REGIONS, SALES, group, DataTypeEnum.ordinal, REGIONS,
      { xmin: 0, xmax: 3, ymin: 10, ymax: 40 })

  it('is a drawn point, so it keeps its place in the mapping', function () {
    expect(categorical(g).markerIndexToDataIndex).toEqual([0, 1, 2, 3])
  })

  it('is still in the mapping on the ungrouped branch', function () {
    expect(categorical(null).markerIndexToDataIndex).toEqual([0, 1, 2, 3])
  })

  it('toggles its own label when its marker is clicked', async function () {
    const d = categorical(g)
    await d.getPtsAndLabs('test')
    // the second marker drawn is the "NA" category, which is row 1
    d.toggleLabelShowFromMarkerIndex(1)
    expect(d.hiddenLabelsId).toEqual([1])
  })

  it('shows its name as the coordinate on the label', async function () {
    const d = categorical(g)
    await d.getPtsAndLabs('test')
    expect(d.pts.map(p => p.labelX)).toEqual(REGIONS)
  })
})
