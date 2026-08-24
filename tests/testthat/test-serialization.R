context("Serialization")

# htmlwidgets serialises the payload with auto_unbox = TRUE, so a length-1 vector left
# raw arrives in JavaScript as a bare value rather than an array. Anything the widget
# reads per data point has to be encoded here so that it survives as an array, however
# many points there are. Pre-encoded values are passed through verbatim, since
# htmlwidgets serialises with json_verbatim = TRUE.

test_that("tooltip.text is an array even for a single point", {
    x <- CombinedScatter(X = 1, Y = 2, label = "a", tooltip.text = "custom")$x
    expect_s3_class(x$tooltipText, "json")
    expect_equal(as.character(x$tooltipText), '["custom"]')
})

test_that("tooltip.text is an array for more than one point", {
    x <- CombinedScatter(X = c(1, 2), Y = c(2, 3), label = c("a", "b"),
                        tooltip.text = c("t1", "t2"))$x
    expect_equal(as.character(x$tooltipText), '["t1","t2"]')
})

test_that("tooltip.text is left out when it is not supplied", {
    x <- CombinedScatter(X = 1, Y = 2, label = "a")$x
    expect_null(x$tooltipText)
})

test_that("the array survives the serialisation htmlwidgets does", {
    # The end to end check: auto_unbox must not reach it on the way out
    one <- CombinedScatter(X = 1, Y = 2, label = "a", tooltip.text = "custom")
    json <- as.character(htmlwidgets:::toJSON(one$x))
    expect_match(json, '"tooltipText":\\["custom"\\]', fixed = FALSE)
})

test_that("a single label is an array too", {
    x <- CombinedScatter(X = 1, Y = 2, label = "a")$x
    expect_equal(as.character(x$label), '["a"]')
})

# The values themselves have to survive too. jsonlite rounds to four decimal places by
# default - places, not significant digits - which silently merges values that differ beyond
# that, and writes anything below 5e-05 as exactly 0. `group` is the one where it breaks the
# chart rather than just blurring it: a numeric colour scale gives one colour per distinct
# value and the widget matches them up by value, so merged values leave the colours at the
# end of the scale unreachable.

test_that("a numeric group keeps values that differ beyond four decimal places", {
    g <- c(1.521035, 1.521036, 1.521037)
    x <- CombinedScatter(X = 1:3, Y = 1:3, label = letters[1:3], group = g)$x
    expect_equal(jsonlite::fromJSON(as.character(x$group)), g)
    expect_length(unique(jsonlite::fromJSON(as.character(x$group))), 3)
})

test_that("coordinates and bubble sizes keep their precision", {
    v <- c(1.234567891, 2.345678912, 3.456789123)
    x <- CombinedScatter(X = v, Y = rev(v), Z = v, label = letters[1:3])$x
    expect_equal(jsonlite::fromJSON(as.character(x$X)), v)
    expect_equal(jsonlite::fromJSON(as.character(x$Y)), rev(v))
    expect_equal(jsonlite::fromJSON(as.character(x$Z)), v)
})

# The known limit of digits = NA, pinned so that changing the encoding surfaces it rather
# than quietly moving it. as.character() gives 15 significant digits, and a double needs 17
# to round-trip, so values that agree to 15 still share a colour bucket. digits = I(17) would
# close this, at the cost of writing every inexact decimal in full - see toJsonOrNull.
test_that("values agreeing to 15 significant digits still merge", {
    g <- c(1.0000000000000002, 1.0000000000000004, 1.0000000000000007)
    x <- CombinedScatter(X = 1:3, Y = 1:3, label = letters[1:3], group = g)$x
    expect_length(unique(jsonlite::fromJSON(as.character(x$group))), 1)
})

# Data that was already compact must stay compact, or every chart pays for the precision that
# only a few need. 0.1 and 33.33 are the values that matter here: they are ordinary two
# decimal place data but not exact binary fractions, so they are the ones an encoding that
# writes a fixed number of significant digits would blow out to 0.10000000000000001 and
# 33.329999999999998. An earlier version of this test used 1.5, 2.25 and 3 alone, which are
# all exactly representable and so cannot detect that.
test_that("values that do not need the digits are unchanged", {
    v <- c(0.1, 33.33, 1.5, 2.25, 3)
    x <- CombinedScatter(X = v, Y = v, label = letters[1:5])$x
    expect_equal(as.character(x$X), "[0.1,33.33,1.5,2.25,3]")
})

test_that("two decimal place data does not grow at all", {
    set.seed(1)
    v <- round(runif(200, 0, 1000), 2)
    x <- CombinedScatter(X = v, Y = v, label = as.character(seq_along(v)))$x
    expect_equal(nchar(as.character(x$X)), nchar(jsonlite::toJSON(v)))
})

test_that("a gap is still encoded as null", {
    x <- CombinedScatter(X = c(1.5, NA, 3.5), Y = c(1, 2, 3), label = letters[1:3])$x
    expect_equal(as.character(x$X), "[1.5,null,3.5]")
})
