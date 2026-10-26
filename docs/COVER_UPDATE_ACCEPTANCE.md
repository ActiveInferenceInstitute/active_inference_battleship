> Historical record: statements below describe the dated pre-release candidate. Current organization ownership, releases, and DOI are documented in [publication details](PUBLICATION.md).

# Graphical opening and Battleship scholarship update

This records the local manuscript update requested on October 25, 2026. It is a builder verification and integration record, not a public-release or scientific efficacy approval.

## Delivered changes

- A redesigned graphical abstract connects the six recorded public outcomes to joint posterior occupancy and actual action probabilities. Its fixed zero-to-one legend, hit/miss symbols, leading coordinates, and feedback arrow make the inference cycle interpretable. A companion diagram separates the private environment from the assistant. Original dashboard crops and their recorded data remain unchanged.
- Cover contact appears in PDF, DOCX, and HTML: Daniel Ari Friedman, Active Inference Institute, ORCID `0000-0001-6232-9096`, and `daniel@activeinference.institute`.
- PDF margins are 18 mm, reduced from 24 mm. Hyperlinks use accessible red in PDF, Word, and the HTML light/print themes, with a lighter red in the dark reader. Actual linked PDF character ink and projected Word contrast are checked.
- Seven primary scholarly papers and a manufacturer rulebook extend the bibliography to 29 entries: 27 scholarly papers, one software source, and one manual. Both the guide and manuscript distinguish the original reading dossier from the new Battleship supplement. The supplement records selected substantive passages and task differences; reused tasks/corpora are not independent replications.
- Ten equations, four definitions, two propositions, and one example retain automatic numbering. The graphical cover and dedicated model/Play/decision plates remain on physical pages 1–4.

See [the manuscript workflow](MANUSCRIPT.md), [original dossier](../research/SCHOLARSHIP.md), and [Battleship supplement](../research/SCHOLARSHIP_BATTLESHIP_20261025.md). Linked supplement/source companions are exported beside the local editions. Preserve those companions when distributing the draft.

## Review findings and verified corrections

Two independent R1 reviewers each individually read all 763 images and found zero custody drift. Their terminal verdicts remain **REVISE**: the guide's inventory was stale, the manuscript reading summary needed reconciliation, and two mobile reading frames clipped the leading table label after an unsettled keyboard scroll. Those reports are preserved; they are not relabeled as independent PASS results.

The builder corrected the narrow findings directly. The original reset sequence was reproduced in real Chrome: offset zero immediately after reset drifted to 38 px after the remaining animation frames. The camera now waits for the actual `scrollend` event, resets instantly, and asserts zero offset and contained caption-leading glyph bounds over five frames and before every reading capture. Eighteen real cycles pass in both compact themes; two deliberate residual-offset controls reject. The corrected light/dark table frames were opened and checked. No screenshot pixels were retouched and no paint thresholds were relaxed.

The guide now reports the actual 29-entry inventory. A new source check compares it with the parsed bibliography; restoring 21 fails the same check. The manuscript explicitly names both reading periods, links the supplement, and retains qualified Sevenster, unread Lindley, unresolved corrigendum, and selected-reading limits. All editions and the full reader/menu matrix were regenerated.

**Current builder checks:** 29 manuscript tests pass; source/edition validation, lint, and typecheck pass. The original R2 lint failure on formatting/import order is retained separately from its corrected successful run. PDF has 16 pages; the actual DOCX's LibreOffice projection has 18. All numbered formalisms, four-page opening, figure/text bounds, 29 references, and cover contacts pass validation. Actual PDF URI-link ink checks cover 43 links; minimum projected Word text contrast is 7.516:1.

The regenerated matrix has 763 PNGs: 34 physical pages, 242 ordinary reader frames, 241 native Chrome 200% frames, 234 native-menu frames, and 12 source illustrations/crops. Source-bound paint checks cover 9,332 ordinary and 2,942 native-zoom text rectangles with zero missing regions. All PNG signatures, dimensions, decoding, and hashes were checked. Of these images, 483 are byte-identical to R1's independently inspected images; 280 changed. Builder inspection covered the corrected table frames and revised physical reading/reference pages. **No fresh independent R2 visual verdict or claim that all 280 changed images were individually read is made.** Current structural, paint, interaction, and direct inspection evidence supports this bounded local handoff.

## Custody and scope

The R2 [source](../.cache/cover-review-r2/source-manifest.json), [capture](../.cache/cover-review-r2/capture-manifest.json), and [input](../.cache/cover-review-r2/input-manifest.json) manifests bind 194 sources, 763 images, and 1,164 inputs. The [repair response](../.cache/cover-evidence-r2/R2_REPAIR_RESPONSES.md) retains exact failures, corrections, and verification boundaries. This acceptance note was added afterward and is not retrospectively part of the reviewed source inventory.

| Manifest | SHA-256 |
|---|---|
| Source | `6c955258bde86bfce551a213d1d5d711fc47ce85cb7567b0130400b1d1f3a5f9` |
| Capture | `223710b6c25a7454793a46b4d3780778b03098cfda588b5d290aacc269b439b8` |
| Input | `cdbe15fa3f13881b6ec08828d4805d475453ec043b612b48675513a7a4c53b7a` |

Independent R1 reports are retained under GitVault's `Local/cache/active-inference-battleship/`:

- `cover-a-r1-20261025/REPORT.md`, SHA-256 `8ed79fc30e04f4c0af8eddc9a52c7b49d5a26b91e2d5871f7ffff151376066f8`.
- `cover-b-r1-20261025/REPORT-v2.md`, SHA-256 `ed319d784b9c2874e6e49268ccee1f25ba6d952aee21c43773f800b6e7e39462`.

Actual template imports and the formalism filter remain separately bound, as do the 48 compiled GNN parser files. The concurrent live GNN owner edit was preserved; a fresh default check against dirty live upstream is not claimed. Core inference, recorded study results, and original mathematical display interiors remain unchanged. Historical native-menu failures and invalid harness attempts retain their stated limits, including the unexplained historical R3 B focus path.

Acceptance is limited to the local draft and exercised Chrome/PDF/LibreOffice projection. Native Microsoft Word, Safari, physical devices, screen readers, offline operation, public-clone readiness, and empirical efficacy are not certified. Generalized Notation Notation remains a checked specification for this finite, biased-catalog, one-shot backend with no parameter learning. American English and Active Inference Institute identity remain. Public GitHub release at [ActInfInstitute/active_inference_battleship](https://github.com/ActInfInstitute/active_inference_battleship) and a Zenodo PDF DOI are future plans. Nothing was published or deposited.
