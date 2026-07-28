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

    test('a series carrying the R string "NA" is still numeric', () => {
        expect(cfg([1, 'NA', 3, 4]).yDataType).toBe(DataTypeEnum.numeric)
    })

    // A real JS NaN passes the numeric check, but R cannot send one: JSON has no NaN
    // literal, so jsonlite encodes it as the string "NaN" just as it encodes NA as "NA".
    test('a series carrying the R string "NaN" is still numeric', () => {
        expect(cfg([1, 'NaN', 3, 4]).yDataType).toBe(DataTypeEnum.numeric)
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
