/* global HTMLWidgets */

import 'babel-polyfill'
import widgetFactory from './rhtmlCombinedScatter.factory'

HTMLWidgets.widget({
  name: 'rhtmlCombinedScatter',
  type: 'output',
  factory: widgetFactory,
})
