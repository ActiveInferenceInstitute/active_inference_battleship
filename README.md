# Active Inference Battleship

A playable browser Battleship game and an inspectable active inference dashboard from the **Active Inference Institute**, specified in **Generalized Notation Notation (GNN)**. GNN is a generative-model notation, not a graph neural network. The build **imports the actual local GNN Python parser**, checks a deliberately bounded model contract, and compiles its declarations and provenance into the browser application. Tested TypeScript code implements the supported mathematics. [Follow the specification-to-runtime path](docs/GNN_SPECIFICATION.md).

**Public release v0.4.0.** [Source and release downloads](https://github.com/ActInfInstitute/active_inference_battleship/releases/tag/v0.4.0) · [Manuscript DOI: 10.5281/zenodo.23670188](https://doi.org/10.5281/zenodo.23670188). The Zenodo record archives the manuscript and reproducibility companions. Software is MIT licensed; the manuscript and original figures are CC BY 4.0. No npm registry publication or separate software DOI is claimed. [Release and citation details](docs/RELEASE_PLAN.md).

## Start with the public release

[Play the live dashboard](https://actinfinstitute.github.io/active_inference_battleship/) · [Read the online manuscript](https://actinfinstitute.github.io/active_inference_battleship/paper/) · [Download the DOI-bearing PDF](https://github.com/ActInfInstitute/active_inference_battleship/releases/download/v0.4.0/active_inference_battleship_combined.pdf).

Download `active-inference-battleship-dashboard-v0.4.0.zip` from the release, extract it, and serve its folder with any static HTTP server. Download the reader ZIP for the complete paper and its linked research companions. Neither built interface requires Python or a GNN checkout at runtime; the paper reader uses an external MathJax resource for notation and includes PDF/Word alternatives.

For a source clone:

```sh
git clone https://github.com/ActInfInstitute/active_inference_battleship.git
cd active_inference_battleship
bun install --frozen-lockfile
bun run demo
# Build the dashboard from the checked-in compiled GNN model:
bun run build:dashboard
```

These convenience commands use the checked-in, source-bound compiled model. They do not reparse arbitrary GNN or renew parser verification. The full parser/import, scientific, and manuscript workflows below retain their explicit pinned dependency and GitVault environment contracts. The downloadable core tarball works with Node 26 or Bun and includes TypeScript declarations.

Play against an agent, follow your assistant's suggested shots, or run both sides automatically. Change epistemic weight, hit preferences, policy precision, assumed sensor noise, and a spatial habit prior while watching the beliefs and action scores change.

**Decision explorer** explains any available action, compares an isolated settings sandbox with the live policy, and shows hypothetical hit/miss updates. Switch between six diagnostic maps, compare hit probability with information gain on fixed axes, explore illustrative strategy presets, sweep epistemic weight or policy precision, inspect the GNN factors, and export the full analysis. **Model & guide** explains the parser/adapter/runtime boundary and downloads the verbatim GNN source and compiled model. [Decision explorer guide](docs/DECISION_LAB.md).

**Manuscript and research:** a scholarly methods manuscript derives the model, engages 34 sources—32 scholarly works, the pinned GNN software, and the manufacturer manual—and retains an analytic example and the original descriptive study. The scholarship dossiers distinguish full-text, selected-passage, abstract-only, and OCR reading limits. A prospectively specified follow-up adds 1,280 paired strategy searches, three endpoints, 24 Holm-adjusted sign tests, paired mean-effect intervals, and explanatory figures. PDF, HTML, and DOCX editions use the actual local docxology/template renderer. [Reproduce the paper and inspect its evidence](docs/MANUSCRIPT.md).

**Core package and headless commands:** build a browser-independent ESM interface with TypeScript declarations, run a full game to a resumable replay, or analyze either actor without the dashboard. The package includes the checked compiled GNN model and preserves impossible log weights explicitly in JSON. It is distributed as a GitHub release tarball; it is not published to a package registry. [Package, CLI, and analysis-format guide](docs/PACKAGE.md).

```sh
bun run build:package
node lib/cli.js play --seed 1943 --catalog-size 256 --output game.json
node lib/cli.js analyze game.json --actor player --output analysis.json
```

Those commands assume the source checkout prerequisites below. A built local archive can instead be consumed by Node or Bun without Python or a local GNN checkout. The source README's browser/research links describe the full repository; local archive consumers should start with the package guide.

## Run locally

Source development requires Bun 1.4.4 or later (current verification: 1.4.4), uv, a mounted GitVault checkout, and the local `ActiveInferenceInstitute/Public/Generalized_Notation_Notation` repository with its working Python environment. Google Chrome is additionally required for the browser tests and performance audit. The application itself has no browser extension, login, cloud service, API key, or runtime Python requirement. The built core package also runs in Node; see its separate runtime qualifications in the [package guide](docs/PACKAGE.md).

From this project directory:

```sh
task_vault_root="$(cd ../../../.. && pwd)"
export TMPDIR="${task_vault_root}/Local/cache/active-inference-battleship/tmp"
export BUN_INSTALL_CACHE_DIR="${task_vault_root}/Local/cache/active-inference-battleship/bun"
export UV_CACHE_DIR="${task_vault_root}/Local/cache/active-inference-battleship/uv"
export UV_PYTHON_INSTALL_DIR="${task_vault_root}/Local/runtimes/uv-python"
export UV_LINK_MODE=copy
mkdir -p "${TMPDIR}" "${BUN_INSTALL_CACHE_DIR}"
bun install --frozen-lockfile
bun run model:check
bun run dev
```

Open **http://127.0.0.1:5186**. The server binds to loopback. Its port is strict: a conflict fails visibly instead of selecting a different port.

All project task scripts bind caches and temporary directories to GitVault automatically. The exported variables above also keep the initial package installation external. Preserve GitVault repository leases when running development/gates alongside other owners; do not remove lock files. The public source is versioned in the repository linked above; local private development copies may retain independent Git state.

To rebuild after an intentional GNN specification change:

```sh
bun run model:import
bun run check
```

The importer resolves the canonical GNN checkout beneath the detected vault root, so isolated staging copies work at different directory depths. Override `GNN_ROOT` and `GNN_PYTHON` when needed. Both Python's `sys.prefix` and `sys.base_prefix` must resolve on GitVault. The current integration uses the upstream environment's Python 3.11, without changing that environment or the upstream repository. Do not replace its Python or install into it just to run this project.

For a production build:

```sh
bun run build
bun run preview
```

Stop the development server before starting the preview on the same port. `dist/` is a static application and can be served by another static server. It includes the checked compiled model, so a deployed browser does not need the upstream repository.

## Play

1. Choose a seed and catalog size, then select **New game**. These two settings apply to the next game.
2. Optionally shuffle your fleet, then **Launch game**. Deployment is a legal catalog shuffle; there is no manual placement editor.
3. Select a target cell and press **Fire**. Arrow keys move through the board; Enter/Space selects. Touch uses selection followed by the Fire button.
4. Your opponent fires once in response. Hits do not grant extra turns. Sink all five ships to win.
5. **Fire suggested shot** uses the current policy selection mode. **Autoplay both agents** runs full self-play; Pause stops it. Leaving Play pauses autoplay.
6. Inspect the **Diagnostics** and **Model & guide** tabs. Change controls at any time. **Export replay** saves the complete seed and event history; import reconstructs and resumes it.

The default game has a 10 × 10 board with ship lengths 5, 4, 3, 3, 2. Ships may touch; they cannot overlap, bend, wrap a row, or leave the board. A terminal game reveals the opponent's fleet and disables firing. A new game stops autoplay.

Replay seeds reconstruct hidden fleets. This is a local teaching/research tool, not a secure multiplayer system. Imported files are size-bounded, parsed with strict schemas, and rejected if their model hash or legal event order does not match. An invalid import leaves the current game intact.

## Model and scientific scope

Diagnostics can inspect either the player assistant or the opponent. Catalog generation and replay reconstruction run in a Web Worker so the browser remains responsive. When two session requests overlap, only the newest result is applied.

Session operations show progress beside the replay controls on every view. **Cancel operation** terminates the pending worker and preserves the previous game. Replay errors appear beside Import with short recovery instructions. The guide ships with the application, so opening it does not require another network fetch after the app has loaded.

Replay files retain every shot and the settings that determined each action. Repeated controls/mode changes between shots are coalesced to their last effective values; pre-launch shuffles retain an absolute count. This bounds the trace without discarding action-relevant state, even after thousands of slider events.

The hidden state is a **complete fleet in a finite catalog**, not an independent Bernoulli variable per cell. Every catalog fleet is legal. Each hidden board is drawn from the same catalog with an independent environment random stream. The agent receives only cell indices and binary hit/miss observations; it never receives the selected fleet, index, or sunk-ship metadata.

Bayesian inference is exact **conditional on this finite catalog**. The catalog is a biased sample of the full legal fleet space, generated by bounded randomized backtracking. Duplicate fleet entries retain separate prior mass. Narrowing a finite catalog can make the game substantially easier than unconstrained Battleship. This project makes no optimality, biological, learning, or general performance claims.

The implementation has a one-shot planning horizon, a static transition model, a fixed observation likelihood, and no parameter learning. At epistemic weight 1, the objective is the standard risk/ambiguity or preference/information decomposition used here. Other epistemic weights give a deliberately generalized objective. [The mathematical specification](docs/MODEL.md) defines every quantity and limitation.

The assumed sensor noise is subjective model uncertainty. The actual game reports deterministic hits and misses. Changing this slider replays the entire observation history under the new likelihood. Diagnostic history plots show this current-settings reconstruction; exported events preserve the settings that were used for actual action selection.

## Controls and diagnostics

| Control | Range | Meaning |
| --- | --- | --- |
| Epistemic weight β | 0–4 | Multiplier on expected information gain |
| Hit preference | 0–8 | Hit-versus-miss log preference |
| Policy precision γ | 0–32 | Concentration around low expected-free-energy actions |
| Assumed sensor noise ε | 0–0.25 | Agent's symmetric hit/miss flip likelihood |
| Center habit | 0–4 | Spatial bias in the policy prior E |
| Action selection | sample / highest probability | Sample the normalized posterior, or take its maximum |
| Autoplay interval | 100–2000 ms | Delay between complete player/opponent rounds |
| Fleet catalog | 256–16384 in UI | Number of latent fleet labels, for the next game |

Diagnostics include posterior fleet entropy, occupancy heatmap, effective hypotheses, support size, expected information gain, observation ambiguity, preference cross-entropy, outcome KL risk, expected log-preference reward, generalized expected free energy, habit probabilities, normalized policy probabilities and entropy, per-shot surprise, realized Bayesian KL, variational free energy, its exact-Bayes identity residual, cumulative log evidence, and per-shot/mean Brier score. Dials display learning weight and policy precision; the numbers and native meters expose the same values accessibly.

## Architecture and composition

| Module | Responsibility |
| --- | --- |
| `models/battleship.gnn.md` | Authoritative supported GNN model |
| `scripts/parse_gnn.py` | Read-only import of upstream `MarkdownGNNParser` |
| `scripts/contract.ts`, `import-model.ts` | Contract checks, source hashes, compiled-model freshness |
| `src/generated/model.json` | Deterministic, source-bound compiled model |
| `src/core/analysis.ts` | Counterfactual updates, policy sensitivity, log-odds comparisons, illustrative presets |
| `src/core/fleet.ts` | Legal fleet construction, catalog sampling |
| `src/core/game.ts` | Immutable game rules and observation capability |
| `src/core/inference.ts`, `math.ts` | Exact categorical Bayes, diagnostics, one-step policy |
| `src/core/random.ts` | Explicit reproducible random streams |
| `src/core/session.ts` | Event application, policy/environment wiring, strict replay |
| `src/ui/useBattle.ts` | Browser session lifecycle and UI actions |
| `src/ui/Board.tsx`, `Controls.tsx` | Reusable game board, sliders, dials |
| `src/ui/BattleBoards.tsx`, `PlayView.tsx` | Gameplay composition |
| `src/ui/Diagnostics.tsx`, `Guide.tsx` | Diagnostic views and model explanations |
| `src/ui/DecisionLab.tsx` and its map/receipt/sensitivity/sandbox/factor components | Isolated decision experiments and GNN interpretation |
| `DESIGN.md`, `src/tokens.css` | Visual tokens, component and responsive contracts |

The core has no React, DOM, network, hidden mutable random state, or server dependency. [API examples](docs/API.md) show how to use it in another interface or simulation. The UI uses React/Vite, native SVG diagnostics, Phosphor icons, and CSS tokens. Light/dark themes and reduced motion are supported. React inspection tools are development-only and opt-in with `VITE_INSPECT_REACT=1`; production builds remove that branch.

## Verification

```sh
bun run check             # lint, numerical/game/replay/import tests, freshness, types, production build
bun run test:negative     # real broken-code controls in preserved external copies
bun run test:e2e          # Chrome desktop/mobile gameplay, replay, full self-play, axe, screenshots
bun run test:browser-matrix # 70 source-bound cases; each new case gets a fresh browser process
bun run audit:react       # actual src scan; no telemetry or remote dependency scan
```

`test:e2e` serves the existing production `dist/` on port 5187; run `build` first. Reports, screenshots, and failed traces are retained under `test-results/`. Numerical coverage reports describe the **imported core, model schema, and contract helpers**, not UI coverage or the whole upstream repository. Browser tests exercise the real rendered UI separately. [Verification details](docs/VERIFICATION.md) define evidence and how to reproduce the gates.

[The historical v0.2 validation receipt](docs/DECISION_LAB_VALIDATION.md) records its source bindings and retained evidence. [The v0.1 baseline receipt](docs/VALIDATION.md) preserves earlier repaired findings. Neither automatically accepts later changes. The [Institute update](docs/INSTITUTE_UPDATE.md) explains the current additions and verification scope. Very tall mobile pages are captured as overlapping viewport segments to avoid Chromium full-page compositing limits.

For the optional Lighthouse audit, start the production server on 5187, then run:

```sh
bun x --no-install vite preview --host 127.0.0.1 --port 5187 --strictPort
# In another terminal:
bun run audit:performance
```

This launches real installed Chrome through Playwright, attaches the Lighthouse API to its debug port, retains three mobile and three desktop reports, and fails if any category's median is below 100. It is separate from functional acceptance; do not interpret missing or failing reports as passing performance.

## References

- [Generalized Notation Notation](https://github.com/ActiveInferenceInstitute/Generalized_Notation_Notation); local source import and bound revision are recorded in the generated model.
- [Da Costa et al. (2020), Active inference on discrete state-spaces: A synthesis](https://pmc.ncbi.nlm.nih.gov/articles/PMC7732703/).
- [Friston et al. (2017), Active Inference: A Process Theory](https://discovery.ucl.ac.uk/id/eprint/1530701/).

References motivate the formalism; game-specific equations, tests, and scope are stated explicitly in this project. Source links were checked on October 22, 2026. The public release and manuscript DOI are identified above.


The paired-study manuscript separates completion, early hits, and label discrimination. Larger publication figures retain every case and all planned comparisons; an analytic objective diagram explains why the selectors can favor different hit probabilities. The [manuscript guide](docs/MANUSCRIPT.md) documents actual placed-font checks and the [statistical and search scholarship](research/STRATEGY_SCHOLARSHIP_20261025.md) records new primary sources and reading limits. No presentation amendment changes the 256 paired units, 1,280 searches, or 24-test family.
