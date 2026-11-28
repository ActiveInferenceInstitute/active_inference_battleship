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

The shipped receipts are evidence to preserve, not inputs to overwrite when a
source-binding check fails. B1/BT05 renewal requires the release/publication
owner's authorization and the exact frozen protocol/case bytes.

For an authorized renewal, use the independent source-copy and archival sequence
in [the manuscript guide](../docs/publication/MANUSCRIPT.md#paired-follow-up-and-caption-interpretation).
`research:strategies` requires an explicit arm: `prepare` is first-time
materialization only, while `pilot` precedes `run`. A pilot must bind the same
source, protocol, cases and actual Bun runtime as the execution receipt.
`research:analyze` validates retained traces; it does not renew their custody.

Engineering rejection controls qualify source/runtime admission and publication
preservation. They do not regenerate the scientific corpus, prove the original
image-capture cause, or accept new PDF/HTML/DOCX editions. Keep the dated scholarship
reading limits and every rejected/historical receipt; never rewrite numbers or
upgrade a reading limit by hand.
