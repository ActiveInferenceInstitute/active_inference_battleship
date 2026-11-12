# Agent guide — active_inference_battleship

Playable browser Battleship with an inspectable active-inference dashboard, compiled from a bounded GNN model contract, with a reproducible manuscript and headless analysis CLI.

## Working notes

- Repository: `ActiveInferenceInstitute/active_inference_battleship` (default branch `main`).
- InstituteOS classification: category `research-software`, maturity `released`, status `active`.
- License: `MIT`.
- Keep private content in private repositories; never commit credentials,
  personal data, or unverified claims.
- Read [`README.md`](README.md) first, then the nearest nested `AGENTS.md`.
- Prefer small, verified changes; run the declared tasks before handing work back.

## Tasks

| Task | Command | Working directory |
| --- | --- | --- |
| `gate` / `check` | `bun run gate` / `bun run check` — fast development checks | `.` |
| `all` | `bun run gate all` — full release check | `.` |
| `build` | `bun run build` | `.` |
| `gnn` | `bun run gate gnn` / `bun run model:check` | `.` |
| `lint` | `bun run gate lint` | `.` |
| `test:fast` | `bun run gate test:fast` | `.` |
| `test:full` / `test` | `bun run gate test:full` / `bun run test` | `.` |
| `types` / `typecheck` | `bun run gate types` / `bun run typecheck` | `.` |
| `docs` | `bun run gate docs` | `.` |

`scripts/run.ts` is the sole gate registry. Default `fast` composes lint, types,
docs, and every `tests/*.test.ts` except `model.test.ts` and `package.test.ts`;
there is no parser/package integration, build, or coverage claim. `all` composes
lint, types, docs, full package/tests with coverage, and production build,
deduplicating the shared GNN leaf. Browser/manuscript acceptance remains separate.
Use the [run guide](docs/RUN_GUIDE.md) for environments and
[generated timings](docs/_generated/gate-timings.md) for measured evidence.

## Documentation

The documentation hub is [`docs/README.md`](docs/README.md), with a
[flat index](docs/documentation-index.md). Folder guides live in
[`src/`](src/README.md), [`scripts/`](scripts/README.md), [`tests/`](tests/README.md),
[`e2e/`](e2e/README.md), [`manuscript/`](manuscript/README.md), and
[`research/`](research/README.md). Open work is tracked in [`TODO.md`](TODO.md);
per-change history is in [`CHANGELOG.md`](CHANGELOG.md).

## InstituteOS sidecar

This repository carries a committed [`.aii/`](.aii/README.md) sidecar with curated
InstituteOS metadata (`aii-sidecar/v1`): category, maturity, ecosystem relations,
key artifacts, provenance, and portable tasks. It is read by
[InstituteOS](https://github.com/ActiveInferenceInstitute/InstituteOS) tooling and
does not affect the project's build or runtime. Regenerating the sidecar docs
rewrites only `.aii/README.md`, `.aii/AGENTS.md`, `.aii/docs/README.md`,
`.aii/docs/AGENTS.md`, and `.aii/docs/INTEGRATION.md`.
