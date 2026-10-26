# Composable core API

Version-one replay import recomputes opponent actions. Exact reconstruction requires the same producing runtime: near-tied choices can differ across JavaScript engines even when import succeeds. Analysis-report runtime metadata does not add provenance to the replay itself. See the [cross-engine reconstruction limits](PACKAGE.md#analysis-interchange).

Build with `bun run build:package`, then import the supported operations from `active-inference-battleship`. The ESM root has TypeScript declarations and no UI/server imports. `loadDefaultModel()` returns an independent validated copy of the bundled, real-parser-compiled model. Direct source imports remain useful inside this repository; internal paths are not public package exports. See the [package and headless guide](PACKAGE.md) for Node/Bun use, local archive validation, report encoding, and CLI exit/error behavior.

`analyzeReplay(text, options?, model?)` reconstructs the model-bound replay and evaluates either actor from its public observations. Options select `actor`, an unvisited numeric `cell`, or validated partial `controls` for a temporary what-if calculation. It preserves baseline controls and the original replay event count, and does not fire. `encodeAnalysis(report)` produces version-one analysis JSON with impossible log weights explicitly encoded as `"-Infinity"`; unexpected nonfinite numbers are rejected. This report is not a replay or the dashboard's snapshot format. Terminal reports still describe inference candidates, while the game state machine continues to prohibit terminal firing.

## Inference without a game

```ts
import { makeCatalogue, infer, scoreActions, chooseAction, SeededRandom } from "active-inference-battleship";

const catalogue = makeCatalogue({ boardSize: 10, shipLengths: [5,4,3,3,2] }, 1024, 1943);
const observations = [{ cell: 0, hit: false }];
const controls = {
  epistemicWeight: 1, hitPreference: 2.5,
  policyPrecision: 8, sensorNoise: 0.02, habitStrength: 0,
};
const belief = infer(catalogue, observations, controls.sensorNoise);
const actions = scoreActions(belief, observations, 10, controls);
const nextCell = chooseAction(actions, "sample", new SeededRandom(4));
```

`infer` accepts a prior-support catalog and public observations only. It returns weights, occupancy marginals, entropy, ESS, support size, log evidence, and each update's diagnostics. It rejects empty/mismatched catalogs, invalid/repeated observations, invalid noise, and unsupported observations. Use `controlsSchema.parse` at external input boundaries before calling policy functions.

`scoreActions` removes visited cells, calculates the decompositions, normalizes the policy, and returns scores sorted by descending probability with cell-index tie breaks. It returns an empty array when every cell is visited; `chooseAction` rejects an empty policy. Custom action selectors can consume the same scores.

## Decision analysis without a selected fleet

```ts
import { forecastOutcomes, sweepPolicy, actionLogOdds } from "active-inference-battleship";

const cell = actions[0]?.cell;
if (cell !== undefined) {
  const outcomes = forecastOutcomes(catalogue, observations, controls.sensorNoise, cell, belief);
  const sweep = sweepPolicy(belief, observations, 10, controls, "epistemicWeight", cell);
}
```

`forecastOutcomes` returns two discriminated outcomes, hit then miss. A possible outcome includes probability, log probability, posterior entropy, ESS, and realized KL; an impossible outcome has probability zero and no fabricated posterior. Without the optional fifth argument it computes the current belief. With a cached belief, the caller must supply the result of `infer` for exactly the same catalog, history, and noise. Retained `Belief.logWeights` allow a finite log-probability hypothesis to recover after its exponentiated weight underflows. Forecasting then costs O(M) for each outcome rather than replaying the full history twice. Invalid cells, repeats, noise, and mismatched dimensions are errors.

`sweepPolicy` takes the current belief and holds it fixed. It returns nine evenly spaced β values in [0,4] or γ values in [0,32], each with the selected action's probability, rank and G, and the leading cell. It rejects unavailable targets. `actionLogOdds(a,b,precision)` computes `log E(a) − log E(b) − γ(G(a)−G(b))` without dividing potentially tiny policy probabilities. All inputs to the analysis layer are catalog, belief, controls, and public observations; no selected environment fleet is accepted.

The exported `strategyPresets` change motive/precision/habit settings while preserving sensor noise when spread over existing controls. They illustrate the model; they are not empirically validated superior strategies.

## Full session

```ts
import { loadDefaultModel, createSession, applyEvent, suggestedCell, exportSession, importSession } from "active-inference-battleship";

const model = loadDefaultModel();
let session = createSession(model, 1943, 256);
session = applyEvent(session, { type: "begin" });
session = applyEvent(session, { type: "shot", cell: suggestedCell(session) });
const reconstructed = importSession(exportSession(session, model), model);
```

`applyEvent` is immutable. `shot` performs one player shot and, unless terminal, one opponent response. Other events are `shuffle` (ready phase only), `controls` (full validated controls object), and `mode` (`sample` or `greedy`). `assistant(session)` computes the player's inference from its public shot history. Export records ordered input events; import validates them and reconstructs outcomes through the same environment rules.

`game.ts` can be used alone for alternative controllers: `createGame`, `begin`, `fire`, and `observations`. Its state machine rejects firing before launch, the wrong actor, noninteger/out-of-bounds coordinates, repeated shots, and shots after termination. `observations` strips sunk metadata. `makeFleet` parses/copies externally supplied straight, nonoverlapping ships in declared order; the browser deliberately uses shuffled deployment rather than a manual editor.

Randomness is injected through `RandomSource.next()`. A source must return numbers in [0,1). `SeededRandom` is a noncryptographic 32-bit generator. Catalog, environment, and policy streams are separate. Public interfaces are readonly TypeScript values; do not mutate nested arrays or replace truth fields after construction.

## Extending the model

`assistant(session, "opponent")` inspects the opponent from its own public observation history. Omitting the actor selects the player assistant. The rendered inspector never maps opponent-policy coordinates into a player targeting action.

The event recorder canonicalizes controls/mode changes between actions. Exported shuffle events include an optional absolute `count` checkpoint; ordinary UI callers use `{type: "shuffle"}` and increment it. This keeps long-running input histories resumable. Worker callers can use `src/worker/client.ts`'s `sessionTask(request, signal?)` for asynchronous creation/import; an optional `AbortSignal` terminates the owned worker and rejects with `AbortError`. Already-aborted signals create no worker. Timeouts, result/error paths, cancellation, and synchronous post-message failures clean up the worker. The pure core remains usable without any worker or DOM dependency.

1. Define a new explicit model contract and GNN equations.
2. Add typed runtime behavior and independent analytic tests.
3. Extend the strict adapter, rather than ignoring unknown semantics.
4. Bump replay version if deterministic reconstruction changes.
5. Regenerate the model and rerun numerical, negative-control, and browser gates.

Do not pass `Game` or selected fleet/index into a replacement inference agent. Feed only its declared public observations and model/prior support.
