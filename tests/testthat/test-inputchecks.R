context("Input checks")

# The following tests have been converted to table tests in the test project R htmlwidgets.Q

test_that("Basic working scatterplot", {
    expect_error(CombinedScatter(X = 1:10, Y = 11:20, Z = 0:9,
                                label = letters[1:10]), NA)

    col.ord <- c(3,2,1,4,5)
    col.scale <- c("#FF0000", "#CCCCCC", "#0000FF")
    expect_error(CombinedScatter(X=1:5, Y=1:5, label = letters[col.ord],
        color.scale = col.scale, group = col.ord), NA)
    expect_error(CombinedScatter(X=1:5, Y=1:5, label = letters[col.ord],
        color.scale = col.scale, group = letters[col.ord]), NA)
    expect_error(CombinedScatter(X=1:5, Y=1:5, label = letters[col.ord],
        color.scale = col.scale, group = Sys.Date() + col.ord), NA)
    expect_error(CombinedScatter(X=iris$Sepal.Length, Y=iris$Sepal.Width,
        label=paste0('N', 1:nrow(iris)), panels = iris$Species), NA)
    expect_error(CombinedScatter(X=1:5, Y=1:5, Z=1:5, z.title = "z",
        legend.bubble.title = "Size scale (1:100)"), NA)
})

test_that("Numeric color scale", {
    expect_error(CombinedScatter(X=LifeCycleSavings[,1], Y=LifeCycleSavings[,2],
        label = rownames(LifeCycleSavings),
        group = LifeCycleSavings[,3], color.scale = terrain.colors(50)), NA)
})

test_that("Small Multiples", {
    expect_error(CombinedScatter(X=1:10, Y=1:10,
        panels=rep(c("A", "B"), each=5), panel.title.font.color = "#FF0000"), NA)
})

test_that("Invalid X error", {
    msg <- "Input X needs to be a vector"
    expect_error(CombinedScatter(Y = 1:10, label = letters[1:10]), msg)
    expect_error(CombinedScatter(X = list(1:10), Y = 1:10,
                                label = letters[1:10]), msg)
    expect_error(CombinedScatter(X = matrix(1:10), Y = 1:10,
                                label = letters[1:10]), msg)
    expect_error(CombinedScatter(X = data.frame(1:10), Y = 1:10,
                                label = letters[1:10]), msg)
    CombinedScatter(X=iris$Sepal.Length, Y=iris$Sepal.Width,
                   label=paste0('N', 1:nrow(iris)), panels = iris$Species )
})

test_that("Invalid Y error", {
    msg <- "Input Y needs to be a vector"
    expect_error(CombinedScatter(X = 1:10, label = letters[1:10]), msg)
    expect_error(CombinedScatter(X = 1:10, Y = list(1:10),
                                label = letters[1:10]), msg)
    expect_error(CombinedScatter(X = 1:10, Y = matrix(1:10),
                                label = letters[1:10]), msg)
    expect_error(CombinedScatter(X = 1:10, Y = data.frame(1:10),
                                label = letters[1:10]), msg)
})

test_that("Invalid Z error", {
    msg <- "Input Z needs to be a vector of non-negative numbers"
    expect_error(CombinedScatter(X = 1:10, Y = 11:20, Z = letters[1:10],
                                label = letters[1:10]), msg)
    expect_error(CombinedScatter(X = 1:10, Y = 11:20, Z = -1:8,
                                label = letters[1:10]), msg)
})

test_that("Length of X and Y different", {
    msg <- "Inputs X and Y need to have the same length"
    expect_error(CombinedScatter(X = 1:10, Y = 1:20, label = letters[1:10]),
                 msg)
})

test_that("Length of Z different from X and Y", {
    msg <- "Input Z needs to have the same length as X and Y"
    expect_error(CombinedScatter(X = 1:10, Y = 11:20, Z = 1:3,
                                label = letters[1:10]), msg)
})
