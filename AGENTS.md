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
| `build` | `bun run build` | `.` |
| `check` | `bun run check` | `.` |
| `lint` | `bun run lint` | `.` |
| `test` | `bun run test` | `.` |
| `typecheck` | `bun run typecheck` | `.` |

## Documentation

The documentation index is [`docs/README.md`](docs/README.md). Folder guides live in
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
