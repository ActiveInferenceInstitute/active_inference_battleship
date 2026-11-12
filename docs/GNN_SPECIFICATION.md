# Generalized Notation Notation in this project

**Generalized Notation Notation (GNN)** describes generative models in text. It does not mean graph neural network. The [upstream repository](https://github.com/ActiveInferenceInstitute/Generalized_Notation_Notation) supplies the real parser imported by this build. GNN is an independently versioned dependency; this project implements only the `binary-static-fleet-v1` contract.

| Stage | Actual input and output | What it establishes |
| --- | --- | --- |
| Declare | `models/battleship.gnn.md` | Variables, dimensions, graph dependencies, equations, discrete one-shot time, and default parameters |
| Parse | `scripts/parse_gnn.py` imports the pinned upstream `MarkdownGNNParser` | Structured declarations from the real GNN parser, not a local imitation |
| Validate | `scripts/contract.ts` checks the parser payload | Supported identity, unique variables, dimensions, edges, parameters, equations, and time semantics; incompatible declarations fail |
| Compile | `scripts/import-model.ts` emits `src/generated/model.json` | Checked defaults and digests of the specification and upstream parser source closure at the pinned commit |
| Execute | `src/core/inference.ts` and `src/core/analysis.ts` | Implemented categorical Bayes, one-shot action scores, policy probabilities, and hypothetical updates |
| Inspect | Shared React boards, charts, tables, controls, and replay export | Views of those runtime quantities, with their units and scope |

The browser does not import Python, interpret arbitrary GNN programs, execute equation text, or allocate dense transition/likelihood tensors. The adapter recognizes this supported mathematical contract. A declaration alone does not implement a new model: extending semantics requires backend code, contract validation, tests, and documentation together.

## Factors, dimensions, and defaults

For board width `N` and catalog size `M`, the observation factor is `A[2,M,N²]`, the static transition is `B[M,M]`, outcome preference is `C[2]`, initial belief is `D[M]`, and action prior is `E[N²]`. A state label is a complete legal fleet. The two outcomes are miss and hit. Procedural A computes the symmetric likelihood from occupancy and assumed noise; identity B leaves fleet positions fixed. C is a normalized preference distribution, D is uniform over catalog labels, and E encodes the declared spatial habit prior. Previously fired cells are excluded before normalizing the action distribution.

The imported default catalog has 4,096 labels. Setup can select another supported count, and five sliders override runtime controls. These overrides do **not** change the GNN specification, its digest, or the generated defaults. Replay events retain actual settings; a replay also binds the source digest. The live factor inspector shows the active values beside the declared structure.

The environment draws its selected truth from the catalog. Assistants receive the full hypothesis catalog and only their own public cell/hit observations, not the selected label, fleet, or sunk metadata. Neither the GNN file nor a diagram by itself proves that information boundary; throwing-truth-getter tests and independent numerical checks exercise it.

## Change and verify

```sh
bun run gate gnn
# After an intentional, supported source change:
bun run model:import
bun run gate all
```

[`models/gnn.pin.json`](../models/gnn.pin.json) is the canonical upstream pin:
schema `gnn-importer-pin/v1`, recorded `2026-11-12`, repository
`ActiveInferenceInstitute/Generalized_Notation_Notation`, tag `v5.0.3`, commit
`8f293d9ba810e6eda5c09842d9c7ed9ffa5f92c1`. The importer rejects a pin without
that schema, and the full model suite asserts the pinned tag and commit against
the compiled artifact. `model:import` resolves that commit in the `GNN_ROOT`
checkout, materializes the commit's `src/gnn` tree into the external cache, runs
the parser from those exact bytes, and binds their per-file digests. The checkout's
own HEAD is not the pin; bumping the pin means editing the pin file and re-importing.

`model:check` compares current local source bytes with the compiled artifact. It is not proof of the entire upstream pipeline, all transitive dependencies, or scientific adequacy. In **Model & guide**, download the verbatim specification and compiled JSON, inspect their provenance, and use replay export separately to resume a game. [Model equations](MODEL.md) define the quantities; [API](API.md) identifies composable entry points.

`bun run gate gnn` and `bun run model:check` select the same freshness check.
The default `bun run gate` (`fast`, also `bun run check`) deliberately omits the
real Python parser and package subprocess suites; it does not renew parser
verification. `bun run gate all` includes the full suites and production build,
deduplicating their shared GNN check. The hosted workflow runs that full gate in
job `model-check`, displayed as `gnn conformance (pinned)`. See the
[CI pointer](../.github/GNN.md), [run guide](RUN_GUIDE.md), and
[generated timings](_generated/gate-timings.md).

## Language and compatibility

Authored explanations use American English. Existing identifiers such as `catalogue_size`, `catalogueSize`, `makeCatalogue`, and the model name `BattleshipFiniteCatalogue` retain their spelling for GNN/replay/API compatibility. The verbatim GNN source, published reference titles, and historical audit receipts are preserved. They are not current branding or editorial templates.
