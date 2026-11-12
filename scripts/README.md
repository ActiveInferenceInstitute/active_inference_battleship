# scripts/

Thin command-line runners behind the `package.json` task scripts. They parse arguments,
resolve repository paths, and call the TypeScript/Python modules in [`../src/`](../src/README.md)
and [`../research/`](../research/README.md); domain logic stays in those modules.

## Entry points by task

| Script                                           | Bun task or responsibility                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run.ts`                                         | Sole gate command registry: `gate` (default `fast`), `lint`, `types` (`typecheck`), `docs`, `test:fast`, `test:full` (`test`), `gnn` (`model:check`), `build`, `all`; also dispatches the existing auxiliary tasks. |
| `check-docs.ts`                                  | The `docs` gate's relative-link and flat-index checks.                                                                                                                                                              |
| `import-model.ts`, `contract.ts`, `parse_gnn.py` | `bun run model:import`, `bun run model:check`: pinned upstream parser and executable contract.                                                                                                                      |
| `build-package.ts`, `check-package.ts`           | Package build and installed-artifact checks, reached by `bun run build:package`.                                                                                                                                    |
| `manuscript.ts`                                  | `bun run manuscript:figures`, `:render`, `:verify`, `:pages`, and `bun run test:manuscript`.                                                                                                                        |
| `strategy-study.ts`, `analyze-strategies.ts`     | `bun run research:strategies`, `bun run research:analyze`.                                                                                                                                                          |
| `audit-performance.ts`                           | `bun run audit:performance`.                                                                                                                                                                                        |
| `browser-matrix.ts`, `browser-receipts.ts`       | Browser matrix and receipt capture.                                                                                                                                                                                 |
| `capture-*.ts`                                   | Dashboard/manuscript screenshot capture for figures.                                                                                                                                                                |
| `test-reader-*.ts`                               | Reader loading, failure, cascade, table, image, and native-lifecycle checks.                                                                                                                                        |
| `paths.ts`, `declarations.ts`                    | GitVault path resolution and package declarations.                                                                                                                                                                  |

## Examples

```sh
bun run gate              # fast: lint, types, docs, fast tests; no builds/parser/coverage
bun run gate all          # full release check
bun run gate gnn          # model:check alias
bun run gate test:full    # full package build, every Bun test, coverage
```

`bun run check` aliases `fast`. Fast tests exclude only `model.test.ts` and
`package.test.ts`; full tests retain the real Python parser and installed-package
subprocess suites. `all` composes lint, types, docs, full tests, and production
build, deduplicating the shared GNN leaf in one invocation. Auxiliary browser,
negative-control, performance, and manuscript tasks remain explicit.

See the [run guide](../docs/RUN_GUIDE.md) for prerequisites and aliases, and the
[generated gate timings](../docs/_generated/gate-timings.md) for measurements.

`scripts/paths.ts` resolves the GitVault root by walking up for `vault.toml` and
`Username`; the GNN parser refuses a Python whose prefixes are outside that root. See
[`../docs/VERIFICATION.md`](../docs/VERIFICATION.md) and [`../AGENTS.md`](../AGENTS.md).
