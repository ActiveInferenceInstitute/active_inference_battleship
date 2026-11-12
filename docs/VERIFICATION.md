# Verification protocol

Use `bun run gate` (default `fast`) for the development loop and `bun run gate all`
for the full release check. `bun run check` is an alias for `fast`, not the former
full build/test chain. The runner binds temporary directories and caches to
GitVault, preserves nonzero exits, and runs locally installed tools. Browser
acceptance is separate and requires installed Google Chrome and a current
production build. No testing framework mocks are used. See the
[run guide](RUN_GUIDE.md) for prerequisites and
[generated gate timings](_generated/gate-timings.md) for measured results.

## Gate selection

| Command | Scope |
| --- | --- |
| `bun run gate` / `bun run gate fast` / `bun run check` | Lint, types, documentation links/index, and fast tests; no parser, package build, production build, or coverage. |
| `bun run gate lint` | Installed Biome check. |
| `bun run gate types` / `bun run typecheck` | Strict TypeScript check. |
| `bun run gate docs` | Relative documentation links and the flat index. |
| `bun run gate test:fast` | All `tests/*.test.ts` except `model.test.ts` and `package.test.ts`, without coverage. |
| `bun run gate test:full` / `bun run test` | Full package build and all Bun tests with coverage, including the real Python parser and installed-package subprocess suites. |
| `bun run gate gnn` / `bun run model:check` | Pinned-parser compiled-model freshness check. |
| `bun run gate build` / `bun run build` | Pinned-model check, types, and production dashboard build. |
| `bun run gate all` | Lint, types, docs, full tests, and production build; shared GNN work runs once within this invocation. |

Fast checks intentionally make no integration or coverage claim. Full tests retain
every suite; excluding the two integration files from `test:fast` does not remove
them from `test:full`. Neither gate automatically runs browser acceptance,
negative controls, Lighthouse, or manuscript rendering.

## Numerical and rule checks

`bun run gate test:full` (also `bun run test`) executes all Bun suites, including:

- Independent two-hypothesis examples: noiseless elimination, 9:1 noisy posterior odds, multi-observation evidence, KL and entropy identities, and the exact VFE/surprise identity.
- EFE: log 2 information for an uncertain perfect-sensor shot, both decompositions at β=1, neutral preference/zero-learning uniformity, zero-precision habit recovery, unavailable actions, stable softmax, and policy sampling.
- Decision explorer: independent noisy/noiseless counterfactual entropies, weighted entropy/information identity, impossible versus tiny possible outcomes, recovery from underflowed prior mass, cached dimensions, β/γ sweeps, comparative log odds and preset normalization.
- Legal fleets across fixed seeds, edge placements, malformed/overlapping fleets, impossible fleet rules, launch/turn/repeat/terminal rules, victory and defeat, metadata stripping, and deterministic random streams.
- Full seeded self-play, no repeated shots, replay with changed settings and shuffled deployment, truth-independent assistant behavior, malformed/oversized/incompatible/out-of-order replay rejection.
- The actual upstream Python import and strict post-parse rejection of changed equations, state dimensions, duplicate parameters, and graph semantics.

Coverage is generated only by the full Bun test arm over the modules those tests
load. It is not rendered UI coverage, Python bridge branch coverage, or upstream
pipeline coverage. The UI is exercised separately in Chrome. Current gate counts
and timings belong in the generated timing document, not a hand-maintained table
here. Retained run receipts bind their own source and environment; historical
receipts do not automatically accept later changes.

## Checks that can fail

`bun run test:negative` makes separate preserved copies under the external temporary directory and deliberately breaks:

1. The Bayesian posterior update.
2. The epistemic sign in expected free energy.
3. The repeat-shot guard.
4. The hypothetical hit/miss likelihood direction.

It runs the relevant real test against each modified copy. Every mutant must produce a failing test and nonzero exit; otherwise the negative-control runner fails. Full output and a JSON result remain beside each mutant. Production source files are never altered by this runner.

The GNN freshness gate also fails for a stale generated artifact. Unsupported equations and invalid imports must remain errors, never fallback models. Browser tests exercise a malformed replay through the real file input and require a visible error while preserving the game.

## Browser matrix

`bun run build && bun run test:e2e` starts an isolated production preview on 5187 and launches installed Chrome. One worker avoids concurrent state/port collisions. It covers desktop 1440 × 1080 and iPhone-14 geometry/touch emulation, both themes, and every tab. Mobile emulation uses Chromium; it is not a claim of native Safari execution.

Scenarios cover launch/shuffle, keyboard coordinate navigation and focus order, manual and suggested shots, slider changes, diagnostic history, source expansion, replay download/import/resumption, autoplay pause/resume and pause outside Play, complete terminal self-play, disabled terminal firing, concise malformed-replay feedback, resident offline guide access, delayed import progress and cancellation on both information views, real worker script loading failure/retry, horizontal overflow, reduced motion, and axe WCAG A/AA checks.

The Decision explorer adds six map layers, coordinate/row inspection, both actors, exact equation disclosure, β/γ sweep values, snapshot download, comparison against an unchanged replay, explicit apply without firing, copy/discard, and resident offline entry. The four-view matrix covers the lab in both themes at 390/1440/1920; delayed import/cancellation includes all three information views. Biome explicitly includes `e2e/**` as well as application, core and script sources.

Screenshots cover complete pages and scrolled ends. When a page would exceed 12,000 physical pixels, the capture helper saves overlapping viewport segments, with 200 CSS pixels of overlap, rather than a tall full-page PNG. This avoids a reproduced Chromium compositing defect that repeated content at physical row 16,384. Inspect every segment, including the specification's end and footer; a valid PNG header and dimensions alone do not prove visual integrity. Traces are retained for failed tests.

The secondary-label/disabled-control regression measures real computed font sizes, opacity, foreground/background contrast, and boundary contrast in both themes. It supplements axe, which did not expose the earlier essential-edge or explicitly required disabled-state contrast defects. The accepted compact board and 14px data-table exceptions do not apply to ordinary reading labels.

The readability regression checks the leading marker across all six maps in both themes, effective chart/inspector text sizes, and system-theme changes during a real worker startup failure. It also retries startup and verifies that a manual theme choice survives later system changes. All three tests failed against the prior build before the fixes. Chart axes now use shared 15px HTML labels outside scaled SVG geometry; history charts also expose a values table and a point for a single observation. Dense board gaps and corners use named 3px geometry tokens documented in DESIGN.md.

History-axis alignment additionally measures label centers against their corresponding actual SVG points for 1, 3, 4 and 10 observations, in all three charts at phone and desktop widths. Each offset must be below one CSS pixel, and every axis label must stay within its figure bounds (0.5 CSS px measurement tolerance). These checks failed before the coordinate-based tick and trailing-gutter fixes; every count is captured separately so even-history or multi-digit endpoint errors cannot hide behind a single-point default screenshot.

`test-results/results.json` is the machine-readable report. Preserve a failing run outside that directory before the next run, since Playwright normally reuses its output directory. Native screen-reader interpretation, real-device Safari, multiplayer security, and deployed-network performance require separate evidence.

## Source and runtime checks

`model:check` (the `gnn` arm) imports the parser from the canonical pinned upstream
commit and compares deterministic generated bytes, including the source
specification, upstream revision, and parser-directory source digest. It does not
substitute the checkout's working HEAD. A stale result is an error. The bridge
checks real Python prefix/base-prefix custody on GitVault before importing.
[`models/gnn.pin.json`](../models/gnn.pin.json) uses `gnn-importer-pin/v1` and pins
`v5.1.0` at `75c834bd8519dc7b5adc4d24f16bf393cfd1ecdf`; the pinned revision's own
`gnn.importers` reader, not a local copy, validates the pin, the
[pointer](../.github/GNN.md) and the specification.
`typecheck` and `lint` run strict TypeScript and the installed Biome binary.
`audit:react` scans actual source paths; a zero-file scan is not evidence.

Hosted CI runs `bun run gate all` in job `model-check`, displayed as
`gnn conformance (pinned)`. It installs dependencies once and uses commit-pinned
`oven-sh/setup-bun` and `astral-sh/setup-uv` actions, not an organization composite
Python/uv action. Its vault-shaped root and managed interpreter preserve the same
Python custody requirement. See the [CI pointer](../.github/GNN.md).

Biome's `useLiteralKeys` rule is disabled because this project intentionally enables TypeScript `noPropertyAccessFromIndexSignature`; indexed environment/dataset access uses bracket notation to satisfy that stricter type contract. No numerical tests or accessibility rules are disabled to make gates pass.

## Performance

`audit:performance` attaches Lighthouse's API to a real Playwright-launched Chrome production session and saves three mobile and three desktop reports. It rejects a median below 100 in performance, accessibility, best practices, or SEO. Runtime and bundle sizes are observations, not scientific performance claims. Retain red reports and diagnose individual audits before repeating. A local result does not certify a future deployment.

## Independent review

The final matrix additionally captures both agent perspectives, a live game, expanded GNN source, explicit victory and defeat, and a real overlapping-worker scenario. The race check waits for both workers to terminate and verifies that the newer imported seed and game remain applied. The long-history regression exercises 1,201 controls/mode/shuffle cycles through export and import. Temporal and duplicate-variable regressions parse real altered GNN files upstream.

Keep implementation verification separate from independent audit. Reviewers receive the exact current source, model provenance, retained red/green results, and fresh screenshots. They inspect the observation boundary, equations, replay, errors, real rendered states, and source custody. A passing narrow check never certifies the entire upstream GNN project or an external release.
