# Core package and headless workflows

This is the **v0.4.0 public source and release-tarball distribution** from the **Active Inference Institute**. [GitHub release](https://github.com/ActInfInstitute/active_inference_battleship/releases/tag/v0.4.0) · [Manuscript archive, DOI 10.5281/zenodo.23670188](https://doi.org/10.5281/zenodo.23670188). The DOI identifies the manuscript and deposited companions; there is no separate software DOI or npm registry release. [Release details](RELEASE_PLAN.md).

## Build and reuse

From the source checkout, with the external cache bindings in the README:

```sh
bun install --frozen-lockfile
bun run build:package
bun run check:package
node examples/headless.mjs
```

The package build first reimports/checks the actual local GNN parser, then emits `lib/index.js`, a separate `lib/cli.js`, TypeScript declarations, and a source/artifact receipt. The public root imports no React, DOM, worker, file-system, server, Bun, or Python module. It includes the already compiled GNN model; consuming that build does not reparse arbitrary GNN or require a local upstream checkout. Rebuilding the source remains a GitVault development workflow with the documented GNN/Python prerequisites.

```js
import {
  loadDefaultModel, createSession, applyEvent,
  exportSession, analyzeReplay, encodeAnalysis,
} from "active-inference-battleship";

const model = loadDefaultModel();
let game = createSession(model, 1943, 256);
game = applyEvent(game, { type: "begin" });
game = applyEvent(game, { type: "shot", cell: 0 });
const replay = exportSession(game, model);
const report = analyzeReplay(replay, {
  actor: "player",
  controls: { epistemicWeight: 2 },
});
const json = encodeAnalysis(report);
```

`loadDefaultModel()` returns an independently validated copy; modifying one caller's copy does not alter subsequent defaults. The public interface also exposes the existing fleet, game, inference, counterfactual, policy-sweep, session, random-source, and single-fleet research operations. Importing internal paths is intentionally unsupported by package exports. See [core interfaces](API.md) and [GNN semantics](GNN_SPECIFICATION.md).

The package targets ESM and ES2023, with Node 26 or later and Bun 1.4.4 or later declared. Current verification uses Node 26.12.1 and Bun 1.4.4; older runtimes and CommonJS are not qualified. Generated declarations use explicit `.js` module specifiers and are checked in an independent strict `NodeNext` consumer without DOM or Bun global types. Browser compatibility is checked by the public declaration build and browser-target bundling; this is separate from the dashboard's rendered/browser tests.

## Headless game and replay analysis

```sh
node lib/cli.js play --seed 1943 --catalog-size 256 --mode greedy --output game.json
node lib/cli.js analyze game.json --actor player --output analysis.json
node lib/cli.js analyze game.json --actor opponent --controls examples/controls.json
node lib/cli.js --help
```

`play` runs the actual two-actor game until it wins or loses and emits a version-one resumable replay. It can be imported in the browser for inspection, subject to the cross-engine reconstruction limit below. `--mode` accepts `sample` or `greedy`; the default is sampled. Omitted seed/catalog settings come from the compiled model. This competitive self-play workflow is **not** the paper's four-policy single-fleet benchmark and supplies no new strategy-comparison result.

`analyze` reconstructs a model-bound replay and evaluates the selected actor's public hit/miss history. The default selected candidate is the current leading action. `--cell` can name an **unvisited** coordinate such as `A2` or its zero-based index. An already observed or out-of-board cell is rejected. On a terminal replay the report can still contain unvisited inference candidates; these are counterfactual scores, not permission to fire. If every cell has been observed, `actions` is empty and `selected` is explicitly `null`.

`--controls FILE` accepts a strict partial JSON object with `epistemicWeight`, `hitPreference`, `policyPrecision`, `sensorNoise`, or `habitStrength`. Unsupported keys and out-of-range values fail. During analysis, overrides create temporary subjective inference settings without changing the input file or firing a shot. The report retains baseline controls, active controls, and explicit overrides. During `play`, overrides are recorded in the generated replay before launch. Undefined optional values passed through the JavaScript interface are treated as absent; JSON files cannot encode `undefined`.

Use `-` as the replay filename for standard input, limited to 1,000,000 bytes. Controls input is limited to 65,536 bytes. Only one input can consume standard input. JSON goes to standard output by default. `--output FILE` atomically creates a new complete file with restrictive permissions and refuses existing paths, including the replay input path. It uses an owned temporary sibling and never replaces an existing file. Shell redirection has its own overwrite rules; use the command's output option when preservation is required.

Exit status is `0` for success/help, `2` for command usage errors, and `1` for input, model/inference, or file-system failures. Failures write a concise message to standard error and no analysis JSON to standard output. An invalid zero-noise history is an error, not a fabricated posterior or an automatic noise adjustment.

## Analysis interchange

The report marker is `kind: "active-inference-battleship/analysis"`, with `schemaVersion: 1`. This is a separate interchange format from both resumable replay version 1 and the dashboard's analysis snapshot. Passing a report to replay import must fail.

The report contains the compiled model identity/source digests, actor, replay seed/catalog/phase/event count, baseline/active controls, overrides, public observations, posterior diagnostics, all unvisited action scores, and the selected candidate's hit/miss forecasts. It contains no selected-fleet, ship-layout, or sunk metadata. Seeds can reconstruct the game's fleets, so reports and replays remain local experiment records, not cryptographically private multiplayer messages.

The CLI adds a `producer` runtime/version field; the pure library function does not read runtime globals. Transcendental functions can differ in their final floating-point bits between JavaScript engines, changing the order of near-tied action scores. Cross-engine report checks align actions by cell identity, use an absolute tolerance of 2 × 10⁻¹², preserve exact fields/text and observation order, and reject deliberately corrupted entropy values and cell identities. Do not assume byte-identical reports or identical near-tied greedy choices across engines. Retain the runtime version and build receipt for reproduction; this does not change the frozen Bun research protocol.

That `producer` field belongs to **analysis reports**, not version-one replay files. A replay stores the player's shot events and recomputes opponent choices during import. Near-tied choices can therefore change the reconstructed opponent history across engines; a Node-to-Bun probe reproduced this at seed 41 with 16 catalog entries and greedy mode. An import succeeding does not prove the reconstructed game is identical, and an earlier terminal outcome can make later recorded events invalid. Retain the producing runtime/version separately with replay files and use the same runtime for exact reproduction. Compare the reconstructed histories before treating a browser import or an analysis from another engine as the original run. A future portable replay revision would need explicit opponent-action provenance; the version-one format is unchanged here.

Natural-log values use nats. A truly impossible hypothesis has log weight negative infinity, represented by the literal JSON string **`"-Infinity"`**. Finite log weights remain numbers even when their exponentiated weights underflow to zero; this preserves the distinction between impossible and numerically tiny hypotheses. `encodeAnalysis` rejects unexpected nonfinite numeric values rather than silently coercing them to `null`. A possible forecast branch can likewise have a numerically underflowed zero probability: its `kind` and finite `logProbability` distinguish it from a structurally impossible branch.

## Local archive verification

Packing is preparation, not publication. Keep `private: true` and use a fresh external destination:

```sh
bun pm pack --ignore-scripts --filename /path/on/GitVault/new-package.tgz
```

The explicit file list includes the ESM/declaration artifacts, raw GNN specification, shared project metadata, examples and selected interface documentation. It excludes development caches, browser profiles, test captures, generated paper editions, and local acceptance reports. The root README describes the source repository; archive consumers should start with this package guide. A separately created consumer can install the local tarball with `bun add /path/on/GitVault/new-package.tgz`; no registry publication is needed. Only the exact pinned Zod version is a runtime dependency; UI and verification tools remain development dependencies.

`bun run test` builds a fresh package before testing. Real-file/subprocess gates pack and install the tarball in an isolated consumer, exercise Node/Bun imports and the example, check strict `NodeNext` declarations, require an intentionally wrong type assignment to fail, verify CLI/replay agreement, reject unsafe inputs and overwrite attempts, and reject changed sources, changed artifacts, unbound outputs and missing required artifacts. These checks do not assert scientific efficacy or establish a public release. `lib/manifest.json` binds build inputs before and after generation; `bun run check:package` verifies the current receipt and exact artifact inventory. A receipt detects changes relative to recorded local bytes; it is not a signature proving publisher authenticity.

Build implementation follows the official [Bun bundler](https://bun.com/docs/bundler), [Bun local packing](https://bun.com/docs/pm/cli/pm), and [TypeScript declaration-only emission](https://www.typescriptlang.org/tsconfig/emitDeclarationOnly.html) interfaces. No inference equation, supported GNN planning horizon, replay format, research protocol, or result changes with this packaging layer.

The verifier reconstructs the complete expected source inventory from mandatory build inputs and the core/model/research/CLI source namespaces, including dot-prefixed files and directories; it does not trust the receipt's list alone. Missing, unexpected, and unbound source entries reject, as does removing a required source file together with its binding. The inventory includes the parent TypeScript configuration and package-checking/build helpers. Moving implementation outside those namespaces requires an explicit input-contract update. The build checks both inventory and file digests before and after generation.
