import { buildConfig } from './buildConfig'
import DataTypeEnum from './utils/DataTypeEnum'

// A numeric series with a gap is still numeric. flipStandardCharts sends line charts
// with missing values, so the axis type must survive them; classifying the axis as
// ordinal puts the values on a categorical axis in first-seen order.
function cfg (Y) {
    return buildConfig({
        X: [1, 2, 3, 4],
        Y: Y,
        group: ['A', 'A', 'A', 'A'],
        label: ['1', '2', '3', '4'],
    }, 600, 400)
}

describe('axis type with missing values', () => {
    test('a fully numeric series is numeric', () => {
        expect(cfg([1, 2, 3, 4]).yDataType).toBe(DataTypeEnum.numeric)
    })

    test('a series with a null gap is still numeric', () => {
        expect(cfg([1, null, 3, 4]).yDataType).toBe(DataTypeEnum.numeric)
    })

    test('a series with a NaN gap is still numeric', () => {
        expect(cfg([1, NaN, 3, 4]).yDataType).toBe(DataTypeEnum.numeric)
    })

    // The strings "NA" and "NaN" are data, not gaps. A gap is serialised as the JSON null
    // literal, so a series that carries one of these strings carries a category with that
    // name, and a category among numbers makes the axis ordinal. Reading them as gaps
    // instead would drop a drawn point from the marker index and blank its coordinate.
    test('a series carrying the string "NA" is a categorical series', () => {
        expect(cfg([1, 'NA', 3, 4]).yDataType).toBe(DataTypeEnum.ordinal)
    })

    test('a series carrying the string "NaN" is a categorical series', () => {
        expect(cfg([1, 'NaN', 3, 4]).yDataType).toBe(DataTypeEnum.ordinal)
    })

    test('the category is kept as a level, so it is not lost from the axis', () => {
        expect(cfg([1, 'NA', 3, 4]).yLevels).toContain('NA')
    })

    test('a numeric series with a gap gets no levels', () => {
        expect(cfg([1, null, 3, 4]).yLevels).toBeNull()
    })

    test('a genuinely categorical series is still ordinal', () => {
        expect(cfg(['low', 'high', 'low', 'mid']).yDataType).toBe(DataTypeEnum.ordinal)
    })

    test('an all-missing series is not treated as numeric', () => {
        expect(cfg([null, null, null, null]).yDataType).not.toBe(DataTypeEnum.numeric)
    })
})
