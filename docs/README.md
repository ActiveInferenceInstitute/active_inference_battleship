# Documentation hub

Start here for the documentation of **Active Inference Battleship**, a playable
browser game and inspectable active-inference dashboard compiled from a bounded
Generalized Notation Notation (GNN) model contract. Each document below covers one
topic; the repository-level orientation is the [project README](../README.md) and the
agent contract is [AGENTS.md](../AGENTS.md).

Use the [flat documentation index](documentation-index.md) for every long-lived
top-level guide and historical receipt. Start with the [run guide](RUN_GUIDE.md)
for commands and environment prerequisites, and consult the
[generated gate timings](_generated/gate-timings.md) for measured gate evidence.

## Running and maintaining

| Document | What it covers |
| --- | --- |
| [`RUN_GUIDE.md`](RUN_GUIDE.md) | Fast development checks, full release checks, aliases, and prerequisites. |
| [`documentation-index.md`](documentation-index.md) | Flat inventory of the long-lived documents in this directory. |
| [`_generated/gate-timings.md`](_generated/gate-timings.md) | Generated measurements; not a hand-maintained test-count or timing claim. |

## Orientation and release

| Document | What it covers |
| --- | --- |
| [`PUBLICATION.md`](publication/PUBLICATION.md) | Public release v0.5.0, DOI, and the reproducibility companions. |
| [`RELEASE_PLAN.md`](publication/RELEASE_PLAN.md) | GitHub release and Zenodo archive plan. |
| [`ORGANIZATION_MIGRATION.md`](architecture/ORGANIZATION_MIGRATION.md) | Ownership transfer to the organization and the retained historical releases. |

## Model and software design

| Document | What it covers |
| --- | --- |
| [`GNN_SPECIFICATION.md`](architecture/GNN_SPECIFICATION.md) | The GNN model contract, the parser import, and the source-bound compiled model. |
| [`MODEL.md`](architecture/MODEL.md) | The executable model: finite fleet catalog, exact conditional Bayes, one-step objective, and every limitation. |
| [`API.md`](architecture/API.md) | Composable core API examples for reusing the engine outside the dashboard. |
| [`DECISION_LAB.md`](guides/DECISION_LAB.md) | The decision explorer: counterfactual updates, sensitivity sweeps, presets, and exports. |

## Manuscript and research

| Document | What it covers |
| --- | --- |
| [`MANUSCRIPT.md`](publication/MANUSCRIPT.md) | Manuscript sources, figure geometry, reader adapters, and reproduction commands. |
| [`STRATEGY_STUDY_ACCEPTANCE.md`](validation/STRATEGY_STUDY_ACCEPTANCE.md) | The paired strategy study's local review-ready handoff. |

Acceptance documents are historical, source-bound handoffs, not evidence that the
current checkout has passed. Use the run guide for current commands.

## Verification and evidence

| Document | What it covers |
| --- | --- |
| [`VERIFICATION.md`](validation/VERIFICATION.md) | Verification protocol and what each gate actually exercises. |
| [`VALIDATION.md`](validation/VALIDATION.md) | The 2026-10-22 v0.1 baseline validation receipt. |
| [`DECISION_LAB_VALIDATION.md`](validation/DECISION_LAB_VALIDATION.md) | The 2026-10-22 decision-lab validation receipt and its frozen review inputs. |
| [`DECISION_LAB_ACCEPTANCE.md`](validation/DECISION_LAB_ACCEPTANCE.md) | The post-review acceptance output for the decision lab. |
| [`VISUAL_REVIEW.md`](validation/VISUAL_REVIEW.md) | The independent 2026-10-22 visual review. |

## Package and CLI

| Document | What it covers |
| --- | --- |
| [`PACKAGE.md`](guides/PACKAGE.md) | The core package, TypeScript declarations, headless CLI, and analysis formats. |
| [`PACKAGE_UPDATE_ACCEPTANCE.md`](validation/PACKAGE_UPDATE_ACCEPTANCE.md) | The local package and manuscript update acceptance record. |

## Update acceptance records

| Document | What it covers |
| --- | --- |
| [`INSTITUTE_UPDATE.md`](publication/INSTITUTE_UPDATE.md) | The historical 2026-10-23 Institute update. |
| [`INSTITUTE_UPDATE_ACCEPTANCE.md`](validation/INSTITUTE_UPDATE_ACCEPTANCE.md) | The Institute update's local verification record. |
| [`COVER_UPDATE_ACCEPTANCE.md`](validation/COVER_UPDATE_ACCEPTANCE.md) | The graphical opening and scholarship update acceptance. |
| [`FRONTMATTER_UPDATE_ACCEPTANCE.md`](validation/FRONTMATTER_UPDATE_ACCEPTANCE.md) | The numbered-formalism and manuscript-opening acceptance. |
| [`MANUSCRIPT_ACCEPTANCE.md`](validation/MANUSCRIPT_ACCEPTANCE.md) | Manuscript review and local handoff. |

## Repository guides

Folder-level guides live beside the content they describe: [src](../src/README.md),
[scripts](../scripts/README.md), [tests](../tests/README.md), [e2e](../e2e/README.md),
[manuscript](manuscript/README.md), [research](../research/README.md), and the
[.aii sidecar](../.aii/README.md). Open work is tracked in the top-level
[TODO.md](../TODO.md); per-change history is in [CHANGELOG.md](../CHANGELOG.md).
