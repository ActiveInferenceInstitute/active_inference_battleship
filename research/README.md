# research/

Scholarship dossiers and the reproducible strategy study. Python modules here build
the manuscript's research inputs and figures; generated results land in
`research/generated/`, which is committed so the manuscript numbers are traceable.

## What is here

| Path | Purpose |
| --- | --- |
| `SCHOLARSHIP.md`, `SCHOLARSHIP_UPDATE_20261023.md`, `SCHOLARSHIP_BATTLESHIP_20261025.md` | Source-backed scholarship records and reading limits. |
| `STRATEGY_STUDY.md`, `STRATEGY_DESIGN_REVIEW_20261025.md`, `STRATEGY_SCHOLARSHIP_20261025.md` | The paired strategy study design and its scholarship. |
| `*.bib` | Verified BibTeX additions for the manuscript and strategy study. |
| `protocol.json`, `strategy-protocol.json`, `strategy-cases.json` | Frozen protocol and case definitions. |
| `strategy_analysis.py`, `strategy_figures.py`, `strategy_results.py`, `strategy_validation.py` | Study computation and validation. |
| `manuscript.py`, `numbering.py`, `pages.py`, `frontmatter.py`, `editions.py`, `graphical_abstract.py`, `publication_style.py` | Manuscript build helpers. |
| `capture_pixels.py`, `freeze.py`, `docx_reference.py` | Pixel capture, frozen-input binding, and DOCX reference helpers. |
| `generated/`, `historical-16-case/` | Committed generated results and the retained historical study. |

## Running

```sh
bun run research
bun run research:strategies
bun run research:analyze
bun run test:manuscript
```

Treat `research/generated/` as generated evidence: regenerate through these commands
rather than editing the JSON, CSV, or Markdown by hand. The scholarship dossiers state
their reading scope; do not upgrade a reading limit into a stronger claim.
