# GNN conformance

The [`ci.yml`](workflows/ci.yml) job key is `model-check`; its display name is
`gnn conformance (pinned)`. It runs `bun run gate all` on pushes to `main` and pull
requests: lint, types, documentation checks, full tests with coverage, and the
production build. Dependencies and tooling are set up once. The workflow uses
commit-pinned `oven-sh/setup-bun` and `astral-sh/setup-uv`, not an organization
composite Python/uv action.

The canonical [`models/gnn.pin.json`](../models/gnn.pin.json) has schema
`gnn-importer-pin/v1`, recorded `2026-11-12`, and pins
`ActiveInferenceInstitute/Generalized_Notation_Notation` at `v5.0.3`
(`8f293d9ba810e6eda5c09842d9c7ed9ffa5f92c1`).

The full gate deduplicates the GNN leaf shared by package and production builds.
That leaf is `bun run model:check` (`bun run gate gnn`), implemented by
`scripts/import-model.ts --check`. It resolves the pinned tag and commit in the
upstream checkout, archives that revision's `src/gnn`, and parses the single
specification `models/battleship.gnn.md` with the upstream `MarkdownGNNParser`
through `scripts/parse_gnn.py`. The result is checked against the executable
contract in `scripts/contract.ts`: parameter values, variable dimensions, and the
dependency graph must match exactly, and the pinned parser closure is hashed.
It fails when the pin, specification, or parser closure moves without the
committed `src/generated/model.json`. It does not scan the repository for other
`*.gnn.md` files or certify the entire upstream pipeline.

Hosted CI creates a vault-shaped root and installs managed uv Python beneath it;
both the interpreter's prefix and base prefix must resolve there. The pin is
not the upstream checkout's working HEAD.

For local commands, see the [run guide](../docs/RUN_GUIDE.md) and
[verification protocol](../docs/VERIFICATION.md). The default `bun run gate`
and legacy `bun run check` select `fast`, which omits parser/package integration,
builds, and coverage; use `all` for the full release check. Measured results live
in the [generated timing document](../docs/_generated/gate-timings.md), not here.
