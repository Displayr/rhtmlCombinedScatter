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
