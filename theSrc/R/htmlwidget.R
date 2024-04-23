#' @title Labeled scatterplot HTMLWidget
#'
#' @description A HTMLWidget that creates a labeled scatter plot.
#'
#' @param X is a vector of x coordinates of data set
#' @param Y is vector of y coordinates of data set
#' @param Z is vector of magnitudes for each set of x,y coordinates (for bubble charts). This is optional
#' @param label is the array of text labels for the data set (can supply an url to show logos)
#' @param label.alt is an optional array of alternate label text when an url was provided as the label. NOTE: must be same length as label
#' @param group is the array of group name for each data point
#' @param panels is a categorical array assigning each data point to a panel in small multiples. Arrays will be coerced into factors.
#' @param x.levels is the levels for the categorical X input array. Default is levels(X)
#' @param y.levels is the levels for the categorical Y input array. Default is levels(Y)
#' @param fixed.aspect Default to FALSE. Cannot be guarenteed if any of the axis bounds are set.
#' @param colors is the color wheel to be used when plotting the data points. Defaults to Q color wheel.
#'  It should have the same length as the number of levels in `group`
#' @param color.transparency Value 0-1 specifying the transparency level of the plot points. Defaults to 1 without Z and 0.8 with Z
#' @param color.scale Default to NULL. It can be set to a vector of hex colors in order to show
#'  `group` as a continuous color scale. In this case, `color` will be ignored.
#' @param color.scale.format A string that is interpreted for the format of the tick labels along the color scale bar.
#' @param background.color The color of the entire background
#' @param plot.background.color The color of the plot area background
#' @param panel.num.rows Controls how many rows small multiples are arranged into
#' @param panel.share.axes Defaults to TRUE. Whether or not axis bounds and titles are shared across all panels
#' @param panel.x.gap A number between 0 and 1. Controls the horizontal space between panels.
#' @param panel.y.gap A number between 0 and 1. Controls the vertical space between panels.
#' @param panel.font.color is the font color of the panels
#' @param panel.font.family is the font family of the panels
#' @param panel.font.size is the font size of the panels
#' @param grid Defaults to TRUE. Shows the grid lines.
#' @param origin Defaults to FALSE. Shows the origin lines as dotted if not along axis.
#' @param origin.align Defaults to FALSE. Aligns the origin lines as closely to axis as possible.
#' @param x.axis.zero.line.color Line color of the zero line on the x-axis. Shown when `origin` is TRUE.
#' @param x.axis.zero.line.dash Line type of zero line. Can be one of 'solid', 'dot', 'dash'.
#' @param x.axis.zero.line.width Line width in pixels of the zero line.
#' @param y.axis.zero.line.color Line color of the zero line on the y-axis. Shown when `origin` is TRUE.
#' @param y.axis.zero.line.dash Line type of zero line. Can be one of 'solid', 'dot', 'dash'.
#' @param y.axis.zero.line.width Line width in pixels of the zero line.
#' @param x.axis.line.color Line color of the x axis line. This is shown at both the top and bottom
#'      of the plot area when `plot.border.show = TRUE`.
#' @param x.axis.line.width Width of the x axis line in pixels.
#' @param x.axis.grid.color Line color of the x axis grid lines.
#' @param x.axis.grid.width Width of the x axis grid lines in pixels.
#' @param x.axis.grid.dash Line type of the x axis grid lines. Can be one of 'solid', 'dot', 'dash'.
#' @param x.axis.tick.color Color of tick lines on the x axis.
#' @param x.axis.tick.length Length of tick lines on the x axis. This also adjust how close
#'      the tick labels are to the axis/grid lines.#'
#' @param y.axis.line.color Line color of the y axis line. This is shown at both the left and right
#'      of the plot area when `plot.border.show = TRUE`.
#' @param y.axis.line.width Width of the y axis line in pixels.
#' @param y.axis.grid.color Line color of the y axis grid lines.
#' @param y.axis.grid.width Width of the y axis grid lines in pixels.
#' @param y.axis.grid.dash Line type of the y axis grid lines. Can be one of 'solid', 'dot', 'dash'.
#' @param y.axis.tick.color Color of tick lines on the y axis.
#' @param y.axis.tick.length Length of tick lines on the y axis. This also adjust how close
#'      the tick labels are to the axis/grid lines.
#' @param x.title is the title text given to the x axis
#' @param y.title is the title text given to the y axis
#' @param z.title is the title text given to the bubble size
#' @param title is the title text given to the plot
#' @param title.font.family is the font family of the plot title
#' @param title.font.color is the font color of the plot title
#' @param title.font.size is the font size of the plot title
#' @param subtitle is the subtitle text given to the plot
#' @param subtitle.font.family is the font of the subtitle text
#' @param subtitle.font.color is the font color of the subtitle text
#' @param subtitle.font.size is the font size of the subtitle text
#' @param footer is the footer text given at the bottom at the plot
#' @param footer.font.family is the font of the footer text
#' @param footer.font.color is the font color of the footer text
#' @param footer.font.size is the font size of the footer text
#' @param labels.show Toggle for showing labels. Defaults to true if labels array given
#' @param labels.font.family is the font family of the labels
#' @param labels.font.color is the font color of the labels. NOTE: This overrides the color if it is set
#' @param labels.font.size is the font size of the labels
#' @param labels.logo.scale is a vector of scaling factors for label logos
#' @param labels.max.shown Number of labels to show on chart. If the number of labels is greater than this
#'  this parameter, then the extra labels will be hidden by default but will be shown when the user clicks
#'  on the marker.
#' @param legend.show is the toggle to show the legend. Defaults to TRUE
#' @param legend.bubbles.show toggle to show the bubble sizes in the legend. Defaults to TRUE
#' @param legend.font.color is the font color of the legend.
#' @param legend.font.size is the font size of the legend
#' @param legend.font.family is the font family of the legend
#' @param legend.bubble.font.color is the font color of the legend bubble values.
#' @param legend.bubble.font.size is the font size of the legend bubble values
#' @param legend.bubble.font.family is the font family of the legend bubble values
#' @param legend.bubble.title.font.color is the font color of the legend bubble title.
#' @param legend.bubble.title.font.size is the font size of the legend bubble title
#' @param legend.bubble.title.font.family is the font family of the legend bubble title
#' @param legend.orientation Either "Vertical" or "Horizontal"
#' @param legend.x The x position of the legend, relative to the plot area
#' @param legend.y The y position of the legend, relative to the plot area
#' @param legend.x.anchor Either NULL, "left", "center" or "right"
#' @param legend.y.anchor Either NULL, "top", "center" or "bottom"
#' @param margin.top The top margin in pixels
#' @param margin.bottom The bottom margin in pixels
#' @param margin.left The left margin in pixels
#' @param margin.right The right margin in pixels
#' @param margin.autoexpand Whether to automatically expand margins (even when set) to accommodate elements such as axis labels and the legend
#' @param y.title.font.color is the font color of the y axis title
#' @param y.title.font.size is the font size of the y axis title
#' @param y.title.font.family is the font family of the y axis title
#' @param x.title.font.color is the font color of the x axis title
#' @param x.title.font.size is the font size of the x axis title
#' @param x.title.font.family is the font family of the x axis title
#' @param x.axis.show Boolean toggle to show the x axis tick markers (Default is TRUE).
#' @param y.axis.show Boolean toggle to show the y axis tick markers (Default is TRUE).
#' @param x.axis.font.family Font Family of the axis labels
#' @param x.axis.font.size Font size of the x axis labels
#' @param x.axis.font.color Font color of the x axis labels
#' @param y.axis.font.family Font Family of the y axis labels
#' @param y.axis.font.size Font size of the y axis labels
#' @param y.axis.font.color Font color of the y axis labels
#' @param axis.font.family Font Family of the axis labels. Only used if the values for specific axis is not set.
#' @param axis.font.size Font size of the axis labels. Only used if the values for specific axis is not set.
#' @param axis.font.color Font color of the axis labels. Only used if the values for specific axis is not set.
#' @param tooltip.text is an array of text containing custom tool tip text that appears on mouse hover ('\\n' for new line)
#' @param tooltip.font.color is the font color of the tooltips
#' @param tooltip.font.family is the font family of the tooltips
#' @param tooltip.font.size is the font size of the tooltips
#' @param width is the width of the plot. Defaults to max of window
#' @param height is the height of the plot. Defaults to the max of window
#' @param x.decimals the number of decimals in the x axis
#' @param y.decimals the number of decimals in the y axis
#' @param z.decimals the number of decimals in the bubble size axis
#' @param y.prefix A string that prefixes all y values(eg. "$")
#' @param x.prefix A string that prefixes all x values(eg. "$")
#' @param z.prefix A string that prefixes all bubble values(eg. "$")
#' @param y.suffix A string that suffixes all y values(eg. "kg")
#' @param x.suffix A string that suffixes all x values(eg. "kg")
#' @param z.suffix A string that suffixes all bubble values(eg. "kg")
#' @param x.format A string that is interpreted for the format of the x axis labels. Default is NULL.
#' @param x.hover.format A string that is interpreted for the format of the x axis values in the tooltips.
#' @param y.format A string that is interpreted for the format of the y axis labels. Default is NULL.
#' @param y.hover.format A string that is interpreted for the format of the y axis values in the tooltips.
#' @param point.radius Radius of the points when bubble parameter \code{Z} is not supplied. Defaults to 2.
#'     When the \code{Z} is supplied, the points are scaled so that the largest point has a radius of
#'     \code{point.radius * 50/3} (i.e. a diameter of roughly an inch for the default value).
#' @param point.border.color Color of border around point
#' @param point.border.width Width of border around scatter markers in pixels.
#'      Defaults to 0 for a scatterplot and 1 for a bubbleplot.
#' @param x.bounds.minimum Integer or NULL; set minimum of range for plotting on the x axis
#' @param x.bounds.maximum Integer or NULL; set minimum of range for plotting on the x axis
#' @param y.bounds.minimum Integer or NULL; set minimum of range for plotting on the y axis
#' @param y.bounds.maximum Integer or NULL; set minimum of range for plotting on the y axis
#' @param x.bounds.units.major Integer or NULL; set the distance between each tick mark on the x axis.
#' @param y.bounds.units.major Integer or NULL; set the distance between each tick mark on the y axis.
#' @param trend.lines.show Boolean toggle to show trendlines based on groups given
#' @param trend.lines.line.thickness An integer for the thickness of the trendlines (Default is 1px)
#' @param trend.lines.point.size An integer to set the size of the data points when a trendline is drawn. This setting overrides Z sizes.
#' @param fit.x A list of numeric vectors containing the x values of the fit lines
#' @param fit.y A list of numeric vectors containing the y values of the fit lines
#' @param fit.group A vector of strings, assigning each fit line to a group. If not supplied will default to fit.line.names
#' @param fit.panel A vector of integers, assigning each fit line to a panel when small multiples are used (note that panels are indexed by 1)
#' @param fit.lower.bound A list of numeric vectors containing the y values of the lower bounds
#' @param fit.upper.bound A list of numeric vectors containing the y values of the upper bounds
#' @param fit.line.colors A character vector of the fit line colors
#' @param fit.line.type One of "dot", "dash", "longdash", "dashdot" and "solid"
#' @param fit.line.width The width of the fit line in pixels
#' @param fit.line.opacity The opacity of the line from 0 to 1
#' @param fit.line.names A character vector of the names of the lines
#' @param fit.ci.colors A character vector of the CI fill colors
#' @param fit.ci.label.colors A character vector of the CI label colors
#' @param plot.border.show Boolean toggle to show border around plot area (Default is TRUE).
#' @param plot.border.color Color of border around plot area (Default is black).
#' @param plot.border.width Width of border around plot area in px (Default is 1).
#' @param label.placement.weight.distance Label placement algorithm weight for the distance between the label and the point (Default is 10.0)
#' @param label.placement.weight.distance.multiplier.centeredAboveAnchor TODO document
#' @param label.placement.weight.distance.multiplier.centeredUnderneathAnchor TODO document
#' @param label.placement.weight.distance.multiplier.besideAnchor TODO document
#' @param label.placement.weight.distance.multiplier.diagonalOfAnchor TODO document
#' @param label.placement.weight.labelLabelOverlap Label placement algorithm weight for the overlap between two labels (Default is 12.0)
#' @param label.placement.weight.labelAncOverlap Label placement algorithm weight fo the overlap between the point and label (Default is 8.0)
#' @param label.placement.numSweeps Label placement algorithm number of sweeps through the dataset (Default is 500).
#' @param label.placement.maxMove Label placement algorithm setting to determine how far in pixels a move is made (Default is 5).
#' @param label.placement.maxAngle Label placement algorithm setting to determine the domain of angles chosen for mcrotate (Default is 2*Pi).
#' @param label.placement.seed Label placement algorithm setting for the randomiser seed (Default is 1).
#' @param label.placement.temperature.initial Label placement algorithm initial temperature (Default is 0.01).
#' @param label.placement.temperature.final Label placement algorithm final temperature (Default is 0.0001).
#' @param debug.mode Boolean toggle to display widget internals for debugging (Default is FALSE)
#'
#' @author Po Liu <po.liu@displayr.com>
#'
#' @source https://github.com/Displayr/rhtmlLabeledScatter
#'
#' @import htmlwidgets
#' @importFrom grDevices rgb colorRamp
#' @importFrom jsonlite toJSON
#'
#' @export
#'

LabeledScatter <- function(
    X = NULL,
    Y = NULL,
    Z = NULL,
    axis.font.color = 'Black',
    axis.font.family = 'Arial',
    axis.font.size = 12,
    x.axis.font.color = axis.font.color,
    x.axis.font.family = axis.font.family,
    x.axis.font.size = axis.font.size,
    x.axis.grid.color = '#EEEEEE',
    x.axis.grid.dash = 'solid',
    x.axis.grid.width = 1,
    x.axis.line.color = '#000000',
    x.axis.line.width = 1,
    x.axis.tick.color = x.axis.grid.color,
    x.axis.tick.length = 5,
    x.axis.zero.line.color = '#000000',
    x.axis.zero.line.dash = 'dot',
    x.axis.zero.line.width = 1,
    y.axis.font.color = axis.font.color,
    y.axis.font.family = axis.font.family,
    y.axis.font.size = axis.font.size,
    y.axis.grid.color = '#EEEEEE',
    y.axis.grid.dash = 'solid',
    y.axis.grid.width = 1,
    y.axis.line.color = '#000000',
    y.axis.line.width = 1,
    y.axis.tick.color = x.axis.grid.color,
    y.axis.tick.length = 5,
    y.axis.zero.line.color = '#000000',
    y.axis.zero.line.dash = 'dot',
    y.axis.zero.line.width = 1,
    background.color = 'transparent',
    color.transparency = NULL,
    colors = c('#5B9BD5', '#ED7D31', '#A5A5A5', '#1EC000', '#4472C4', '#70AD47','#255E91','#9E480E','#636363','#997300','#264478','#43682B','#FF2323'),
    color.scale = NULL,
    color.scale.format = NULL,
    debug.mode = FALSE,
    fixed.aspect = FALSE,
    footer = "",
    footer.font.color = rgb(44, 44, 44, maxColorValue = 255),
    footer.font.family = "Arial",
    footer.font.size = 8,
    grid = TRUE,
    group = NULL,
    height = NULL,
    label = NULL,
    label.alt = NULL,
    label.placement.maxAngle = 2 * 3.1415,
    label.placement.maxMove = 5.0,
    label.placement.numSweeps = 500,
    label.placement.seed = 1,
    label.placement.temperature.initial = 0.01,
    label.placement.temperature.final = 0.0001,
    label.placement.weight.distance = 10.0,
    label.placement.weight.distance.multiplier.centeredAboveAnchor = 1,
    label.placement.weight.distance.multiplier.centeredUnderneathAnchor =  1.5,
    label.placement.weight.distance.multiplier.besideAnchor = 4,
    label.placement.weight.distance.multiplier.diagonalOfAnchor = 15,
    label.placement.weight.labelAncOverlap = 8.0,
    label.placement.weight.labelLabelOverlap = 12.0,
    labels.font.color = NULL,
    labels.font.family = "Arial",
    labels.font.size = 10,
    labels.logo.scale = NULL,
    labels.max.shown = NULL,
    labels.show = TRUE,
    legend.bubble.font.color = rgb(44, 44, 44, maxColorValue = 255),
    legend.bubble.font.family = "Arial",
    legend.bubble.font.size = 10,
    legend.bubble.title.font.color = rgb(44, 44, 44, maxColorValue = 255),
    legend.bubble.title.font.family = "Arial",
    legend.bubble.title.font.size = 12,
    legend.bubbles.show = TRUE,
    legend.font.color = rgb(44, 44, 44, maxColorValue = 255),
    legend.font.family = "Arial",
    legend.font.size = 12,
    legend.show = TRUE,
    legend.orientation = "Vertical",
    legend.x = NULL,
    legend.y = NULL,
    legend.x.anchor = NULL,
    legend.y.anchor = NULL,
    margin.top = NULL,
    margin.bottom = NULL,
    margin.left = NULL,
    margin.right = NULL,
    margin.autoexpand = TRUE,
    origin = TRUE,
    origin.align = FALSE,
    panels = NULL,
    panel.num.rows = 2,
    panel.share.axes = TRUE,
    panel.x.gap = 0.2,
    panel.y.gap = 0.3,
    panel.font.color = rgb(44, 44, 44, maxColorValue = 255),
    panel.font.family = "Arial",
    panel.font.size = 12,
    plot.border.color = 'Black',
    plot.border.show = TRUE,
    plot.border.width = 1,
    plot.background.color = 'transparent',
    point.radius = if (is.null(Z)) 2 else 4,
    point.border.color = '#000000',
    point.border.width = 0,
    subtitle = "",
    subtitle.font.color = rgb(44, 44, 44, maxColorValue = 255),
    subtitle.font.family = "Arial",
    subtitle.font.size = 12,
    title = "",
    title.font.color = rgb(44, 44, 44, maxColorValue = 255),
    title.font.family = "Arial",
    title.font.size = 16,
    tooltip.font.color = rgb(44, 44, 44, maxColorValue = 255),
    tooltip.font.family = "Arial",
    tooltip.font.size = 10,
    tooltip.text = NULL,
    trend.lines.line.thickness = 1,
    trend.lines.point.size=2,
    trend.lines.show = FALSE,
    fit.x = NULL,
    fit.y = NULL,
    fit.group = NULL,
    fit.panel = NULL,
    fit.lower.bound = NULL,
    fit.upper.bound = NULL,
    fit.line.colors = NULL,
    fit.line.type = "solid",
    fit.line.width = 2,
    fit.line.opacity = 1,
    fit.line.names = NULL,
    fit.ci.colors = NULL,
    fit.ci.label.colors = NULL,
    width = NULL,
    x.axis.show = TRUE,
    x.bounds.maximum = NULL,
    x.bounds.minimum = NULL,
    x.bounds.units.major = NULL,
    x.decimals = NULL,
    x.format = NULL,
    x.hover.format = NULL,
    x.levels = NULL,
    x.prefix = "",
    x.suffix = "",
    x.title = "",
    x.title.font.color = rgb(44, 44, 44, maxColorValue = 255),
    x.title.font.family = "Arial",
    x.title.font.size = 12,
    y.axis.show = TRUE,
    y.bounds.maximum = NULL,
    y.bounds.minimum = NULL,
    y.bounds.units.major = NULL,
    y.decimals = NULL,
    y.format = NULL,
    y.hover.format = NULL,
    y.levels = NULL,
    y.prefix = "",
    y.suffix = "",
    y.title = "",
    y.title.font.color = rgb(44, 44, 44, maxColorValue = 255),
    y.title.font.family = "Arial",
    y.title.font.size = 12,
    z.decimals = NULL,
    z.prefix = "",
    z.suffix = "",
    z.title = "")
{
    # Check inputs
    if (is.null(X) || !is.atomic(X) || (is.array(X) && length(dim(X)) > 1L))
        stop("Input X needs to be a vector")
    if (is.null(Y) || !is.atomic(Y) || (is.array(Y) && length(dim(Y)) > 1L))
        stop("Input Y needs to be a vector")
    if (!is.null(Z) && (!is.numeric(Z) || any(Z < 0)))
        stop("Input Z needs to be a vector of non-negative numbers")
    if (length(X) != length(Y))
        stop("Inputs X and Y need to have the same length")
    if (!is.null(Z) && length(X) != length(Z))
        stop("Input Z needs to have the same length as X and Y")

    isDateTime <- function(x) { return (inherits(x, "Date") || inherits(x, "POSIXct") || inherits(x, "POSIXt"))}
    xIsDateTime <- isDateTime(X[1])
    yIsDateTime <- isDateTime(Y[1])

    color.levels <- NULL
    color.is.date.time <- FALSE
    if (!is.null(color.scale)) {
        color.func <- colorRamp(color.scale)
        color.is.date.time <- isDateTime(group)
        if (color.is.date.time) {
            color.tmp <- as.numeric(group)
        } else if (is.numeric(group)) {
            color.tmp <- group
        } else {
            tmp <- as.factor(group)
            color.levels <- as.character(tmp)
            tmp.seq <- seq(from = 0, to = 1, length = nlevels(tmp))
            color.scale <- rgb(color.func(tmp.seq), maxColorValue = 255)
            color.tmp <- as.numeric(tmp)
            group <- 1:length(group)
        }
        color.min <- min(color.tmp, na.rm = TRUE)
        color.max <- max(color.tmp, na.rm = TRUE)
        colors.scaled <- (color.tmp - color.min)/(color.max - color.min)
        colors <- rgb(color.func(colors.scaled), maxColorValue = 255)
    }
    if (!is.null(panels))
    {
        panels <- as.factor(panels)
        panel.labels <- levels(panels)
        panels <- as.numeric(panels) - 1

    } else
        panel.labels <- NULL

    x = list(X = toJSON(X),
             Y = toJSON(Y),
             Z = toJSON(Z),
             xIsDateTime = xIsDateTime,
             yIsDateTime = yIsDateTime,
             colorIsDateTime = color.is.date.time,
             label = toJSON(as.character(label)),
             labelAlt = toJSON(label.alt),
             group = toJSON(group),
             panelLabels = toJSON(panel.labels),
             panels = toJSON(panels),
             xLevels = toJSON(x.levels),
             yLevels = toJSON(y.levels),
             colorLevels = toJSON(color.levels),
             fixedAspectRatio = fixed.aspect,
             colors = toJSON(colors),
             colorScale = toJSON(color.scale),
             colorScaleFormat = color.scale.format,
             transparency = color.transparency,
             grid = grid,
             origin = origin,
             originAlign = origin.align,
             xTitle = x.title,
             yTitle = y.title,
             zTitle = z.title,
             title = title,
             xDecimals = x.decimals,
             yDecimals = y.decimals,
             zDecimals = z.decimals,
             xPrefix = x.prefix,
             yPrefix = y.prefix,
             zPrefix = z.prefix,
             xSuffix = x.suffix,
             ySuffix = y.suffix,
             zSuffix = z.suffix,
             xFormat = x.format,
             xTooltipFormat = x.hover.format,
             yFormat = y.format,
             yTooltipFormat = y.hover.format,
             titleFontFamily = title.font.family,
             titleFontColor = title.font.color,
             titleFontSize = title.font.size,
             subtitle = subtitle,
             subtitleFontFamily = subtitle.font.family,
             subtitleFontSize = subtitle.font.size,
             subtitleFontColor = subtitle.font.color,
             footer = footer,
             footerFontFamily = footer.font.family,
             footerFontSize = footer.font.size,
             footerFontColor = footer.font.color,
             showLabels = labels.show,
             labelsFontFamily = labels.font.family,
             labelsFontColor = labels.font.color,
             labelsFontSize = labels.font.size,
             labelsLogoScale = labels.logo.scale,
             labelsMaxShown = labels.max.shown,
             legendShow = legend.show,
             legendBubblesShow = legend.bubbles.show,
             legendFontColor = legend.font.color,
             legendFontFamily = legend.font.family,
             legendFontSize = legend.font.size,
             legendBubbleFontColor = legend.bubble.font.color,
             legendBubbleFontFamily = legend.bubble.font.family,
             legendBubbleFontSize = legend.bubble.font.size,
             legendBubbleTitleFontColor = legend.bubble.title.font.color,
             legendBubbleTitleFontFamily = legend.bubble.title.font.family,
             legendBubbleTitleFontSize = legend.bubble.title.font.size,
             legendOrientation = legend.orientation,
             legendX = legend.x,
             legendY = legend.y,
             legendXAnchor = legend.x.anchor,
             legendYAnchor = legend.y.anchor,
             yTitleFontColor = y.title.font.color,
             yTitleFontFamily = y.title.font.family,
             yTitleFontSize = y.title.font.size,
             xTitleFontColor = x.title.font.color,
             xTitleFontFamily = x.title.font.family,
             xTitleFontSize = x.title.font.size,
             showXAxis = x.axis.show,
             showYAxis = y.axis.show,
             axisFontFamily = axis.font.family,
             axisFontColor = axis.font.color,
             axisFontSize = axis.font.size,
             xAxisFontFamily = x.axis.font.family,
             xAxisFontColor = x.axis.font.color,
             xAxisFontSize = x.axis.font.size,
             xAxisGridColor = x.axis.grid.color,
             xAxisGridDash = x.axis.grid.dash,
             xAxisGridWidth = x.axis.grid.width,
             xAxisLineColor = x.axis.line.color,
             xAxisLineWidth = x.axis.line.width,
             xAxisTickColor = x.axis.tick.color,
             xAxisTickLength = x.axis.tick.length,
             xAxisZeroLineColor = x.axis.zero.line.color,
             xAxisZeroLineDash = x.axis.zero.line.dash,
             xAxisZeroLineWidth = x.axis.zero.line.width,
             yAxisFontFamily = y.axis.font.family,
             yAxisFontColor = y.axis.font.color,
             yAxisFontSize = y.axis.font.size,
             yAxisGridColor = y.axis.grid.color,
             yAxisGridDash = y.axis.grid.dash,
             yAxisGridWidth = y.axis.grid.width,
             yAxisLineColor = y.axis.line.color,
             yAxisLineWidth = y.axis.line.width,
             yAxisTickColor = y.axis.tick.color,
             yAxisTickLength = y.axis.tick.length,
             yAxisZeroLineColor = y.axis.zero.line.color,
             yAxisZeroLineDash = y.axis.zero.line.dash,
             yAxisZeroLineWidth = y.axis.zero.line.width,
             tooltipText = tooltip.text,
             tooltipFontColor = tooltip.font.color,
             tooltipFontFamily = tooltip.font.family,
             tooltipFontSize = tooltip.font.size,
             panelFontFamily = panel.font.family,
             panelFontSize = panel.font.size,
             panelFontColor = panel.font.color,
             panelNumRows = panel.num.rows,
             panelShareAxes = panel.share.axes,
             panelXGap = panel.x.gap,
             panelYGap = panel.y.gap,
             pointRadius = point.radius,
             pointBorderColor = point.border.color,
             pointBorderWidth = point.border.width,
             xBoundsMinimum = x.bounds.minimum,
             xBoundsMaximum = x.bounds.maximum,
             yBoundsMinimum = y.bounds.minimum,
             yBoundsMaximum = y.bounds.maximum,
             xBoundsUnitsMajor = x.bounds.units.major,
             yBoundsUnitsMajor = y.bounds.units.major,
             trendLines = trend.lines.show,
             trendLinesLineThickness = trend.lines.line.thickness,
             trendLinesPointSize = trend.lines.point.size,
             fitX = toJSON(fit.x),
             fitY = toJSON(fit.y),
             fitGroup = toJSON(fit.group),
             fitPanel = toJSON(fit.panel),
             fitLowerBound = toJSON(fit.lower.bound),
             fitUpperBound = toJSON(fit.upper.bound),
             fitLineColors = toJSON(fit.line.colors),
             fitLineType = fit.line.type,
             fitLineWidth = fit.line.width,
             fitLineOpacity = fit.line.opacity,
             fitLineNames = toJSON(fit.line.names),
             fitCIColors = toJSON(fit.ci.colors),
             fitCILabelColors = toJSON(fit.ci.label.colors),
             plotBorderShow = plot.border.show,
             labelPlacementWeightDistance = label.placement.weight.distance,
             labelPlacementWeightDistanceMultiplierCenteredAboveAnchor = label.placement.weight.distance.multiplier.centeredAboveAnchor,
             labelPlacementWeightDistanceMultiplierCenteredUnderneathAnchor = label.placement.weight.distance.multiplier.centeredUnderneathAnchor,
             labelPlacementWeightDistanceMultiplierBesideAnchor = label.placement.weight.distance.multiplier.besideAnchor,
             labelPlacementWeightDistanceMultiplierDiagonalOfAnchor = label.placement.weight.distance.multiplier.diagonalOfAnchor,
             labelPlacementWeightLabelLabelOverlap = label.placement.weight.labelLabelOverlap,
             labelPlacementWeightLabelAnchorOverlap = label.placement.weight.labelAncOverlap,
             labelPlacementNumSweeps = label.placement.numSweeps,
             labelPlacementSeed = label.placement.seed,
             labelPlacementTemperatureInitial = label.placement.temperature.initial,
             labelPlacementTemperatureFinal = label.placement.temperature.final,
             labelPlacementMaxMove = label.placement.maxMove,
             labelPlacementMaxAngle = label.placement.maxAngle,
             debugMode = debug.mode,
             marginTop = margin.top,
             marginBottom = margin.bottom,
             marginLeft = margin.left,
             marginRight = margin.right,
             marginAutoexpand = margin.autoexpand,
             backgroundColor = background.color,
             plotAreaBackgroundColor = plot.background.color,
             plotBorderColor = plot.border.color,
             plotBorderWidth = plot.border.width)

    sizing.policy <- htmlwidgets::sizingPolicy(browser.fill = TRUE,
                                               viewer.fill = TRUE,
                                               padding = 0)

    htmlwidgets::createWidget(name = 'rhtmlCombinedScatter',
                              x,
                              width = width,
                              height = height,
                              sizingPolicy = sizing.policy,
                              package = 'rhtmlCombinedScatter')
}
