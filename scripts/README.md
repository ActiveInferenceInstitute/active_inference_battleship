# scripts/

Thin command-line runners behind the `package.json` task scripts. They parse arguments,
resolve repository paths, and call the TypeScript/Python modules in [`../src/`](../src/README.md)
and [`../research/`](../research/README.md); domain logic stays in those modules.

## Entry points by task

| Script                                                          | npm/Bun task                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `run.ts`                                                        | `test`, `check`, `lint`, `typecheck`, `format`, `e2e`, `negative`, `doctor`, `hmr`, `performance`, `research`, `package` |
| `model` import/contract                                         | `bun run model:import`, `bun run model:check` (uses `parse_gnn.py`)                                                      |
| `build-package.ts`                                              | `bun run build:package`                                                                                                  |
| `check-package.ts`                                              | `bun run check:package`                                                                                                  |
| `manuscript.ts`                                                 | `bun run manuscript:figures`, `:render`, `:verify`, `:pages`, `:test`                                                    |
| `strategy-study.ts`, `analyze-strategies.ts`                    | `bun run research:strategies`, `:analyze`                                                                                |
| `audit-performance.ts`                                          | `bun run audit:performance`                                                                                              |
| `browser-matrix.ts`, `browser-receipts.ts`                      | Browser matrix and receipt capture.                                                                                      |
| `capture-*.ts`                                                  | Dashboard/manuscript screenshot capture for figures.                                                                     |
| `test-reader-*.ts`                                              | Reader loading, failure, cascade, table, image, and native-lifecycle checks.                                             |
| `paths.ts`, `contract.ts`, `import-model.ts`, `declarations.ts` | Path resolution, model contract, source-bound import, declarations.                                                      |

## Examples

```sh
bun run typecheck
bun run check
bun run model:check
bun run build:package
```

`scripts/paths.ts` resolves the GitVault root by walking up for `vault.toml` and
`Username`; the GNN parser refuses a Python whose prefixes are outside that root. See
[`../docs/VERIFICATION.md`](../docs/VERIFICATION.md) and [`../AGENTS.md`](../AGENTS.md).
