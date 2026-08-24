const State = require('./State.js')

// State saved before toJsonOrNull kept full precision (see theSrc/R/htmlwidget.R) holds X and
// Y as jsonlite left them: rounded to four decimal places. The same chart now arrives at full
// precision, so a plain equality check reads the upgrade as a data change and discards the
// user's dragged labels, hidden labels, legend points and viewbox on the first re-render.
const ROUNDED_X = [0.3333, 33.8983, 1.5]
const ROUNDED_Y = [0.6667, 66.1017, 2.5]
const FULL_X = [1 / 3, 33.89830508474576, 1.5]
const FULL_Y = [2 / 3, 66.10169491525424, 2.5]
const LABEL = ['a', 'b', 'c']

function savedState (X, Y, extra = {}) {
    return Object.assign({ X: X, Y: Y, label: LABEL, userPositionedLabs: [{ id: 1, x: 10, y: 20 }], 'hiddenlabel.pts': [2], vb: { width: 800, height: 600, x: 0, y: 0 } }, extra)
}

describe('state saved at the old four decimal places', () => {
    test('is kept when the same chart arrives at full precision', () => {
        const state = new State(savedState(ROUNDED_X, ROUNDED_Y), () => {}, FULL_X, FULL_Y, LABEL, 2)
        expect(state.userPositionedLabs).toEqual([{ id: 1, x: 10, y: 20 }])
        expect(state.vb).toEqual({ width: 800, height: 600, x: 0, y: 0 })
    })

    test('is rewritten at full precision, so the next render matches exactly', () => {
        const saved = savedState(ROUNDED_X, ROUNDED_Y)
        const state = new State(saved, () => {}, FULL_X, FULL_Y, LABEL, 2)
        expect(state.getStored('X')).toEqual(FULL_X)
        expect(state.getStored('Y')).toEqual(FULL_Y)
        // Rewritten by migrating, not by resetting: the user's labels are still there.
        expect(state.getStored('userPositionedLabs')).toEqual([{ id: 1, x: 10, y: 20 }])
    })
})

describe('a real data change', () => {
    test('still resets the state', () => {
        const state = new State(savedState(ROUNDED_X, ROUNDED_Y), () => {}, [9, 9, 9], FULL_Y, LABEL, 2)
        expect(state.userPositionedLabs).toEqual([])
    })

    test('is still a change when it only shows past four decimal places', () => {
        // 0.3333 rounds from anything in [0.33325, 0.33335); 0.4 does not, so this is data
        // that genuinely moved rather than the same data at a new precision.
        const state = new State(savedState(ROUNDED_X, ROUNDED_Y), () => {}, [0.4, 33.89830508474576, 1.5], FULL_Y, LABEL, 2)
        expect(state.userPositionedLabs).toEqual([])
    })

    test('still resets when a label changes', () => {
        const state = new State(savedState(ROUNDED_X, ROUNDED_Y), () => {}, FULL_X, FULL_Y, ['a', 'b', 'z'], 2)
        expect(state.userPositionedLabs).toEqual([])
    })

    test('still resets when the number of points changes', () => {
        const state = new State(savedState(ROUNDED_X, ROUNDED_Y), () => {}, [1 / 3, 2 / 3], [1 / 3, 2 / 3], ['a', 'b'], 2)
        expect(state.userPositionedLabs).toEqual([])
    })
})

describe('state saved at full precision', () => {
    test('is kept unchanged', () => {
        const state = new State(savedState(FULL_X, FULL_Y), () => {}, FULL_X, FULL_Y, LABEL, 2)
        expect(state.userPositionedLabs).toEqual([{ id: 1, x: 10, y: 20 }])
    })
})

describe('a categorical axis', () => {
    test('is unaffected by the rounding comparison', () => {
        const cats = ['Jan', 'Feb', 'Mar']
        const state = new State(savedState(cats, ROUNDED_Y), () => {}, cats, FULL_Y, LABEL, 2)
        expect(state.userPositionedLabs).toEqual([{ id: 1, x: 10, y: 20 }])
    })
})

describe('a gap in the data', () => {
    test('does not defeat the comparison', () => {
        const state = new State(savedState([0.3333, null, 1.5], ROUNDED_Y), () => {}, [1 / 3, null, 1.5], FULL_Y, LABEL, 2)
        expect(state.userPositionedLabs).toEqual([{ id: 1, x: 10, y: 20 }])
    })
})

// State.js's header warns that very old state types need defending against. Recognising the
// rounded form means more old state now survives the comparison instead of being reset, so
// these shapes reach the rest of the constructor where they previously did not.
describe('older state shapes', () => {
    test('the migrated values are handed to the host, not just held in memory', () => {
        // saveToState only writes when there is a callback, so without this the rewrite would
        // never persist and the migration would run again on every render.
        const seen = []
        const state = new State(savedState(ROUNDED_X, ROUNDED_Y), obj => seen.push(JSON.parse(JSON.stringify(obj))), FULL_X, FULL_Y, LABEL, 2)
        expect(state.getStored('X')).toEqual(FULL_X)
        expect(seen[seen.length - 1].X).toEqual(FULL_X)
        expect(seen[seen.length - 1].Y).toEqual(FULL_Y)
        expect(seen[seen.length - 1].userPositionedLabs).toEqual([{ id: 1, x: 10, y: 20 }])
    })

    test('state predating X and Y being stored is still reset', () => {
        const old = { userPositionedLabs: [{ id: 1, x: 10, y: 20 }], 'hiddenlabel.pts': [2] }
        const state = new State(old, () => {}, FULL_X, FULL_Y, LABEL, 2)
        expect(state.userPositionedLabs).toEqual([])
    })

    test('state storing X but not Y is still reset', () => {
        const old = { X: ROUNDED_X, label: LABEL, userPositionedLabs: [{ id: 1, x: 10, y: 20 }] }
        const state = new State(old, () => {}, FULL_X, FULL_Y, LABEL, 2)
        expect(state.userPositionedLabs).toEqual([])
    })

    // retrieveLegendPts still reads the pre-rename 'legendPts' key. A document old enough to
    // use it is also old enough to hold the rounded X/Y, so the two go together.
    test('the pre-rename legendPts key survives the migration', () => {
        const old = savedState(ROUNDED_X, ROUNDED_Y, { legendPts: [1, 2] })
        const state = new State(old, () => {}, FULL_X, FULL_Y, LABEL, 2)
        expect(state.legendPts).toEqual([1, 2])
        expect(state.userPositionedLabs).toEqual([{ id: 1, x: 10, y: 20 }])
    })

    test('a labelsMaxShown change still applies to state that also needs migrating', () => {
        const old = savedState(ROUNDED_X, ROUNDED_Y, { labelsMaxShown: 2, 'hiddenlabel.pts': [2] })
        const state = new State(old, () => {}, FULL_X, FULL_Y, LABEL, 3)
        expect(state.getStored('X')).toEqual(FULL_X)
        expect(state.getStored('labelsMaxShown')).toBe(3)
        // The dragged labels survive both the migration and the labelsMaxShown change.
        expect(state.userPositionedLabs).toEqual([{ id: 1, x: 10, y: 20 }])
    })

    test('state that is not an object at all is tolerated', () => {
        expect(() => new State(null, () => {}, FULL_X, FULL_Y, LABEL, 2)).not.toThrow()
        expect(() => new State('not state', () => {}, FULL_X, FULL_Y, LABEL, 2)).not.toThrow()
        expect(() => new State(undefined, () => {}, FULL_X, FULL_Y, LABEL, 2)).not.toThrow()
    })

    test('a chart with no points does not read as migratable', () => {
        const state = new State({}, () => {}, [], [], [], 2)
        expect(state.numPoints).toBe(0)
    })
})
