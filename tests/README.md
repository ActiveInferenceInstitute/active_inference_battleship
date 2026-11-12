# tests/

Bun unit and contract tests for the core engine, model contract, session/replay,
analysis, report, paired search, and package tooling. Browser behaviour is covered
separately by the Playwright specs in [`../e2e/`](../e2e/README.md).

## Running

```sh
bun run gate test:fast    # fast Bun tests; no parser/package integration or coverage
bun run gate test:full    # full package build, all Bun tests, coverage
bun run test              # alias for test:full
bun run gate all          # full release check, including production build
```

`bun run gate` defaults to `fast`: lint, types, documentation checks, and every
`tests/*.test.ts` except `model.test.ts` and `package.test.ts`. `bun run check` is
the same fast alias, not the former full chain. It runs no builds and produces no
coverage. The excluded files exercise the real Python parser and installed-package
subprocesses; they remain in the full suite.

`bun run gate all` composes lint, types, docs, `test:full`, and the production
build, deduplicating their shared GNN leaf. Full-suite coverage describes modules
the tests load, not rendered-UI, Python-bridge, or upstream-pipeline coverage.
Browser acceptance, negative controls, Lighthouse, and manuscript tasks are
separate. See the [run guide](../docs/RUN_GUIDE.md) and
[generated gate timings](../docs/_generated/gate-timings.md); do not carry forward
historical suite counts as current measurements.

## What is here

| Path                                                        | Purpose                                             |
| ----------------------------------------------------------- | --------------------------------------------------- |
| `game.test.ts`, `session.test.ts`                           | Rules, replay import/export, and strict validation. |
| `inference.test.ts`, `analysis.test.ts`, `report.test.ts`   | Bayes updates, diagnostics, and report shape.       |
| `model.test.ts`, `package.test.ts`, `package-tools.test.ts` | Model contract and package/CLI behaviour.           |
| `paired-search.test.ts`, `research.test.ts`                 | Strategy-study logic.                               |
| `browser-receipts.test.ts`                                  | Browser receipt contract.                           |
| `fixtures/`                                                 | Small deterministic fixtures.                       |

Do not weaken strict schemas or replay validation to pass a test. See
[`../docs/VERIFICATION.md`](../docs/VERIFICATION.md) for what each gate proves.
