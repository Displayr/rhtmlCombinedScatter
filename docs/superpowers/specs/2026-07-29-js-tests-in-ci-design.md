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

## Key constraint: puppeteer 3.3.0

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

### Sizing the upgrade

Every puppeteer API the harness uses is still current: `puppeteer.launch`,
`browser.newPage/pages/close`, `page.goto/close/evaluate/click/type/$/$$/mouse.*/screenshot/waitForFunction`.

Exactly one removed API, `page.waitFor(ms)`, at four call sites:

- `theSrc/test/bin/resize.jest.test.js:44,70,91` — repo-local, trivial
- `rhtmlBuildUtils/src/lib/renderExamplePageTest.helper.js:106` — the only one outside this repo

`build/config/widget.config.js` overrides `consoleLogHandler` and uses `msg.args()` (still
current), so the default handler's internal `msg._text` is not a problem.

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
| `unit` | `npm ci` → `gulp lint` → `gulp testSpecs` → `gulp build` |
| `visual` | `npm ci` → apt fonts → `gulp testVisual --env=ci` |

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

### Puppeteer modernisation

- Add `"overrides": { "puppeteer": "^24" }` to `package.json` and regenerate
  `package-lock.json`. npm `overrides` applies transitively, so rhtmlBuildUtils resolves to
  the new version without a fork.
- Fix the three `page.waitFor(1000)` calls in `theSrc/test/bin/resize.jest.test.js` to
  `await new Promise(r => setTimeout(r, 1000))`.
- Fix the fourth call site upstream as a one-line rhtmlBuildUtils `7.2.7` tag and bump the
  ref here. `setTimeout` works on every puppeteer version, so this cannot break the other
  rhtml* widgets, and they stay on `7.2.6` until they choose to move.
  Fallbacks if touching the shared repo is undesirable: pin puppeteer below the removal, or
  patch `Page.prototype.waitFor` in test setup.
- Add `args: ['--no-sandbox', '--disable-dev-shm-usage']` to `snapshotTesting.puppeteer` in
  `build/config/widget.config.js`.

`preinstall` already skips `npm-force-resolutions` when `CI=true`, which GitHub Actions
sets automatically, so `npm ci` works as-is. The existing `resolutions` block stays for
local installs; `overrides` and `resolutions` coexist.

### Rendering determinism

- Fonts installed explicitly: `fonts-liberation`, `fonts-dejavu-core`,
  `fonts-noto-color-emoji`, so text metrics don't drift with the base image.
- Cache `~/.cache/puppeteer` alongside the npm cache from `actions/setup-node`.
- Node pinned to 18 to match `engines` (`>=18.15.0`) and the version CircleCI used
  (18.16.0). Unit tests are confirmed working on Node 22 locally, but `gulp build` on
  Node 22 is unverified, so 18 is the low-risk choice.

### Baselines

- Regenerate under a new env name: `--env=ci`, writing to `theSrc/test/snapshots/ci/master/`.
- Delete `theSrc/test/snapshots/travis/`.
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

## Out of scope

- **`eslint-plugin-only-warn`.** `.eslintrc` loads it, downgrading every error to a
  warning, so `eslint.failAfterError()` never fires and `gulp lint` cannot fail. Lint is
  included in CI because the warnings are useful in the log, but it is not a gate.
  Removing `only-warn` would surface a backlog of existing violations and belongs in its
  own change.
- **Upgrading jest (26) or jest-image-snapshot (3.1.0).** Neither touches the browser;
  no reason to disturb them here.
- **Checking the committed `inst/` bundle matches source.** `gulp build` in the `unit` job
  verifies the bundle compiles, but not that the committed artefact is up to date. A
  worthwhile separate check.
- **Sharding the visual suite** across a matrix to cut wall-clock time.

## Risks

- The initial regeneration is a large, hard-to-review diff. Mitigated by landing it as its
  own commit, separate from the config changes.
- Modern Chrome may render differently enough that some tests fail for real layout reasons
  rather than needing new baselines. Expect to triage a handful.
- The `overrides` approach is unverified until installed. If puppeteer 24 breaks something
  in rhtmlBuildUtils beyond `waitFor`, the fallback is stepping back a major version.
- Which puppeteer release removed `page.waitFor` is from recollection, not checked. Verify
  empirically during implementation rather than trusting it.
