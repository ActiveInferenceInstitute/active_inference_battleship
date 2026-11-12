# GNN conformance

The [`ci.yml`](workflows/ci.yml) job key is `model-check`; its display name is
`gnn conformance (pinned)`. It runs `bun run gate all` on pushes to `main` and pull
requests: lint, types, documentation checks, full tests with coverage, and the
production build. Dependencies and tooling are set up once. The workflow uses
commit-pinned `oven-sh/setup-bun` and `astral-sh/setup-uv`, not an organization
composite Python/uv action.

The canonical [`models/gnn.pin.json`](../models/gnn.pin.json) has schema
`gnn-importer-pin/v1`, recorded `2026-11-12`, and pins
`ActiveInferenceInstitute/Generalized_Notation_Notation` at `v5.1.0`
(`75c834bd8519dc7b5adc4d24f16bf393cfd1ecdf`).

## Reader arm

The gate runs under Bun, so no Python package is importable from it. The reader
arm is therefore the recorded wrapper
[`scripts/parse_gnn.py`](../scripts/parse_gnn.py): it archives exactly the pinned
revision's `src/gnn`, puts that revision alone on `PYTHONPATH`, and runs

```sh
python -m gnn.importers check --repo . --require-pointer \
    --workflow .github/workflows/ci.yml --job model-check
```

from that environment. The checker owns pin shape, the pointer, and every
discovered `*.gnn.md` specification; checker output goes to stderr so the
parser's JSON channel stays intact. This repository carries no pin reader of its
own. `scripts/gnn-source.ts` names only the git objects a fetch needs
(`repository`, `tag`, `commit`) before the pinned tree exists; it asserts
nothing, and the reader reports the pin's verdict. The wrapper's `--variables`
mode prints the reader's `gnn-importer-variables/v1` map, which is what
`research/variables.py` hydrates the manuscript's `{{GNN_VERSION}}`,
`{{GNN_COMMIT}}` and `{{GNN_REPOSITORY}}` from, and what the hosted summary
reports.

The full gate deduplicates the GNN leaf shared by package and production builds.
That leaf is `bun run model:check` (`bun run gate gnn`), implemented by
`scripts/import-model.ts --check`. It resolves the pinned tag and commit against
real git objects, materializes that revision's `src/gnn`, and runs the wrapper
against it. The executable Battleship contract in `scripts/contract.ts` still
checks supported parameters, dimensions and graph, and the compiled model still
binds the pinned parser closure.

## Adoption record

The cutover to the shared reader landed in the change that advanced the pin from
`v5.0.3` (`8f293d9ba810e6eda5c09842d9c7ed9ffa5f92c1`) to `v5.1.0`
(`75c834bd8519dc7b5adc4d24f16bf393cfd1ecdf`), the first revision of the estate
pin that contains `src/gnn/importers.py` (added in `e6a9d3917`). Before it, the
wrapper could not call `python -m gnn.importers` at all and the migration was
recorded as blocked; that interim state is superseded by this one. See the
[GNN–FEP contract](https://github.com/ActiveInferenceInstitute/Generalized_Notation_Notation/blob/main/docs/workflows/gnn-fep.md).

Hosted CI creates a vault-shaped root and installs managed uv Python beneath it;
both the interpreter's prefix and base prefix must resolve there. The pin is
not the upstream checkout's working HEAD.

For local commands, see the [run guide](../docs/RUN_GUIDE.md) and
[verification protocol](../docs/VERIFICATION.md). The default `bun run gate`
and legacy `bun run check` select `fast`, which omits parser/package integration,
builds, and coverage; use `all` for the full release check. Measured results live
in the [generated timing document](../docs/_generated/gate-timings.md), not here.
