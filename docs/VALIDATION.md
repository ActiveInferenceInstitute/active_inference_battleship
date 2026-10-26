# Validation receipt — 2026-10-22

Historical v0.1 baseline receipt. For the current Decision lab extension, see [v0.2 validation](DECISION_LAB_VALIDATION.md). Its source and capture manifests supersede the baseline manifests named below; original baseline bytes are retained in the pre-extension archive.

This receipt describes the local finite-catalogue application and the evidence produced for it. It does not certify unrestricted Battleship, the whole upstream GNN pipeline, a deployment, native Safari, or biological/scientific efficacy.

## Executable model

The bridge imports `gnn.parsers.markdown_parser.MarkdownGNNParser` from the existing local upstream checkout using its external Python 3.11 environment. Its checked contract supports static fleets, dynamic discrete observation steps, and a one-shot planning horizon.

| Binding | Value |
| --- | --- |
| GNN specification SHA-256 | `a425a3f6b0bdc8cb28a165f92c27c6ea329d3e48d2ea3f16136a93fbb447c91c` |
| Upstream Git revision | `073f21d5b25c403d1ef0c965dd945bb2287d4de4` |
| Parser-directory source digest | `1dea8f4f8fad2351fed768177d48512ef91a177d38e51ff1e95fb942f2c1ffdf` |

The generated model lists every file in the parser digest. That source binding is intentionally narrower than a transitive dependency closure. The upstream checkout and Python environment were preserved.

## Numerical, rules, replay, and source checks

`bun run check` passed lint, **45 tests**, model freshness, strict TypeScript checking, and the production build. Bun measured 100% line coverage for all imported `src/core` modules; aggregate imported-module line coverage was 99.28%. This is not UI or upstream Python coverage.

`bun run test:negative` retained real failing test output for all three deliberately broken implementations: disabled Bayes update, reversed epistemic sign, and disabled repeat-shot guard. The primary run is under GitVault `Local/cache/active-inference-battleship/tmp/negative-controls-6Oa6Jc`; the independent rerun is `negative-controls-tIHqaa`.

Independent source/model review round 3 passed after reproducing and repairing five findings from earlier rounds:

1. Coalescing action-equivalent control/mode/shuffle changes keeps valid session exports reimportable. A regression applies 1,201 cycles before gameplay and replay reconstruction.
2. The bridge retains parsed time semantics and rejects unsupported horizons and continuous time.
3. Duplicate variable names are rejected before constructing the dimension lookup.
4. Expected log-preference reward is the normalized expectation `−risk`.
5. Realized KL uses retained log probabilities so a tiny positive likelihood can recover from underflow without producing infinity.

The independent review checked 1,410 action cases against a separate direct-probability oracle, with maximum discrepancy `1.1e−14`. Nine noise values, including `Number.MIN_VALUE`, produced finite diagnostics for both actors; maximum VFE identity residual was `5.6e−16`. Restoring the faulty prior-weight KL in an external copy reproduced infinity and caused the new regression to fail. Throwing selected-truth getters verified both assistants' observation boundary.

The independent results and 40-file source manifest are retained under GitVault `Local/cache/active-inference-battleship/tmp/source-gate-r3-NLHtqr`. Numerical approval remains scoped to this declared finite model.

## Browser evidence

The fresh production browser run passed **17 scenarios in 72.0 seconds**, with zero skipped, unexpected, or flaky cases. See [`test-results/results.json`](../test-results/results.json). Installed Chrome exercised 1440 × 1080 desktop, 1920 × 1080 wide layouts, and iPhone 14 geometry/touch with Chromium at DPR 3. This is mobile emulation, not execution in Safari.

The [capture manifest](../.cache/capture-manifest.json) records **332 PNGs**: 258 browser-test images (including 181 overlapping mobile segments and 36 pointer-state frames), 64 native-zoom viewport frames, one browser-setup frame, and nine startup/motion/error probe frames. All three tabs appear in both themes at 390, 1440, and 1920 CSS-pixel widths, with complete page coverage and scrolled ends. Additional states cover live gameplay, opponent diagnostics, expanded source, victory/defeat, offline guide access, import progress/cancellation, worker failure, legible disabled controls, and normal/reduced-motion pointer feedback. The largest image is 5,097 physical pixels tall. Main matrix states passed horizontal-overflow and axe WCAG A/AA checks. The [38-file executable-source manifest](../.cache/source-manifest.json) binds the reviewed application, model, bridge, scripts, and tests.

A separate real Chrome probe retained startup loading, worker script loading failure, the actual 30-second timeout, successful retry after each failure, hover transition frames, keyboard focus, reduced motion, malformed replay preservation, and already-loaded gameplay while offline. Its timeout fired after 30,143 ms. Evidence is under [`.cache/browser-states/2026-10-22T21-10-05.161Z`](../.cache/browser-states/2026-10-22T21-10-05.161Z/results.json); the reproducible probe is [`.cache/browser-state-probe.ts`](../.cache/browser-state-probe.ts). Network faults were deliberately induced in Chrome; the application clock and worker client remained real. This does not claim browser `messageerror` fault coverage or fresh offline installation/loading. The guide is bundled with the application, and resident offline guide navigation is a permanent E2E regression.

The [native 200% Chrome zoom probe](../.cache/native-zoom/2026-10-22T21-10-05.650Z/results.json) selects Page zoom = 200% in an isolated Chrome profile's own settings. Outer width stays 1440, layout width changes from 1440 to 720, device-pixel ratio changes from 1 to 2, and CSS zoom remains 1. All three views and both themes were captured with unclipped native viewport screenshots, including their complete scroll ranges. This exposed and repaired a shrinking theme selector; the header now wraps before its labels are clipped. The [probe script](../.cache/native-zoom-probe.ts) verifies the control width and physical frame width. Earlier Playwright zoom screenshots cropped the native viewport; those artifacts are retained, and the final packet uses direct unclipped Chrome captures instead.

`bun run test:hmr` passed an actual Vite hot update in Chrome, creating the replacement fleet worker without duplicate React-root or unmounted-root errors.

The [real worker API probe](../.cache/worker-api-results.json), reproduced by [its retained script](../.cache/worker-api-probe.ts), exercised the browser client through an actual Vite module and real Chrome workers. Pre-aborted and subsequently cancelled requests rejected with `AbortError`; an uncloneable request rejected with the browser's `DataCloneError`; invalid seed/replay requests rejected through the real worker; a valid creation returned a ready game. No workers remained afterward. No worker or clock implementation was mocked.

Independent visual round 1 reproduced failures despite the earlier green browser checks. The [retained red reproductions](../.cache/visual-red/results.json) establish offline guide session loss, missing import feedback, inaccessible autoplay pause outside Play, and raw replay validation errors. The original 44-image packet is preserved under GitVault `Local/artifacts/active-inference-battleship-visual-r1-revise`, including the corrupted tall mobile image.

Repairs bundle the guide, pause autoplay outside Play, expose cancellable operation progress on every view, localize concise replay errors, align DOM/visual focus order, enlarge reading text and ordinary touch areas, constrain prose measure, add a selected navigation marker and plain view titles, and use labeled mobile table records. Essential boundary contrasts against raised/panel backgrounds are 4.75/5.40 in dark mode and 3.84/4.48 in light mode. Long captures now use viewport segments with 200 CSS pixels of overlap instead of exceeding Chromium's full-page compositing limit.

Round 2 accepted these repairs and found remaining small metric/dial explanations, faded disabled controls, missing pointer feedback, and unproved native zoom. Reading explanations now use 15px, disabled controls retain opaque contrast, and text/navigation/candidate actions have distinct hover/pressed states with reduced-motion support. The permanent browser regression measures computed sizes/contrast and verifies 12 pointer-state cases with 36 frames. A real reduced-motion probe caught a cascade override before the final capture; its failed frames remain under `.cache/interactions/2026-10-22T20-55-04.450Z`.

Both independent read-only round 3 visual reviews returned **PASS**, with no blocking product or capture-integrity findings. Each reviewer directly opened all 332 PNGs and verified the capture hashes/signatures/dimensions, all 38 executable-source hashes, and capture freshness. The [complete per-item review synthesis](VISUAL_REVIEW.md) records 54 PASS and 13 N/A across all 67 checklist items. Approval is bounded to the frozen source and supplied Chrome evidence; browser `messageerror` injection, native Safari, physical devices, screen-reader interpretation, fresh offline installation and deployment remain outside the verdict. The separate numerical R3 approval was not rerun or renewed by visual review.

## Local performance

The [fresh Lighthouse reports](../.cache/performance/2026-10-22T21-11-28.891Z/summary.json) contain three mobile and three desktop runs after the final repairs. All six scored **100 performance, 100 accessibility, 100 best practices, and 100 SEO**. Desktop form factor was explicitly checked against Lighthouse's desktop configuration. Earlier red reports are retained alongside the passing run; the first baseline's mislabeled desktop results were not counted as desktop evidence.

These are loopback production-build measurements, not deployed-network guarantees. Functional acceptance is separate from Lighthouse scoring.

## Custody and reproducibility

Source, build outputs, browser profiles, temporary files, and caches remain on GitVault. A repository lease protected the build. No commit, remote publication, or deployment was performed. The production preview is served on loopback port 5186; stop it before running the development server on that same strict port.

Reproduce the checks using [the verification protocol](VERIFICATION.md) and [the setup instructions](../README.md). Preserve failed reports before rerunning Playwright, since its output directory is reused. Retained external red browser artifacts include `Local/artifacts/active-inference-battleship-e2e-first-failure`, `active-inference-battleship-e2e-second-failure`, and the JSON-import failure report. A green earlier run is also retained separately from the final matrix.
