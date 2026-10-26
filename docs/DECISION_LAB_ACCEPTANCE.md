# Decision lab acceptance — 2026-10-22

**PASS within the tested Chrome application and finite-catalogue model scope.** Independent Round-4 reviewers returned A **PASS** and B **PASS**, with no remaining product or evidence blockers. The combined checklist has **55 PASS, 12 N/A, 0 FAIL**.

This is the post-review acceptance output. The [validation receipt](DECISION_LAB_VALIDATION.md) records the frozen inputs before review, so its pending-review statement is historical. This document was created after both reviewers finished and does not change any reviewed input.

Open the running dashboard at **http://127.0.0.1:5186**. See the [project README](../README.md), [Decision lab guide](DECISION_LAB.md), [model specification](MODEL.md), and [composable API](API.md).

## Delivered behavior

The playable game has reproducible fleets, manual/suggested/autoplay shots, two observation-only assistants, replay export/import, cancellable session workers, and shared controls for epistemic weight, hit preference, precision, subjective sensor noise, and spatial habits.

Decision lab adds six diagnostic maps; numerical A/C/G/E/policy explanations; hypothetical hit/miss posteriors; entropy, effective sample size and KL; beta/gamma sensitivity; isolated settings and four presets; both actor perspectives; explicit Apply without firing; GNN factor inspection; and a separate analysis JSON export. Shared React components, HTML controls, SVG geometry and design tokens implement the interface.

## Verification and custody

- `bun run check`: **60 passed**, 528 assertions; lint, strict TypeScript, actual upstream GNN parser/freshness and production build passed. The seven imported core modules have 100% line/function coverage; imported aggregate line coverage is 99.35%. These are not UI or upstream coverage claims.
- [Production browser receipt](../test-results/results.json): **27 expected passes**, zero skipped, unexpected or flaky, 98.106 seconds. Both themes, all four views, phone/desktop/wide layouts, maps, controls, keyboard operation, sandbox/replay isolation, apply/discard, offline navigation, workers, cancellation, errors and terminal games are covered.
- Four real numerical/game mutants failed their assertions with exit 1. Retained receipt: GitVault `Local/cache/active-inference-battleship/tmp/negative-controls-4rh6oB/results.json`. The numerical source remains identical.
- [Performance receipt](../.cache/performance/2026-10-22T22-59-11.541Z/summary.json): three mobile and three desktop runs scored 100 in all four Lighthouse categories. This measures default Play on loopback.
- Each independent reviewer directly opened **all 521 manifest images**. Each freshly measured **144 history figures** across all three plots, 1/3/4/10 shots, both actors/themes, phone/desktop and real Chrome 200% page zoom. Minimum endpoint inset was **9.59375 CSS px**, maximum center error **0.03174 px**. Removing the gutter reproduced **6.234375 px overflow**, then restoring it passed. Native locator-capture failures were retained and excluded; raw Chrome captures supplied the visual proof.
- A4 freshly passed 24 axe configurations, worker cancellation, replay preservation, offline and settings flows, and a real timeout/retry after **30,109 ms**. The root's retained current timeout was 30,171 ms. Browser `messageerror` injection remains outside the evidence.
- Independent numerical extension A1 checked 780 branches across 130 real cases, both actors and extreme noise, with 49,585 comparisons; maximum absolute discrepancy was 2.5944e-10 against tolerance 2e-9. Later reviewers verified unchanged numerical/model/parser/test bytes and the bound upstream closure. This retains that bounded result; it does not claim the oracle was rerun in Round 4.

The frozen packet binds **59 source files**, **521 PNGs** (520 application plus one Chrome Settings method frame), and **616 review inputs** including documentation and receipts. Maximum physical image height is 5,262 px. Long pages use overlapping segments; source freshness and actual composition were checked. Both reviewers found zero hash, size, or mtime drift.

| Binding | SHA-256 |
| --- | --- |
| [Source manifest](../.cache/source-manifest.json) | `3afefde476e11fff4f80f1780a3a357d5f7dd3b2d6217ca4b14fd5aa6cdc412f` |
| [Capture manifest](../.cache/capture-manifest.json) | `6fce1a671ed25d5ac83d1f637ce0b281498a8acea07a71ae07ed85c0c865dee1` |
| [Full reviewed inputs](../.cache/review-input-r4.json) | `4d033d063a78c1d1abcd751ed61675c4b1e51abebc4c1a9acfd9530abc415f6d` |
| GNN specification | `a425a3f6b0bdc8cb28a165f92c27c6ea329d3e48d2ea3f16136a93fbb447c91c` |

The full frozen source/evidence archive is GitVault `Local/artifacts/active-inference-battleship-lab-review-r4-20261022.tgz`. Earlier red and green packets are preserved as recorded in the validation receipt.

## Independent checklist

Reviewer **A**: [terminal receipt](/Volumes/GitVault/Local/cache/active-inference-battleship/audit-a-r4-codex-20261022/review-result.json), [fresh browser checks](/Volumes/GitVault/Local/cache/active-inference-battleship/audit-a-r4-codex-20261022/browser-results.json), [final custody](/Volumes/GitVault/Local/cache/active-inference-battleship/audit-a-r4-codex-20261022/after.json). In A's proof column, **M** is a zero-based current capture-manifest index; **B** is a checks-array index in A's fresh browser receipt.

Reviewer **B**: [complete review](/Volumes/GitVault/Local/cache/active-inference-battleship/audit-b-r4-20261022/final-review.md), [machine receipt](/Volumes/GitVault/Local/cache/active-inference-battleship/audit-b-r4-20261022/final-review.json), [final custody](/Volumes/GitVault/Local/cache/active-inference-battleship/audit-b-r4-20261022/after.json). In B's proof column, **#** is a one-based current capture-manifest index. Source locators follow each review's relative UI/style paths.

| Item | Result | Located proof | Reviewer |
| --- | --- | --- | --- |
| A1 Grid anchoring | PASS | #245–390; `styles.css:102,215` | B |
| A2 Full-bleed background | PASS | #11–106,245–390; `styles.css:6,16` | B |
| A3 Margins/prose measure | PASS | #245–390; `DESIGN.md:37,41` | B |
| A4 Phone safe-area allowance | PASS | #217–229,305–317,362–374; `styles.css:1176–1199`; browser scope | B |
| A5 Phone scrollbar gutter | PASS | #261–374; fresh phone layout measurements | B |
| A6 Scroll ownership/bar legibility | PASS | #261–374,396–437; fresh scroll-owner checks | B |
| A7 Shared edges/gaps/alignment | PASS | #494–518; `LineChart.tsx:27–35,72–83` | B |
| A8 Grouping/control spacing | PASS | #438–491; `DecisionLab.tsx`, `SandboxSettings.tsx` | B |
| A9 Responsive wrapping/overflow | PASS | #184,187–206,245–390,460–484; fresh layout/text bounds | B |
| A10 Continuation cues | PASS | #261–374,460–484; disclosures and jump links | B |
| A11 Narrow-window adaptation | PASS | #11–106,261–374; `styles.css:1150–1199`; browser adaptation | B |
| B1 Primary-action hierarchy | PASS | #186,217–229,447,467–468 | B |
| B2 Reset/cancel defaults | PASS | #107–121,405,423,429; explicit secondary buttons | B |
| B3 Purpose-specific titles | PASS | #245–390; view components | B |
| B4 Reading-order priority | PASS | #245–390,446,460–484 | B |
| B5 Restrained semantic accents | PASS | #245–390,440–491; `tokens.css` | B |
| B6 Type hierarchy/font families | PASS | #245–390; `tokens.css:14–23` | B |
| C1 Readable typography | PASS | #494–519; fresh 17px body/15px axes measurements | B |
| C2 Human-readable copy | PASS | #1–9,391–437,492–493; labelled provenance #187–206 | B |
| C3 Action/tab wording | PASS | #245–390,447,467–470; `App.tsx`, `SandboxSettings.tsx` | B |
| C4 Glyph containment/wrapping/zoom | PASS | #494–518; fresh geometry, negative control and 12 raw native captures | B |
| C5 CJK wrapping | N/A | No CJK content in #1–521 | B |
| C6 Empty/error recovery | PASS | #1–9,391–437,492–493 | B |
| C7 Visible field labels | PASS | #245–390,440–491; control/map/setup components | B |
| C8 Selectable useful text | PASS | #184,187–206,471–477; fresh selectable-text checks | B |
| D1 Touch/pointer targets | PASS | #122–183,440–491; 44px controls; documented dense-board exception | B |
| D2 Native iOS tab-bar anatomy | N/A | Web navigation; all four destinations visible | B |
| D3 Native Mac toolbar anatomy | N/A | No native toolbar implemented | B |
| D4 Continuous action hit areas | PASS | #122–183; padded button/label boxes | B |
| E1 Paired themes | PASS | #11–106,122–183,245–390,440–491 | B |
| E2 Contrast | PASS | #122–183,520–521; fresh 44 token pairs and 72 marker checks | B |
| E3 Non-colour state cues | PASS | #1–9,122–183,440–491; symbols/checks/focus rings | B |
| E4 Consistent colour semantics | PASS | #440–491; `DecisionMap.tsx:7–19,40–54` | B |
| E5 Translucent surfaces | N/A | Fixed action surface is opaque | B |
| E6 System/manual theme | PASS | #492–493; fresh failure→system-change→retry→override sequence | B |
| F1 Consistent icon family | PASS | #245–390; Phosphor imports | B |
| F2 Spacing/radius tokens | PASS | #440–491,494–518; named 3px board exceptions and `--s4` gutter | B |
| F3 Shared-component consistency | PASS | #186,217–229,440–521; shared Board/Controls/LineChart | B |
| F4 Preserved identity | PASS | #245–390,492–493; unchanged `App.tsx` binding | B |
| F5 Active/focus states | PASS | #1–9,122–183,245–390,440–491 | B |
| F6 Standard action glyphs | PASS | #122–183,245–390,470,477 | B |
| F7 Sheets/popover stacking | N/A | No application sheets/popovers in #1–521 | B |
| G1 Caused motion | PASS | `styles.css:317,450,605`; M0–2, M121–158 | A |
| G2 Identity/layout | PASS | `styles.css:317,325`; B68; M0–2 | A |
| G3 Interruptibility | PASS | B53,68; `useBattle.ts:55`; M0–2 | A |
| G4 Reduced motion | PASS | B69; `styles.css:1369`; M5 | A |
| G5 Immediate feedback | PASS | B62,64,66,68; `App.tsx:149`, `Startup.tsx:3`; M7,392–436 | A |
| G6 Stable loading/layout | PASS | `Startup.tsx:3`; M7,244–389; retained six default-Play CLS values all 0 | A |
| G7 No disruptive motion | PASS | M0–5,121–182; `styles.css:317,450,605,1369` | A |
| H1 Empty/loading/error/offline | PASS | B0–5,55–61; M6–8,229–243,437–438 | A |
| H2 Loading feedback | PASS | B62,64,66; fresh real timeout **30,109 ms**, retry passed; `worker/client.ts:11` | A |
| H3 Local failure/success | PASS | B51–52,61–67; `App.tsx:96,149,161,165`; M3,6,8,469 | A |
| H4 Modal alerts | N/A | Inline errors only; `Startup.tsx:6`, `App.tsx:161`; B87 | A |
| H5 Control states | PASS | M4,121–182,362–363; B50,68–70; `styles.css:48,160,317,450,605` | A |
| H6 Sheets/modals | N/A | None present; B87. Explicit sandbox disposal verified B54 | A |
| H7 Cancellation | PASS | B62–67 preserve replay bytes in all three information views; M392–436 | A |
| H8 Permissions | N/A | No permission flow; reviewed App/UI sources and all 521 captures | A |
| H9 Authentication | N/A | No authentication/password flow; B87 and reviewed App/UI sources | A |
| H10 Search | N/A | No search; B87; M244–389 | A |
| H11 Settings | PASS | B0–4,39–52; `Controls.tsx:71`, `theme.ts:3`; M371–373,491–492 | A |
| I1 Focus/order | PASS | B6,45–49,70; M4,381; `styles.css:48,361`, `Board.tsx:26` | A |
| I2 Keyboard conventions | PASS | Native activation/sliders; B6,45–49; only board arrows intercepted, `Board.tsx:26–41` | A |
| I3 Accessible semantics | PASS | **24 fresh axe scans, zero violations**; `Board.tsx:89`, `Controls.tsx:86`, `LineChart.tsx:58,87` | A |
| I4 Gesture alternatives | PASS | Buttons and coordinate select; B6,45–49; M405,471 | A |
| I5 Autoplaying media | N/A | No audio/video; B87. Game autoplay pause verified B53 | A |
| J1 Native macOS anatomy | N/A | Browser application; native window/menu/settings clauses outside scope | A |
| J2 Compact phone behavior | PASS | M361–373,395–436,453–490; B104–119; numeric seed input `PlayView.tsx:198` | A |

## Boundaries

The actual local GNN parser imports and checks the supported model contract. Inference is exact conditional on a biased finite sampled fleet catalogue. Planning is one shot; likelihood parameters do not learn, and subjective noise differs from deterministic game observations. Seeds reconstruct fleets, so this is a local teaching/research tool with transparent exports.

Acceptance covers the tested Chrome surface and source-bound model. It does not establish scientific efficacy, unrestricted Battleship optimality, a longer horizon, native Safari, physical-device safe areas, screen-reader interpretation, fresh offline installation, secure multiplayer or deployment.
