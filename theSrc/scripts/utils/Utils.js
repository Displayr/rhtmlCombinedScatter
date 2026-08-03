import _ from 'lodash'
import d3 from 'd3'
import BigNumber from 'bignumber.js'

class Utils {
  // The data label colour for one point. It arrives either as a single colour for every
  // label or as one per point, where a line chart colours its labels by series, and a
  // shorter array is recycled. Returns null when nothing was supplied, so each caller can
  // apply its own fallback: the labels are drawn in two places, by PlotData for an ordinary
  // chart and as plotly annotations for a panelled one, and both have to read it alike.
  static labelColorAt (label_font_color, index) {
    if (label_font_color == null || label_font_color === '') return null
    if (!Array.isArray(label_font_color)) return label_font_color
    if (label_font_color.length === 0) return null
    return label_font_color[index % label_font_color.length]
  }

  static isNum (num) {
    return !(_.isNull(num)) && _.isNumber(num)
  }

  static isArr (arr) {
    return !(_.isNull(arr)) && _.isArray(arr)
  }

  static isArrOfNums (arr) {
    return this.isArr(arr) && _.every(arr, n => _.isFinite(Number(n)))
  }

  static isArrOfNumTypes (arr) {
    return this.isArr(arr) && _.every(arr, n => typeof n === 'number')
  }

  // A gap in the data. Only X, Y and Z can carry one, and all three are serialised with
  // na = "null", so a gap always arrives as the JSON null literal. The strings 'NA' and
  // 'NaN' are deliberately not treated as gaps: they are indistinguishable from a category
  // genuinely named that way, and reading one as a gap drops a drawn point from the marker
  // index and blanks its coordinate in the label.
  static isMissingValue (v) {
    return v === null || v === undefined || (typeof v === 'number' && isNaN(v))
  }

  // A numeric series with gaps in it is still numeric. Used to classify the axes, where
  // treating a gap as evidence of a categorical axis would put the values on an ordinal
  // axis in whatever order they happened to appear.
  static isArrOfNumTypesIgnoringMissing (arr) {
    if (!this.isArr(arr)) return false
    const present = _.reject(arr, v => this.isMissingValue(v))
    return present.length > 0 && _.every(present, n => typeof n === 'number')
  }

  static isArrOfPositiveNums (arr) {
    return this.isArr(arr) && _.every(arr, n => _.isFinite(n) && n >= 0)
  }

  static isArrOfStrings (arr) {
    return this.isArr(arr) && _.every(arr, n => _.isString(n))
  }

  static getSuperscript (id) {
    const superscript = [8304, 185, 178, 179, 8308, 8309, 8310, 8311, 8312, 8313] // '⁰¹²³⁴⁵⁶⁷⁸⁹'
    let ss = ''
    while (id > 0) {
      const digit = id % 10
      ss = String.fromCharCode(superscript[id % 10]) + ss
      id = (id - digit) / 10
    }
    return ss
  }

  static getFormattedNum (num, decimals, prefix = '', suffix = '') {
    if (isNaN(Number(num))) {
      return prefix + num + suffix
    }
    // Note that BigNumber can have a max of 15 decimals
    const numToDisplay = _.isNull(decimals) ? this.formatToSignificantDecimals(Number(num)) : (new BigNumber(num)).toFormat(decimals)
    return prefix + numToDisplay + suffix
  }

  // When sigificant_decimals = 2, 1 -> "1", 1.123 -> "1.12", 0.00123 -> "0.0012"
  static formatToSignificantDecimals (num, sigificant_decimals = 2) {
    const is_integer = num === Math.floor(num)
    if (is_integer) {
      return (new BigNumber(num)).toFormat(0)
    }
    const log_magnitude = Math.floor(Math.log10(Math.abs(num)))
    const decimals = log_magnitude >= 0 ? sigificant_decimals : -log_magnitude - 1 + sigificant_decimals
    return (new BigNumber(num)).toFormat(decimals)
  }

  static getExponentOfNum (num) {
    const numExponentialForm = num.toExponential()
    const exponent = _.toNumber(_.last(numExponentialForm.split('e')))
    return exponent
  }

  static euclideanDistance (point1, point2) {
    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2)
  }

  static addTopBottomLeftRight (rect) {
    rect.left = rect.x
    rect.top = rect.y
    rect.right = rect.x + rect.width
    rect.bottom = rect.y + rect.height
    return rect
  }

  static textSize (text, element, font_family, font_size) {
    const span = d3.select(element).append('span')
    span.text(text)
    span.style('font-family', font_family)
    span.style('font-size', `${font_size}px`)
    const size = { width: span[0][0].offsetWidth, height: span[0][0].offsetHeight }
    span.remove()
    return size
  }

  static addOpacity (color, opacity) {
    if (this.isRgb(color) && opacity !== null) {
      color = `${color.substring(0, color.length - 1)},${opacity})`
    }
    if (this.isHexColorWithoutOpacity(color) && opacity !== null) {
      opacity = Math.floor(opacity * 255)
      const hex_opacity = opacity > 15 ? opacity.toString(16) : '0' + opacity.toString(16)
      color = `${color}${hex_opacity}`
    }
    return color
  }

  static isRgb (color) {
    return color.match(/^rgb(\d+,\d+,\d+)$/)
  }

  static isHexColorWithoutOpacity (color) {
    return color.match(/#[\d,A-F,a-f]{6}/)
  }

  static parseDateAsUtc (date_str) {
    const utc_date = Date.parse(date_str + ' UTC')
    // If the string already contains time-zone info (e.g., "2023-09-28T14:30:00Z"),
    // then utc_date will be NaN, in which case we try again without the suffix
    return !isNaN(utc_date) ? utc_date : Date.parse(date_str)
  }
}

module.exports = Utils
