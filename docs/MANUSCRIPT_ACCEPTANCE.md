# Manuscript review and local handoff

The R8 manuscript/research candidate is accepted for local integration after two independent read-only terminal **PASS** reviews. This note was added after those reviews and is a separate handoff appendix, not one of the 113 frozen source entries. It does not change the approved manuscript, data, figures, code or captures.

## Editions and reproduction

- [PDF manuscript](../output/pdf/active_inference_battleship_combined.pdf)
- [Word manuscript](../output/docx/active_inference_battleship.docx)
- [HTML reading edition](../output/web/index.html) — preserve its complete assets directory; MathJax uses the documented CDN mode.
- [Reproduction guide](MANUSCRIPT.md), [scholarship dossier](../research/SCHOLARSHIP.md), [bibliography](../manuscript/references.bib), and [fixed research protocol](../research/protocol.json).

The editions use the actual local docxology/template 4.0.2 renderer. The render receipt binds 25 input files and 258 imported template Python files, rather than assuming a clean upstream commit. PDF and native LibreOffice DOCX conversion each produce 12 pages; Word retains 88 editable equations, three described figures, a six-column table and page-number fields. LibreOffice 26.8.1.1 supplied the native conversion. [Renderer provenance](../output/render-receipt.json) and [edition validation](../output/manuscript-validation.json) record the executed boundary.

The manuscript connects the implementation to 20 scholarly works and one pinned software reference. Five scholarly sources are explicitly abstract-only; selected substantive passages, unresolved bibliography questions and claim support are documented in the dossier. This is not a literature-wide novelty or completeness claim.

## Scientific and software evidence

The fresh independent A review checked 128 searches, 5,246 shots, 15,738 numerical comparisons, eight summaries and 324 analytic cases. Maximum trace and analytic discrepancies were 6.412648190234904e-13 and 1.2434497875801753e-14 respectively. All 32 EFE/hit pairs have equal completion counts; only 27 have identical ordered traces. Twenty-one near ties remain within the oracle's 2e-12 score tolerance, so exact-rational ordered-trace identity is not asserted.

The model remains exact categorical Bayes conditional on its finite, biased, labelled fleet catalogue, up to floating point. Duplicate-label prior mass, subjective observation noise, deterministic actual outcomes, one-step planning, manually set habits and the absence of parameter learning are explicit. The demonstration samples truth from the same catalogue. It establishes neither unrestricted Battleship optimality nor biological or educational efficacy.

The actual GNN parser was independently exercised, including incompatible-horizon, continuous-time and duplicate-variable rejections. The bound upstream revision is `073f21d5b25c403d1ef0c965dd945bb2287d4de4`; its 48-file parser closure remains `1dea8f4f8fad2351fed768177d48512ef91a177d38e51ff1e95fb942f2c1ffdf`.

Current producer checks passed 66 application/research tests with 567 assertions, lint, types, model freshness and production build, plus 15 real-file manuscript tests. Both PDF syntax checks and all-four-bound document geometry checks passed. The three-process parser-rejection fixture has an explicit 30-second aggregate budget; its assertions are unchanged and other unit limits are unchanged. Earlier five-second timeout runs remain failed evidence, not passes.

The browser checks cover 704 math-focus and 704 blur states, labelled controls, actual keyboard adjustments and restoration, pointer access between menu generations, readable Close glyphs, and eleven rejecting/restoring menu faults. Two real pending font requests caused bounded readiness to reject after 31,412 ms; releasing them and reloading recovered. Failed exploratory and headless/GPU runs remain preserved without claiming a universal lifecycle cure.

## Independent rendered review

Both reviewers individually opened all **565** current PNGs: 12 PDF pages, 12 native DOCX pages, 166 HTML/print/math frames, 198 ordinary menu/dialog frames and 177 actual native Chrome 200% frames. The latter comprise 102 reading, 74 menu/dialog and one Settings method frame. Native zoom changes layout width 1440→720 and Retina DPR 2→4 while outer width stays 1440 and CSS zoom stays 1. All images decode, postdate the rendering inputs and remain within the bounded capture height.

- [Ownership A report](../../../../../Local/cache/active-inference-battleship/manuscript-a-r8-20261023/report.md): **PASS**, 12 applicable G–J items pass, 13 N/A; fresh numerical and functional checks.
- [Ownership B report](../../../../../Local/cache/active-inference-battleship/manuscript-b-r8-20261023/REPORT.md): **PASS**, 32 applicable A–F items pass, 10 N/A; document/layout and control-state checks. Its scientific oracle is retained R7 evidence, distinguished from A's fresh R8 run.

Both complete image ledgers and before/after/final custody receipts are linked from those reports. All 937 bound inputs retained exact bytes, sizes and nanosecond mtimes throughout review.

| Frozen R8 manifest | SHA-256 |
| --- | --- |
| [113 sources](../.cache/manuscript-review-r8/source-manifest.json) | `198e1ee70d7cd6f49faaf7676d9d566f7d51c55e32d7bd1f5d1533b18d0165da` |
| [565 captures](../.cache/manuscript-review-r8/capture-manifest.json) | `1c972adefe5d4c346e2d45cb4a0b96d8b631ff4b920c1171c152d874d6de9ec7` |
| [937 inputs](../.cache/manuscript-review-r8/input-manifest.json) | `c75304a67d7f2bfebee8b001ae5658ffa6b5140de5f4fd20c6c5c8c5e8c3e45e` |

## Local custody and scope

GitVault-local machine record locations: [copy receipt](../../../../../Local/cache/active-inference-battleship/manuscript-20261023/integration.json) and [canonical byte/HTTP verification](../../../../../Local/cache/active-inference-battleship/manuscript-20261023/handoff-verification-r8.json). Canonical integration is separate from the frozen review: the copy guard checks original-owner conflicts, parent traversal and symlinks, uses a supported repository lease, preserves replaced files, and verifies every copied hash.

The [frozen candidate archive](../../../../../Local/artifacts/active-inference-battleship-manuscript-candidate-r8-20261023.tgz) contains 940 round-trip-verified members, SHA-256 `75297b40ad57c8a29c5238786ca184101df2da79177a0071c0f265b0b3e007f8`. The separate [imported-source archive](../../../../../Local/artifacts/active-inference-battleship-manuscript-imported-sources-r8-20261023.tgz) preserves 258 template and 48 GNN Python sources, SHA-256 `f5c35b9b47663a880975b9c5596650521504b531449f90a1368c7bb6c0a7e89b`. It is not a full runtime archive. These local receipt/archive links require the GitVault workspace.

Acceptance is bounded to the inspected Chrome reading surface, native LibreOffice rendering, source/model contract and fixed demonstration. It grants no publication, deployment, whole-template, Safari, physical-device, screen-reader or Microsoft Word desktop approval. No Git commit, push, DOI or public release is part of this handoff.
