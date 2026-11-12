# manuscript/

Pandoc/Markdown sources for the paired-study manuscript and the HTML reader. The
manuscript derives the model, reports the paired strategy study, and retains the
original descriptive study. Generated figures live in `manuscript/figures/`; do not
hand-edit generated outputs.

## What is here

| Path | Purpose |
| --- | --- |
| `00_00_frontmatter.md`, `00_abstract.md` | Opening and abstract. |
| `01_introduction.md` … `05_interpretation.md` | Main manuscript sections. |
| `09_references.md`, `references.bib` | Bibliography sources. |
| `10_reader.md` | HTML-only accessibility and geometry adapter for the MathJax reader. |
| `variables.json` | Declared bindings over the reader's `gnn-importer-variables/v1` map used by every rendered edition; no duplicated pin values. |
| `config.yaml`, `preamble.md`, `frontmatter.tex`, `docx.lua`, `web.css` | Pandoc and reader configuration. |

## Reproducing

```sh
task_vault_root="$(cd ../../../.. && pwd)"
export TEMPLATE_ROOT="${task_vault_root}/Username/docxology/Public/template"
export TEMPLATE_PYTHON="${task_vault_root}/Local/cache/active-inference-battleship/template-python/bin/python"
bun run manuscript:render
```

Use an existing compatible interpreter whose environment **and base Python** reside
on GitVault; the example selects the dedicated prepared local environment, not an
environment installed by this command. Without `TEMPLATE_PYTHON`, the wrapper uses
`TEMPLATE_ROOT/.venv/bin/python`.

The only render entry point is `scripts/manuscript.ts` → `research.manuscript`.
It resolves `{{GNN_VERSION}}`, `{{GNN_COMMIT}}`, and `{{GNN_REPOSITORY}}`
from `models/gnn.pin.json` through `variables.json`, using the pinned revision's
`gnn.importers` map rather than a local pin read. All numbered section sources
are hydrated into the template's canonical ignored `output/manuscript/` before PDF, HTML, or DOCX
rendering; authored files are never rewritten. Unknown/malformed tokens and
missing, changed, or unregistered figure assets fail preflight.

`bun run manuscript:figures` deliberately regenerates source-bound figures and
their registry; it is not required merely to render retained, current inputs.
Never edit generated figures or silently refresh their manifest to hide drift.

Native page inspection is a separate workflow:

```sh
# Requires an installed native LibreOffice executable (override SOFFICE if needed).
bun run manuscript:pages
bun run test:manuscript
bun run manuscript:verify
```

These commands also need the real render outputs; they are not implied by render
success. The historical default LibreOffice location is not currently installed
on the working machine. See [`../docs/MANUSCRIPT.md`](../docs/MANUSCRIPT.md) for
tool requirements, variable/snapshot custody, and historical verification limits.
