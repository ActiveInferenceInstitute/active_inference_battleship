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
| `config.yaml`, `preamble.md`, `frontmatter.tex`, `docx.lua`, `web.css` | Pandoc and reader configuration. |

## Reproducing

```sh
bun run manuscript:figures
bun run manuscript:render
bun run manuscript:verify
bun run manuscript:pages
```

The renderer requires the local docxology/template checkout; see
[`../docs/MANUSCRIPT.md`](../docs/MANUSCRIPT.md) for evidence and reading limits.
Do not hand-author result numbers: figures and variables come from the research and
analysis scripts under [`../research/`](../research/README.md) and [`../scripts/`](../scripts/README.md).
