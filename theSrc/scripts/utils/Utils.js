import _ from 'lodash'
import d3 from 'd3'
import BigNumber from 'bignumber.js'

class Utils {
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
    const has_decimals = num !== Math.floor(num)
    if (!has_decimals) {
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
}

module.exports = Utils
