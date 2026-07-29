# Run JS tests in CI alongside the R build

**Date:** 2026-07-29
**Status:** Approved, pending implementation plan

## Problem

CI currently runs only the R package build, via `.github/workflows/build-r-package.yaml`,
which delegates entirely to `Displayr/nixr-public`.

The JS tests used to run on CircleCI. That config was deleted in
[PR #89](https://github.com/Displayr/rhtmlCombinedScatter/pull/89) ("DPI-4357: Remove
redundant circleci workflow") because it was already broken: it pinned
`machine.image: ubuntu-2004:202010-01`, which CircleCI no longer supports.

The JS suite is therefore unenforced. We want it back, gating merges to master.

## What the JS suite actually is

Two distinct suites hide behind the deleted `npm run circleCITest`
(`gulp testSpecs && gulp testVisual --env=travis`):

| | `gulp testSpecs` | `gulp testVisual` |
|---|---|---|
| Content | jest unit tests over `theSrc/scripts` (`**/*.jest.test.js`) | puppeteer image-snapshot regression over `theSrc/test/snapshotTestDefinitions/*.yaml`, plus interaction tests in `theSrc/test/bin` |
| Needs | node only | local webserver + headless Chrome |
| Baselines | none | 427 PNGs in `theSrc/test/snapshots/travis/master/`, `failureThreshold: 0.0001%` |
| Verified | 8 suites / 86 tests pass locally in 32s (Node 22) | not run locally |

Task composition, from `rhtmlBuildUtils/src/index.js`:

- `testSpecs` = `jestSpecTests`
- `testVisual` = `core` → `compileInternal` → `connect` → `copySnapshotJestRunnerToProject` → `takeSnapshotsForEachTestDefinition`
- `build` = `clean` → [`compileWidgetEntryPoint`, `core`, `lint`] → `makeDocs`

Note `testVisual` never runs `compileWidgetEntryPoint`: it renders through the internal
www server, not the `inst/` bundle. CircleCI's separate `npm run build` was verifying that
the widget bundle compiles, which is a distinct check worth keeping deliberately.

## Key constraint: puppeteer 3.3.0, and the jest ceiling above it

`rhtmlBuildUtils` (pinned here at `#7.2.6`) declares `puppeteer: ^3.3.0`, so the visual
tests drive Chromium ~83 (May 2020). Running that on a supported image is the hard part:

- Ubuntu 24.04 restricts unprivileged user namespaces via AppArmor, breaking Chrome's
  sandbox, and renames deps (`libasound2` → `libasound2t64`).
- More importantly, the 0.0001% pixel threshold on a label-placement widget means any
  change in host fonts or fontconfig shifts text metrics and fails snapshots en masse.

**Baseline regeneration is therefore unavoidable on any modern image.** This is accepted:
the package is known to work correctly now, so regenerated baselines are still valuable
for catching regressions in future changes.

Given regeneration is happening anyway, and given the pinned dependencies exist only
because the tests were hard to get running (not because anything depends on those exact
versions), modernising puppeteer is cheaper than Chromium-83 archaeology.

### Choosing the version: the jest ceiling

The first attempt targeted puppeteer 24 via `overrides`. **That does not work**, and the
reason constrains the whole design.

The project's actually-resolved jest is **25.5.4**, not the 26.6.3 rhtmlBuildUtils
declares. `jest-image-snapshot@3.1.0` sets `peerDependencies: { "jest": ">=20 <=25" }`,
which caps it; rhtmlBuildUtils' own jest 26.6.3 ends up nested and shadowed. Since
`getJestPath()` prefers the project root, 25.5.4 is what actually runs both suites.

Jest 25's resolver predates package.json `exports` maps. Under it, `require('puppeteer')`
from v24 returns an object whose `launch` is `undefined` — verified by probe. Every visual
test calls `puppeteer.launch(...)`, so the entire suite would break, not merely the
`waitFor` call.

This is only visible from inside jest. Under plain `node`, puppeteer 24 loads perfectly,
which is why an out-of-jest smoke check would hide it.

**puppeteer 13.7.0 is the chosen target**, verified by probe:

- No `exports` field and no `node:` specifiers, so jest 25.5.4 loads it — `pp.launch` is a
  function.
- Bundles Chromium 982053 (~Chrome 101, 2022), which is recent enough to run on
  `ubuntu-24.04` with `--no-sandbox`, unlike Chromium 83.
- **`Page.prototype.waitFor` still exists**, so rhtmlBuildUtils' call site works untouched
  and no shim is required.

Consequences: no `Page.prototype.waitFor` shim, no jest setup file, and no `jest` key in
`package.json`. Note that in puppeteer 13 the `Page` class is not exported from the package
root; it lives at `puppeteer/lib/cjs/puppeteer/common/Page.js`.

The alternative — overriding jest to 29+ and jest-image-snapshot to 6 so puppeteer 24 works
— was rejected. jest-image-snapshot's peer cap exists for a reason, and a v6 upgrade risks
changing pixel-diff semantics, which would compromise the baseline regeneration this change
already depends on.

## Design

### Workflow structure

New `.github/workflows/js-tests.yaml`. `build-r-package.yaml` is untouched.

- Trigger: `on: [push, workflow_dispatch]`
- Two jobs, no `needs:` between them, running in parallel
- `runs-on: ubuntu-24.04`, pinned — deliberately not `ubuntu-latest`, so a GitHub image
  bump is an opt-in commit rather than a surprise mass-failure
- Neither job uses `continue-on-error`; both are required for merge to master via branch
  protection. Pushes are never blocked, matching current behaviour for the R check.

| Job | Steps |
|---|---|
| `unit` | `npm ci` → `gulp lint` → `gulp testSpecs` → `gulp core compileWidgetEntryPoint` |
| `visual` | `npm ci` → apt fonts → `gulp testVisual` (no `--env`; see below) |

### Keep running after a failure

Some visual tests are flaky, so one failure must not hide the rest. Three levels:

1. **Between jobs** — solved by the split. The old `gulp testSpecs && gulp testVisual`
   meant a unit failure skipped the entire visual suite.
2. **Within a job** — GitHub aborts remaining steps once one fails. Each test step gets
   `if: ${{ !cancelled() && steps.install.outcome == 'success' }}`, so all steps run, the
   job still reports red, and every failure appears in one pass. Conditioning on the
   install step specifically, so a broken `npm ci` doesn't cascade into confusing errors.
3. **Within jest** — already correct. Jest does not `--bail` by default and nothing sets
   it, so all comparisons run. A suite-level error (e.g. browser fails to launch in
   `beforeAll`) fails that suite and continues to the others.

### Puppeteer change

- Add `"overrides": { "puppeteer": "^13" }` to `package.json` and regenerate
  `package-lock.json`. npm `overrides` applies transitively, so rhtmlBuildUtils resolves to
  it without a fork.
- Add a jest test asserting puppeteer loads and exposes `launch` **from inside jest**, since
  that is the only place the failure is observable. This is the regression guard for a
  future version bump silently reintroducing the problem.
- Fix the three deprecated `page.waitFor(1000)` calls in `theSrc/test/bin/resize.jest.test.js`
  to `await new Promise(r => setTimeout(r, 1000))`. Puppeteer 13 still supports the method,
  so this is hygiene rather than necessity; rhtmlBuildUtils' own call site is left alone.
- Add `args: ['--no-sandbox', '--disable-dev-shm-usage']` to `snapshotTesting.puppeteer` in
  `build/config/widget.config.js`.

`preinstall` already skips `npm-force-resolutions` when `CI=true`, which GitHub Actions
sets automatically, so `npm ci` works as-is. The existing `resolutions` block stays for
local installs; `overrides` and `resolutions` coexist.

### Rendering determinism

- Fonts installed explicitly: `fonts-liberation`, `fonts-dejavu-core`,
  `fonts-noto-color-emoji`, so text metrics don't drift with the base image.
- **No puppeteer browser cache.** v13 downloads into
  `node_modules/puppeteer/.local-chromium/`, not `~/.cache/puppeteer` (the v19+
  `@puppeteer/browsers` location), and `npm ci` wipes `node_modules` every run regardless, so
  a cache there cannot survive. Making it work would mean relocating the download via
  `PUPPETEER_DOWNLOAD_PATH` and caching that. Skipped deliberately: a pure optimisation whose
  misconfiguration fails the job confusingly. Chromium re-downloads each run.
- Node pinned to 22, matching local development. Satisfies `engines` (`>=18.15.0`).
  Unit tests are confirmed passing on Node 22 locally (v22.18.0, 8 suites / 86 tests).
  `gulp core compileWidgetEntryPoint` and `gulp testVisual` on Node 22 are not yet
  verified, so exercise both early in implementation — that is the main risk this choice
  carries.

### Baselines

- Regenerate under a new env name, writing to `theSrc/test/snapshots/ci/master/`.

  **`--env=ci` cannot be passed on the command line.** rhtmlBuildUtils constrains the
  option: `yargs.option('env', { choices: ['local', 'travis'] })`, so `--env=ci` is
  rejected outright. Since we are not modifying that repo, set the env through config
  instead:

  - `build/config/widget.config.js` sets `snapshotTesting.env: 'ci'`.
  - The CI job runs `npx gulp testVisual` with **no** `--env` flag.

  This works because the snapshot path is
  `snapshotDirectory / env / branch / <collection>`, resolved by
  `_.defaultsDeep(CLI args → build/config/widget.config.js → default.widget.config.js)`,
  and yargs options declared without a default are absent from the parsed args when not
  supplied — the parser's own header comment states this is deliberate. So omitting
  `--env` lets the repo config win, bypassing the `choices` whitelist.

  `npm run localTest` already passes `--env=local` explicitly, so the local dev loop keeps
  using `theSrc/test/snapshots/local/` and is unaffected. `--branch` is likewise omitted,
  falling through to the default `master`.
- `theSrc/test/snapshots/travis/` is **renamed** to `ci/`, not deleted, and the rename must
  be its own commit with no content change. See "Reviewing the regenerated baselines".
- No `--branch` flag, matching CircleCI, so every branch compares against master's
  baselines.
- `theSrc/test/snapshots/local/` is untouched and remains the local dev loop.

Regeneration is CI-driven, since Windows-generated snapshots can never match a Linux
runner. `workflow_dispatch` takes an `update_snapshots` boolean; when true, the visual job
runs with `-u` and commits regenerated PNGs back to the triggering branch
(`permissions: contents: write`). This is also the bootstrap path: the first dispatch on
the feature branch creates the whole set for review in the PR diff.

On failure, upload `**/__diff_output__/**` as an artifact so a red run is diagnosable
without a local repro.

### Smoke-testing the harness on a subset

`gulp testVisual` **cannot be run locally on Windows at all.** rhtmlBuildUtils'
`compileRenderContentPage` builds the widget path with `path.join('..', widgetFactory)` and
mustache writes it unescaped into `const WidgetFactory = require('{{{widget_definition_path}}}')`.
On Windows the separators are backslashes, so `\t` becomes a TAB and `\r` a carriage return, corrupting the path before browserify resolves it. There is no WSL or Docker on the
dev machine, so CI is the only place the visual suite can run. (The upstream fix is a
one-liner — use POSIX separators — but rhtmlBuildUtils is out of scope here.)

To confirm the harness works without waiting on all 427 snapshots, the workflow takes a
`test_filter` dispatch input that maps to jest's `-t`. It is passed to the run step through
`env:` rather than interpolated into the script, so the value is not substituted into the
shell command in the workflow.

This is mitigation at the YAML layer only. rhtmlBuildUtils splices the `-t` value unescaped
into a second command string it executes via shelljs (`/bin/sh -c`), so a value containing
shell metacharacters would still be interpreted there. Accepted: `workflow_dispatch`
requires write access to the repo, and anyone with that could edit the workflow directly.

It composes with `update_snapshots`:

- `test_filter` alone — run a handful of tests against existing baselines. Proves the
  browser launches and the comparison path works, even though it reports mismatches.
- `test_filter` **and** `update_snapshots` — regenerate just that subset. A dress rehearsal
  for the full regeneration, with a few images to review instead of 427.

### Reviewing the regenerated baselines

Git detects renames by similarity rather than storing them. A pure `git mv` is 100%
similar and always detected, but regenerated PNGs are not similar to their originals —
lossless compression rewrites most bytes even for a small visual shift, putting them well
under git's 50% rename threshold. So commit ordering determines whether the 427 images are
reviewable at all:

- Rename and regenerate in one commit → 427 unpaired deletions plus 427 additions, no
  comparison UI.
- Rename in one commit, regenerate in the next → the regeneration is a true modify at a
  stable path, which GitHub renders with its image diff viewer (2-up, swipe, onion skin).

Required ordering, therefore:

1. `git mv theSrc/test/snapshots/travis theSrc/test/snapshots/ci`, committed alone with no
   other change.
2. Config changes (workflow, `overrides`, `waitFor` fixes, puppeteer args).
3. Regenerated baselines from the `update_snapshots` dispatch, committed alone.

Caveat: the PR's cumulative **Files changed** tab compares `master...head` and will still
show add/delete pairs. Review the regeneration commit individually via the Commits tab.

This also means the branch must not be squash-merged if the paired diff is to survive in
history. It is only needed for review, so squashing on merge is acceptable.

## Out of scope

- **`eslint-plugin-only-warn`.** `.eslintrc` loads it, downgrading every error to a
  warning, so `eslint.failAfterError()` never fires and `gulp lint` cannot fail. Lint is
  included in CI because the warnings are useful in the log, but it is not a gate.
  Removing `only-warn` would surface a backlog of existing violations and belongs in its
  own change.
- **Upgrading jest (26) or jest-image-snapshot (3.1.0).** Neither touches the browser;
  no reason to disturb them here.
- **Checking the committed `inst/` bundle matches source.** The compile step verifies the
  bundle builds, not that the committed artefact is up to date. Worth doing separately, but
  it needs a byte-deterministic build first.

- **`gulp build` and the `clean` hazard.** The CI job deliberately runs
  `gulp core compileWidgetEntryPoint` rather than `gulp build`. `build` begins with `clean`,
  which deletes `['browser', 'inst', 'man', 'R', '.tmp']`. `R/` is restored by `copy`, but
  the tracked `man/CombinedScatter.Rd` is only regenerated by `makeDocs`
  (`r --no-save <<< "library(devtools); document()"`), which is unavailable on the runner
  and swallows its own failure via an unconditional `done(null)`. So `gulp build` silently
  deletes a tracked file wherever R is absent. Fixing that belongs upstream in
  rhtmlBuildUtils, not here.
- **Sharding the visual suite** across a matrix to cut wall-clock time.

## Risks

- The initial regeneration is a large, hard-to-review diff. Mitigated by landing it as its
  own commit, separate from the config changes.
- Modern Chrome may render differently enough that some tests fail for real layout reasons
  rather than needing new baselines. Expect to triage a handful.
- Chromium ~101 is still three years old. It runs on `ubuntu-24.04` with `--no-sandbox`,
  but the old Chromium download must still resolve from Google's storage at install time.
  If it does not, the fallback is `PUPPETEER_DOWNLOAD_HOST` or a newer puppeteer paired
  with a jest upgrade.
- The puppeteer/jest pairing is load-bearing and non-obvious. A future dependency bump that
  moves either one can silently break the visual suite; the loadability test is what
  catches it.
- `acceptNewSnapshots` defaults to `true`, which passes `--ci=0` to jest. A snapshot with
  no existing baseline is therefore written and **passes** rather than failing. Renaming a
  test silently creates a new baseline instead of erroring. Not a blocker, but it means a
  green visual job does not by itself prove every baseline was actually compared.
- Node 22 is unverified for the compile step and `gulp testVisual`. There is a known pattern of
  older rhtml* toolchains failing on Node 22 (gulp 3 / `natives` / `graceful-fs`), but this
  repo is on gulp 4 and its unit tests pass on Node 22, so the risk is modest. If the build
  does break, adding a `graceful-fs` resolution is the usual fix; dropping CI to Node 18 is
  the fallback.
