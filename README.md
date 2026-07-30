# rhtmlCombinedScatter

A htmlwidget that creates a scatterplot. Combines plotly and [Displayr/rhtmlLabeledScatter](https://github.com/Displayr/rhtmlLabeledScatter) to produce a scatterplot with optimally positioned labels.

## Installation

To install from GitHub:
```
require(devtools)
install_github("Displayr/rhtmlCombinedScatter", dependencies = NA)
```

If you have not set up a GitHub Personal Access Token, you will likely need to do so to avoid 
GitHub rate limits, which will manifest as 403 errors when downloading packages via
`install_github`. Please see the documentation in the `usethis` package or see the 
instructions [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

If you are using Windows, you will need to have a version of Rtools installed that matches your
version of R in order to build packages from source. Rtools can be downloaded from
[here](https://cran.r-project.org/bin/windows/Rtools/).

Specifying `dependencies = NA` in `install_github` will not install packages listed
in `Suggests` in the `DESCRIPTION` file (some of which may be proprietary and unavailable for download).

## Updating visual test baselines

The `JS tests` workflow runs automatically on every push. Its `Visual regression tests` job compares
rendered output against the committed baselines in `theSrc/test/snapshots/ci/master` (CI always
compares against `master`'s baselines, whatever branch it is running on). The pixel threshold is
0.0001%, so any intended change to rendering, layout or label placement will turn the job red and the
baselines have to be regenerated. A missing baseline also fails, rather than being silently accepted.

Baselines are environment specific — locally generated snapshots (`npm run localTest`, which writes
to `theSrc/test/snapshots/local/<branch>`) will not match CI's fonts and Chromium build, so do not
copy them into `theSrc/test/snapshots/ci`. Regenerate through CI instead:

1. **Inspect the failure first.** Download the `snapshot-diffs` artifact from the failed run and check
   the `__diff_output__` images. Only regenerate once you are satisfied every diff is intended.
2. **Dispatch a regeneration run.** Actions → `JS tests` → *Run workflow*, select your branch, and
   tick `update_snapshots`. Optionally set `test_filter` (passed to `jest -t`) to regenerate only the
   tests matching a name pattern; leave it blank to regenerate all of them.
3. **Download the `regenerated-baselines` artifact** from that run. Its contents are rooted at
   `master/`, so extract it into `theSrc/test/snapshots/ci/` — not over the repository root.
4. **Review, commit and push the changed snapshots yourself.** Use `git status` / `git diff --stat` to
   confirm only the snapshots you expected have changed.

CI deliberately does not commit the baselines for you. A push made with the default `GITHUB_TOKEN`
does not trigger any workflow, and `workflow_dispatch` check runs are excluded from a pull request's
status rollup — so a bot-authored head commit would leave the PR reporting no checks. Pushing the
snapshots yourself produces the full set of checks on the PR.

## Submitting a bug report

If you encounter a problem using the package, please open an [issue](https://github.com/Displayr/rhtmlCombinedScatter/issues). To achieve a resolution as quickly as possible, please include a minimal, reproducible example of the bug, along with the exact error message or output you receive and the behavior you expect. Including the output of `sessionInfo()` in R can be helpful to reproduce the issue. Please see this [FAQ](https://community.rstudio.com/t/faq-whats-a-reproducible-example-reprex-and-how-do-i-create-one/5219), which has a number of useful tips on creating great reproducible examples. 

[![Displayr logo](https://mwmclean.github.io/img/logo-header.png)](https://www.displayr.com)
