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
upstream checkout and archives that revision's `src/gnn`. Before parsing,
`scripts/parse_gnn.py` shells out to `python -m gnn.importers check --repo .`
with `--require-pointer --workflow .github/workflows/ci.yml --job model-check`,
using only that archived revision on `PYTHONPATH`. Checker output goes to stderr
so the parser's JSON channel stays intact. The checker owns pin, pointer and
discovered specification validation; the executable Battleship contract in
`scripts/contract.ts` still checks supported parameters, dimensions and graph,
and the compiled model still binds the pinned parser closure.

**Migration blocked:** the current pinned revision does not contain
`src/gnn/importers.py`, so the GNN arm fails with `No module named gnn.importers`.
The wrapper does not fall back to the upstream working tree. This change cannot
land until a reader-bearing pinned environment is available under the
[GNN–FEP contract](https://github.com/ActiveInferenceInstitute/Generalized_Notation_Notation/blob/main/docs/workflows/gnn-fep.md).
Removal of the TypeScript/CI pin readers and migration of manuscript variables
remain blocked by that same prerequisite; they are not claimed complete.

Hosted CI creates a vault-shaped root and installs managed uv Python beneath it;
both the interpreter's prefix and base prefix must resolve there. The pin is
not the upstream checkout's working HEAD.

For local commands, see the [run guide](../docs/RUN_GUIDE.md) and
[verification protocol](../docs/VERIFICATION.md). The default `bun run gate`
and legacy `bun run check` select `fast`, which omits parser/package integration,
builds, and coverage; use `all` for the full release check. Measured results live
in the [generated timing document](../docs/_generated/gate-timings.md), not here.
