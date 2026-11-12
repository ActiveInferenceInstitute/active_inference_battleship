# GNN conformance

`gnn conformance (pinned)` is defined in `.github/workflows/ci.yml` and reads
`models/gnn.pin.json`, which pins
`ActiveInferenceInstitute/Generalized_Notation_Notation` at `v5.0.3`
(`8f293d9ba810e6eda5c09842d9c7ed9ffa5f92c1`).

The job runs `bun run model:check`, that is `scripts/import-model.ts --check`.
It resolves the pinned tag and commit in the upstream checkout, archives that
revision's `src/gnn`, and parses the single specification
`models/battleship.gnn.md` with the upstream `MarkdownGNNParser` through
`scripts/parse_gnn.py`. The result is checked against the executable contract
in `scripts/contract.ts`: parameter values, variable dimensions, and the
dependency graph must match exactly, and the pinned parser closure is hashed.
The job fails when the pin, the specification, or the parser closure moves
without the committed `src/generated/model.json`. It does not scan the rest of
the repository for `*.gnn.md`.
