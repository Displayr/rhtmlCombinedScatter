import Utils from './utils/Utils'
import DataTypeEnum from './utils/DataTypeEnum'
import LegendUtils from './utils/LegendUtils'
import { wrapByNumberOfCharacters } from './PlotlyChartElements'
const _ = require('lodash')

// TODO all of the margin config params below can probably be removed
const defaultConfig = {
  axisFontColor: '#000000',
  axisFontFamily: 'Arial',
  axisFontSize: 12,
  xAxisFontColor: null,
  xAxisFontFamily: null,
  xAxisFontSize: null,
  xAxisGridColor: '#EEEEEE',
  xAxisGridDash: 'solid',
  xAxisGridWidth: 1,
  xAxisLineColor: '#000000',
  xAxisLineWidth: 0,
  // plotly has not option to show axis line with dashes
  xAxisTickColor: '#EEEEEE',
  xAxisTickLength: 5,
  xAxisLabelWrap: null,
  xAxisLabelWrapNChar: null,
  xAxisTickAngle: null,
  xAxisZeroLineColor: '#000000',
  xAxisZeroLineDash: 'dot',
  xAxisZeroLineWidth: 1,
  yAxisFontColor: null,
  yAxisFontFamily: null,
  yAxisFontSize: null,
  yAxisGridColor: '#EEEEEE',
  yAxisGridDash: 'solid',
  yAxisGridWidth: 1,
  yAxisLineColor: '#000000',
  yAxisLineWidth: 0,
  yAxisTickColor: '#EEEEEE',
  yAxisTickLength: 5,
  yAxisZeroLineColor: '#000000',
  yAxisZeroLineDash: 'dot',
  yAxisZeroLineWidth: 1,
  bubbleSizesAsDiameter: false,
  // The colorScale differs from the colors in that the colors supplied
  // should be regularly spaced and in ascending order.
  // We expect that R wrapper function will ensure the colorScale
  // matches the colors (which is still used for the labels)
  colorScale: null,
  colorScaleShow: true,
  colorScaleTitle: null,
  colorScaleTitleFontColor: '#2C2C2C',
  colorScaleTitleFontFamily: 'Arial',
  colorScaleTitleFontSize: 12,
  colorLevels: null,
  colorIsDateTime: false,
  colorScaleFormat: null,
  colors: ['#5B9BD5', '#ED7D31', '#A5A5A5', '#1EC000', '#4472C4', '#70AD47', '#255E91', '#9E480E', '#636363', '#997300', '#264478', '#43682B', '#FF2323'],
  debugMode: false,
  fitX: null,
  fitY: null,
  fitGroup: null,
  fitPanel: null,
  fitLowerBound: null,
  fitUpperBound: null,
  fitLineColors: null,
  fitLineType: 'solid',
  fitLineWidth: 2,
  fitLineOpacity: 1,
  fitLineNames: null,
  fitCIColors: null,
  fitCILabelColors: null,
  fixedAspectRatio: false,
  footer: '',
  footerFontColor: '#2C2C2C',
  footerFontFamily: 'Arial',
  footerFontSize: 10,
  grid: true,
  group: null,
  label: null,
  labelAlt: null,
  labelAutoPlacement: true,
  labelPlacementWeightDistance: 10,
  labelPlacementWeightDistanceMultiplierCenteredAboveAnchor: 1,
  labelPlacementWeightDistanceMultiplierCenteredUnderneathAnchor: 1.5,
  labelPlacementWeightDistanceMultiplierBesideAnchor: 4,
  labelPlacementWeightDistanceMultiplierDiagonalOfAnchor: 15,
  labelPlacementWeightLabelAnchorOverlap: 8,
  labelPlacementWeightLabelLabelOverlap: 12,
  labelPlacementMaxAngle: 2 * Math.PI,
  labelPlacementMaxMove: 5,
  labelPlacementNumSweeps: 500,
  labelPlacementTemperatureInitial: 0.01,
  labelPlacementTemperatureFinal: 0.0001,
  labelPlacementSeed: 1,
  labelsFontColor: '#2C2C2C',
  labelsFontFamily: 'Arial',
  labelsFontSize: 10,
  labelsLogoScale: [],
  labelsMaxShown: null,
  legendBubbleFontColor: '#2C2C2C',
  legendBubbleFontFamily: 'Arial',
  legendBubbleFontSize: 10,
  legendBubblesShow: true,
  legendBubbleTitleWrap: null,
  legendBubbleTitleWrapNChar: null,
  legendBubbleTitleFontColor: '#2C2C2C',
  legendBubbleTitleFontFamily: 'Arial',
  legendBubbleTitleFontSize: 12,
  legendFontColor: '#2C2C2C',
  legendFontFamily: 'Arial',
  legendFontSize: 12,
  legendShow: 'Automatic',
  legendOrientation: 'Vertical',
  legendTitle: null,
  legendTitleWrap: null,
  legendTitleWrapNChar: null,
  legendTitleFontColor: '#2C2C2C',
  legendTitleFontFamily: 'Arial',
  legendTitleFontSize: 12,
  legendX: null,
  legendY: null,
  legendXAnchor: null,
  legendYAnchor: null,
  legendWrap: null,
  legendWrapNChar: null,
  marginTop: null,
  marginBottom: null,
  marginRight: null,
  marginLeft: null,
  marginAutoexpand: true,
  markerAnnotations: null,
  preLabelAnnotations: null,
  postLabelAnnotations: null,
  origin: true,
  originAlign: false,
  backgroundColor: 'transparent',
  panels: null,
  panelLabels: null,
  panelTitleFontColor: '#2C2C2C',
  panelTitleFontFamily: 'Arial',
  panelTitleFontSize: 12,
  panelNumRows: 2,
  panelShareAxes: true,
  panelXGap: 0.2,
  panelYGap: 0.3,
  plotAreaBackgroundColor: 'transparent',
  plotBorderShow: true,
  plotBorderWidth: 1,
  plotBorderColor: '#000000',
  pointRadius: null, // if Z then 4 else 2 (applied below)
  pointBorderColor: null,
  pointBorderWidth: null,
  showLabels: true,
  showResetButton: true,
  showXAxis: true,
  showYAxis: true,
  subtitle: '',
  subtitleFontColor: '#2C2C2C',
  subtitleFontFamily: 'Arial',
  subtitleFontSize: 12,
  subtitleAlignment: 'Center of plot area',
  title: '',
  titleFontColor: '#2C2C2C',
  titleFontFamily: 'Arial',
  titleFontSize: 16,
  titleAlignment: 'Center of plot area',
  tooltipFontColor: '#2C2C2C',
  tooltipFontFamily: 'Arial',
  tooltipFontSize: 10,
  tooltipText: [],
  transparency: null, // TODO rename to color transparency
  trendLines: false,
  trendLinesLineThickness: 1,
  trendLinesPointSize: 2,
  xBoundsMaximum: null,
  xBoundsMinimum: null,
  xBoundsUnitsMajor: null,
  xFormat: null,
  xTooltipFormat: null,
  xIsDateTime: null, // NB computed in R
  xLevels: null,
  xPrefix: '',
  xSuffix: '',
  xTitle: '',
  xTitleFontColor: '#2C2C2C',
  xTitleFontFamily: 'Arial',
  xTitleFontSize: 12,
  yBoundsMaximum: null,
  yBoundsMinimum: null,
  yBoundsUnitsMajor: null,
  yFormat: null,
  yTooltipFormat: null,
  yIsDateTime: null, // NB computed in R
  yLevels: null,
  yPrefix: '',
  ySuffix: '',
  yTitle: '',
  yTitleFontColor: '#2C2C2C',
  yTitleFontFamily: 'Arial',
  yTitleFontSize: 12,
  zPrefix: '',
  zSuffix: '',
  zTitle: '',
}

function buildConfig (userConfig, width, height) {
  const config = _.merge({}, defaultConfig, userConfig, { width, height })

  // If there are less colors in userConfig than defaultConfig,
  // _.merge will take some colors from defaultConfig, which is not what we want, hence the code below.
  if (userConfig.colors) {
    config.colors = userConfig.colors
  }

  if (_.isNull(config.pointRadius)) {
    config.pointRadius = (_.isArray(config.Z) && config.Z.length)
      ? 4 : 2
  }

  if (config.xAxisFontColor === null) { config.xAxisFontColor = config.axisFontColor }
  if (config.xAxisFontFamily === null) { config.xAxisFontFamily = config.axisFontFamily }
  if (config.xAxisFontSize === null) { config.xAxisFontSize = config.axisFontSize }
  if (config.yAxisFontColor === null) { config.yAxisFontColor = config.axisFontColor }
  if (config.yAxisFontFamily === null) { config.yAxisFontFamily = config.axisFontFamily }
  if (config.yAxisFontSize === null) { config.yAxisFontSize = config.axisFontSize }

  if (config.titleFontSize === 0) { config.title = '' }
  if (config.subtitleFontSize === 0) { config.subtitle = '' }
  if (config.xTitleFontSize === 0) { config.xTitle = '' }
  if (config.yTitleFontSize === 0) { config.yTitle = '' }
  if (config.colorScaleTitleFontSize === 0) { config.colorScaleTitle = '' }
  if (config.legendTitleFontSize === 0) { config.legendTitle = '' }
  if (config.legendFontSize === 0) { config.legendFontSize = 1 }
  if (config.labelsFontSize === 0 && config.panels !== null) { config.label = null }

  if (config.xIsDateTime) {
    config.X = _.map(config.X, (d) => new Date(d))
    config.xDataType = DataTypeEnum.date
    config.xLevels = null
  } else if (Utils.isArrOfNumTypes(config.X)) {
    config.xDataType = DataTypeEnum.numeric
    config.xLevels = null
  } else {
    config.xDataType = DataTypeEnum.ordinal
    config.xLevels = _.isNull(config.xLevels) ? _.uniq(config.X) : config.xLevels
  }

  if (config.yIsDateTime) {
    config.yDataType = DataTypeEnum.date
    config.Y = _.map(config.Y, (d) => new Date(d))
    config.yLevels = null
  } else if (Utils.isArrOfNumTypes(config.Y)) {
    config.yDataType = DataTypeEnum.numeric
    config.yLevels = null
  } else {
    config.yDataType = DataTypeEnum.ordinal
    config.yLevels = _.isNull(config.yLevels) ? _(config.Y).uniq().value() : config.yLevels
  }

  if (config.colorIsDateTime) config.group = _.map(config.group, (d) => new Date(d))

  // Normalize bubble sizes to compute diameter in pixels
  config.normZ = null
  if (Array.isArray(config.Z)) {
    const z = config.bubbleSizesAsDiameter ? config.Z.map(v => v * v) : config.Z
    const maxZ = _.max(z)
    config.normZ = LegendUtils.normalizeZValues(z, maxZ)
        .map(z => 2 * LegendUtils.normalizedZtoRadius(config.pointRadius, z))
  }

  if (config.zTitle) {
    if (config.legendBubbleTitleWrap && config.legendBubbleTitleWrapNChar) {
      config.legendBubbleTitle = wrapByNumberOfCharacters(config.zTitle, config.legendBubbleTitleWrapNChar).split('<br>')
    } else {
      config.legendBubbleTitle = [ config.zTitle ]
    }
  } else {
      config.legendBubbleTitle = null
  }

  if (config.fitX && config.fitY) {
    if (config.fitLineNames === null) config.fitLineNames = ['']
    if (config.fitGroup === null) config.fitGroup = config.fitLineNames
    if (config.fitPanel === null) config.fitPanel = Array(config.fitGroup.length).fill(0)
  }
  return config
}

module.exports = {
  buildConfig,
  defaultConfig: _.cloneDeep(defaultConfig),
}
