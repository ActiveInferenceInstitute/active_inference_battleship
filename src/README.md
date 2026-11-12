# src/

Application and core-engine source for Active Inference Battleship. The `core/`
modules are framework-free and reusable; `ui/` is the React/Vite dashboard; `worker/`
runs catalog generation and replay reconstruction off the main thread. The compiled,
source-bound GNN model is committed at `generated/model.json`.

## Layout

| Path                                                          | Responsibility                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `core/fleet.ts`, `core/game.ts`                               | Legal fleet construction/catalog sampling and immutable game rules. |
| `core/inference.ts`, `core/math.ts`                           | Exact categorical Bayes, diagnostics, and one-step policy.          |
| `core/analysis.ts`                                            | Counterfactual updates and policy sensitivity.                      |
| `core/random.ts`                                              | Explicit reproducible random streams.                               |
| `core/session.ts`, `core/report.ts`                           | Event application/policy wiring and analysis reports.               |
| `model/schema.ts`, `model/default.ts`, `generated/model.json` | Model contract and compiled model.                                  |
| `research/paired-search.ts`, `research/search.ts`             | Headless paired-search study logic.                                 |
| `ui/*`                                                        | Dashboard views, diagnostics, decision lab, board, controls, theme. |
| `worker/*`                                                    | Web Worker client and session worker.                               |
| `App.tsx`, `main.tsx`, `index.ts`, `cli/arguments.ts`         | App shell and headless CLI surface.                                 |

## Conventions

- Keep `core/` free of React, DOM, network, hidden mutable random state, and server
  dependencies.
- Treat `generated/model.json` as generated: rebuild with `bun run model:import` after
  an intentional GNN specification change, then run `bun run check`.
- Do not hand-edit generated artifacts or weaken strict replay/import schemas.

Architecture detail is in the [project README](../README.md) and
[`../docs/MODEL.md`](../docs/MODEL.md); API examples are in [`../docs/API.md`](../docs/API.md).
