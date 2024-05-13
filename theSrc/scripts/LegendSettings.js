import autoBind from 'es6-autobind'
import _ from 'lodash'

class LegendSettings {
  constructor (config) {
    autoBind(this)
    this.show = config.legendShow
    this.showBubbles = config.legendBubblesShow
    this.font = {
      family: config.legendFontFamily,
      size: config.legendFontSize,
      color: config.legendFontColor,
    }
    this.bubble = {
      font: {
        family: _.isString(config.legendBubbleFontFamily) ? config.legendBubbleFontFamily : config.legendFontFamily,
        size: _.isNumber(config.legendBubbleFontSize) ? config.legendBubbleFontSize : config.legendFontSize,
        color: _.isString(config.legendBubbleFontColor) ? config.legendBubbleFontColor : config.legendFontColor,
      },
      titleFont: {
        family: _.isString(config.legendBubbleTitleFontFamily) ? config.legendBubbleTitleFontFamily : config.legendFontFamily,
        size: _.isNumber(config.legendBubbleTitleFontSize) ? config.legendBubbleTitleFontSize : config.legendFontSize,
        color: _.isString(config.legendBubbleTitleFontColor) ? config.legendBubbleTitleFontColor : config.legendFontColor,
      },
    }
    this.title = config.zTitle
    this.zPrefix = config.zPrefix
    this.zSuffix = config.zSuffix
    this.wrap = config.legendWrap
    this.wrapNChar = config.legendWrapNChar
  }

  showLegend () { return this.show }
  hasTitleText () { return this.title !== '' }
  getTitle () { return this.title }
  showBubblesInLegend () { return this.showBubbles }
  getFontFamily () { return this.font.family }
  getFontSize () { return this.font.size }
  getFontColor () { return this.font.color }
  getBubbleFontFamily () { return this.bubble.font.family }
  getBubbleFontSize () { return this.bubble.font.size }
  getBubbleFontColor () { return this.bubble.font.color }
  getBubbleTitleFontFamily () { return this.bubble.titleFont.family }
  getBubbleTitleFontSize () { return this.bubble.titleFont.size }
  getBubbleTitleFontColor () { return this.bubble.titleFont.color }
}

module.exports = LegendSettings
