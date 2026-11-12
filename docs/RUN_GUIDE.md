# Gate and render run guide

Run from the repository root after `bun install --frozen-lockfile`:

```sh
bun run gate              # default fast plan
bun run gate --list
bun run gate all          # complete local/CI plan
```

[`scripts/run.ts`](../scripts/run.ts) is the sole command registry. The package
scripts are selectors, not second copies of tool commands. Named dependencies
are visited once per invocation: `all` checks model freshness once even though
both package tests and the production build need it. A failed child stops the
plan and preserves its exit status. Separate invocations intentionally recheck
prerequisites; no successful result is cached across changed source.

## Separately runnable arms

| Command | Scope |
| --- | --- |
| `bun run gate lint` | Installed Biome, including application, scripts, tests and e2e sources. |
| `bun run gate types` | Strict TypeScript with no emit; `bun run typecheck` selects the same leaf. |
| `bun run gate test:fast` | All `tests/*.test.ts` except the existing Python-parser and installed-package suites, without coverage. |
| `bun run gate test:full` | Fresh source-bound package plus every Bun test and coverage. |
| `bun run gate docs` | Offline Markdown relative-link destinations and flat-index coverage. |
| `bun run gate gnn` | Real pinned-parser reimport and compiled-model freshness; also `bun run model:check`. |
| `bun run gate build` | GNN freshness, types, Vite production build. |
| `bun run gate fast` | Lint, types, docs, fast tests; `bun run check` selects this plan. |
| `bun run gate all` | Lint, types, docs, full tests, production build, with shared prerequisites deduplicated. |

The default deliberately does **not** certify upstream parsing, package installation,
coverage, the production bundle or browser behavior. Fast selection discovers new
Bun test files automatically; only `model.test.ts` and `package.test.ts` are excluded
because they run real subprocess integration. Nothing is skipped in full tests.
Playwright, negative controls, manuscript checks and Lighthouse remain separately
runnable workflows in [VERIFICATION](VERIFICATION.md), not silently included or
claimed as passing by `all`.

## One CI environment

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) keeps job key
`model-check`, display name `gnn conformance (pinned)`. Its one job installs the
single `bun.lock` environment once, provisions the pinned upstream parser, and
calls **`bun run gate all`**. No duplicate lint/test commands or per-arm install
jobs. Node 26 is explicit because full tests exercise an ordinary Node consumer.

Installed-package tests reuse that setup's Bun cache with `bun install --offline`
for both production-only and consumer-tooling installation. They still install
the real packed archive and exercise Node/Bun/NodeNext consumers; they do not
resolve dependency metadata over the network during a gate. A missing cached
dependency remains an error: warm the cache through the normal locked setup.

The workflow uses its pinned `setup-bun`, `setup-node` and `setup-uv` actions;
it does **not** use the organization `setup-python-uv` composite action. Hosted
Actions are billing-locked for this estate: local results are the gate, not a
claim that a hosted job ran. See the parsed model scope in [the GNN pointer](../.github/GNN.md)
and [GNN specification](GNN_SPECIFICATION.md).

## Interpreter prerequisites on this host

The real upstream checkout is read-only input. `GNN_ROOT` may select it;
`GNN_PYTHON` selects an interpreter with NumPy, defusedxml and psutil. Both
`sys.prefix` and `sys.base_prefix` must resolve inside GitVault. A venv physically
inside GitVault but linked to a home-directory uv Python fails that guard.
Do not rebuild or install into the GNN checkout just to run this project.

An independent interpreter was provisioned under GitVault's local project cache,
using a managed Python under GitVault's runtime store:

```sh
# VAULT is the mounted vault containing vault.toml and Username/.
export GNN_PYTHON="$VAULT/Local/cache/active-inference-battleship/gnn-python/bin/python"
export TEMPLATE_PYTHON="$VAULT/Local/cache/active-inference-battleship/template-python/bin/python"
bun run gate all
bun run manuscript:render
```

These overrides do not change either dependency repository. The renderer's own
command and declared variables are documented in [manuscript/README](../manuscript/README.md).
PDF/HTML/DOCX rendering needs Pandoc, pandoc-crossref and XeLaTeX; native Word
projection/page checks additionally need a real `SOFFICE` executable. Missing
LibreOffice is not a successful page check.

## Measured observations

[Generated before/after timings](_generated/gate-timings.md) are refreshed by:

```sh
bun run gate:measure
```

The producer executes every arm sequentially once, preserves full logs under
`.cache/gate-measurements/`, records actual exits and Bun-reported counts, and
rewrites the single timing document. Historical baseline commands and observations
are retained in [gate-baseline.json](../scripts/gate-baseline.json). A dash means
there was no previous dedicated arm, not a zero-second measurement.

Compare the previous complete `check` with `all`; comparing it to reduced-scope
`fast` would hide dropped integration work. One host sample is not a general
speedup claim. Regeneration includes two passing full-suite executions because
`test:full` and `all` are independently runnable arms, not duplicate work inside
one gate plan.
