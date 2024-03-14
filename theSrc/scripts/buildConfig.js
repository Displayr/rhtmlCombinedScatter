import Utils from './utils/Utils'
import DataTypeEnum from './utils/DataTypeEnum'
import LegendUtils from './utils/LegendUtils'
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
  xAxisLineWidth: 1,
  // plotly has not option to show axis line with dashes
  xAxisTickColor: '#EEEEEE',
  xAxisTickLength: 5,
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
  yAxisLineWidth: 1,
  yAxisTickColor: '#EEEEEE',
  yAxisTickLength: 5,
  yAxisZeroLineColor: '#000000',
  yAxisZeroLineDash: 'dot',
  yAxisZeroLineWidth: 1,
  colors: ['#5B9BD5', '#ED7D31', '#A5A5A5', '#1EC000', '#4472C4', '#70AD47', '#255E91', '#9E480E', '#636363', '#997300', '#264478', '#43682B', '#FF2323'],
  debugMode: false,
  fixedAspectRatio: false,
  footer: '',
  footerFontColor: '#2C2C2C',
  footerFontFamily: 'Arial',
  footerFontSize: 10,
  grid: true,
  group: null,
  label: null,
  labelAlt: [],
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
  legendBubbleTitleFontColor: '#2C2C2C',
  legendBubbleTitleFontFamily: 'Arial',
  legendBubbleTitleFontSize: 12,
  legendFontColor: '#2C2C2C',
  legendFontFamily: 'Arial',
  legendFontSize: 12,
  legendShow: true,
  marginTop: null,
  marginBottom: null,
  marginRight: null,
  marginLeft: null,
  origin: true,
  originAlign: false,
  backgroundColor: 'transparent',
  plotAreaBackgroundColor: 'transparent',
  plotBorderShow: true,
  pointRadius: null, // if Z then 4 else 2 (applied below)
  pointBorderColor: '#000000',
  pointBorderWidth: 0,
  showLabels: true,
  showResetButton: true,
  showXAxis: true,
  showYAxis: true,
  subtitle: '',
  subtitleFontColor: '#2C2C2C',
  subtitleFontFamily: 'Arial',
  subtitleFontSize: 12,
  title: '',
  titleFontColor: '#2C2C2C',
  titleFontFamily: 'Arial',
  titleFontSize: 16,
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
  xDecimals: null,
  xFormat: null,
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
  yDecimals: null,
  yFormat: null,
  yIsDateTime: null, // NB computed in R
  yLevels: null,
  yPrefix: '',
  ySuffix: '',
  yTitle: '',
  yTitleFontColor: '#2C2C2C',
  yTitleFontFamily: 'Arial',
  yTitleFontSize: 12,
  zDecimals: null,
  zPrefix: '',
  zSuffix: '',
  zTitle: '',
}

function buildConfig (userConfig, width, height) {
  const config = _.merge({}, defaultConfig, userConfig, { width, height })

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

  // Normalize bubble sizes to compute diameter in pixels
  config.normZ = null
  if (Array.isArray(config.Z)) {
    const maxZ = _.max(config.Z)
    config.normZ = LegendUtils.normalizeZValues(config.Z, maxZ)
        .map(z => 2 * LegendUtils.normalizedZtoRadius(config.pointRadius, z))
  }
  return config
}

module.exports = {
  buildConfig,
  defaultConfig: _.cloneDeep(defaultConfig),
}
