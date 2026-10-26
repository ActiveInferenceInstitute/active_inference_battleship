# Independent visual review — 2026-10-22

Historical v0.1 review. The current Decision lab extension is tracked in [v0.2 validation](DECISION_LAB_VALIDATION.md); this earlier approval does not automatically cover later source.

Combined round 3 verdict: **PASS** within the frozen Chrome source and capture scope. Independent functional/design-system pass A returned PASS with high confidence; independent rendered pass B returned PASS with confidence 0.94. No blocking product or evidence findings remain. All 67 checklist items are accounted for: 54 PASS, 13 N/A, zero FAIL.

Both reviewers are independent read-only leaves. The source under review is bound by the [38-file source manifest](../.cache/source-manifest.json). The [capture manifest](../.cache/capture-manifest.json) binds 332 PNGs: 331 application frames and one Chrome Settings frame establishing the native zoom method. The production application is served on loopback port 5186.

## Evidence keys

| Key | Evidence |
| --- | --- |
| Matrix | `test-results/game-renders-every-view-in-6793a-or-accessibility-violations-{desktop,mobile,wide}/surfaces/`; all three views, both themes, complete pages/overlapping segments and scroll ends |
| Pointer | `test-results/game-keeps-secondary-label-64df1-rols-legible-in-both-themes-desktop/`; 12 cases, 36 rest/hover/pressed frames and `pointer-states.json` |
| Fault | [Startup, error, timeout, focus, motion and replay frames](../.cache/browser-states/2026-10-22T21-10-05.161Z/results.json) |
| Operation | `test-results/game-shows-import-progress-8911a-from-every-information-view-{desktop,mobile}/`; pending imports and cancellation |
| Zoom | [Native Chrome 200% setting, geometry, and 64 application viewport frames](../.cache/native-zoom/2026-10-22T21-10-05.650Z/results.json) |
| Browser execution | [17 expected passes, zero skipped/unexpected/flaky](../test-results/results.json) |
| Worker API | [Real abort, cloning failure, rejection, recovery and cleanup results](../.cache/worker-api-results.json) |

Exact image paths, dimensions, timestamps, and SHA-256 values are in the capture manifest. It includes the additional playing, opponent-diagnostic, expanded-source, victory/defeat, offline, and disabled-control states. Extra states were captured at their recorded configurations; this does not imply every extra state was captured in every configuration.

## G–J: functional and design-system integrity

Pass A independently opened all 332 PNGs, checked every capture hash/signature/dimension and all 38 source hashes, and found no mismatch or stale capture. All 25 items are accounted for: 18 PASS, seven N/A, zero FAIL.

| Item | Verdict | Proof and bounded scope |
| --- | --- | --- |
| G1 Caused motion | PASS | Fault `interaction-{rest,mid,settled}.png`; short CSS transitions, no perpetual animation |
| G2 Geometry/identity | PASS | Complete Pointer series; hover/press preserves layout and targets |
| G3 Interruptibility | PASS | Pointer series; short CSS transitions, cancellable workers and request epochs |
| G4 Reduced motion | PASS | Fault `reduced-motion.png`; Pointer reduced series retains tone while removing position/scale |
| G5 Immediate feedback | PASS | All 12 Pointer cases record active=true and distinct styles; no fabricated progress percentages |
| G6 Stable loading | PASS | Fault `worker-loading.png`; task-specific startup, sized real application, no decorative splash |
| G7 Reading-safe motion | PASS | Entire packet and animation source: no flashing or continuous oscillation |
| H1 Relevant states | PASS | Empty Matrix diagnostics, Fault loading/failure, offline guide capture series; fresh offline installation unproved |
| H2 Loading feedback | PASS | Operation pending series; specific status, preservation, Cancel, bounded timeout/Retry |
| H3 Local errors | PASS | Fault `invalid-replay-preserves-game.png`; concise feedback beside Import and resident game retained |
| H4 Modal alerts | N/A | No modal alert dialog; inline alerts are assessed under H3 |
| H5 Control states | PASS | Pointer series, both disabled themes, Fault keyboard focus, check/wash selection marker |
| H6 Sheets/modals | N/A | No application sheet or modal |
| H7 Cancellation | PASS | Operation series and real worker cleanup; leaving Play pauses autoplay |
| H8 Permissions | N/A | No application permission or consent request |
| H9 Authentication | N/A | No authentication, password or onboarding flow |
| H10 Search | N/A | No search interface |
| H11 Settings clarity | PASS | Matrix controls/values/help; native checkbox and non-colour navigation marker |
| I1 Focus/order | PASS | Fault keyboard frame; Matrix header; user-directed arrows and theme-to-navigation order |
| I2 Keyboard conventions | PASS | Native buttons/select/details and local board navigation; no global shortcut override |
| I3 Accessible structure | PASS | Named cells/controls, landmarks, described charts, numeric meters and tables; retained axe assertions |
| I4 Alternatives | PASS | Explicit targeting/firing/settings/cancellation controls; no gesture-only operation |
| I5 Autoplay media | N/A | No audio/media; game autoplay is covered under H7 |
| J1 Native Mac anatomy | N/A | Browser application, not a native macOS application |
| J2 Compact behavior | PASS | Complete phone layouts, native numeric seed/selects, no custom compact popover |

Pass A source-reviewed cancellation cleanup, including the `messageerror` handler. Browser `messageerror` injection was not proved. It inspected the retained execution receipts without rerunning or overwriting them. Precise same-frame latency, assistive-technology interpretation, native Safari, physical-device safe areas, fresh offline installation, and deployment are outside this approval.

The numerical R3 gate remains separate. Pass A confirmed the real component/token implementation and explicit finite biased-catalogue, one-shot, no-parameter-learning limitations; it did not renew the numerical gate.

## A–F: rendered layout and fidelity

Pass B independently opened all 332 PNGs, including every mobile segment, all 64 native 200% zoom frames, and all 36 pointer-state frames. All capture hashes/signatures/dimensions and all 38 executable-source hashes matched; every capture postdates the last executable-source edit. It read the application, every UI/worker module, styles/tokens, and project documentation without modifying them. All 42 items are accounted for: 36 PASS, six N/A, zero FAIL.

`C[n]` below identifies the exact zero-based entry `/n/path` in the capture manifest, including its recorded SHA-256. Source paths are relative to the project root. Ranges denote each entry in the inclusive range.

| Item | Verdict | Exact capture/source proof and scope |
| --- | --- | --- |
| A1 Intentional anchoring | PASS | C[213], C[299]; centered workspace and aligned supporting pane; `src/styles.css:102–115,215–229` |
| A2 Full-bleed background | PASS | C[245], C[282], C[305]; edge-filling canvas; `src/styles.css:3–19,1000–1018` |
| A3 Margins/prose measure | PASS | C[217], C[303]; symmetric margins, 70ch prose; `src/styles.css:102–106,765–785` |
| A4 Phone safe areas | PASS | C[244], C[281]; reserved space and safe-area CSS; `src/styles.css:993–1018`; physical-device behavior unclaimed |
| A5 Scrollbar gutter | PASS | C[221], C[268], C[282]; symmetric phone content, no reserved right gutter; `src/styles.css:102–106,993–1177` |
| A6 Scroll/overlay legibility | PASS | C[246], C[254], C[281]; document scroll and opaque action bar; `src/styles.css:468–478,1000–1018` |
| A7 Alignment/spacing | PASS | C[213], C[215], C[299]; shared edges/gaps; `src/tokens.css:24–35`, `src/styles.css:215–244` |
| A8 Grouping | PASS | C[254–256], C[291–293]; settings/help/dials/actions grouped; `src/styles.css:519–699` |
| A9 Responsive/long strings | PASS | C[154–172], C[221–305]; phone column, desktop/wide layout, wrapped hashes; `src/styles.css:812–854,964–1177` |
| A10 Continuation cues | PASS | C[245–246], C[268–269]; partial content and native disclosure chevron; `src/ui/Guide.tsx:167–170` |
| A11 Native Mac window/sidebar | N/A | Browser application; responsive pane reflow is covered by A9; C[31], C[63] |
| B1 Primary action | PASS | C[213], C[219], C[182]; filled Launch/Fire and secondary peers; `src/ui/PlayView.tsx:96–151`, `src/styles.css:583–625` |
| B2 Destructive/default actions | PASS | C[318], C[323]; secondary Cancel, no irreversible destructive flow or submitting form; `src/App.tsx:116–165` |
| B3 Plain view titles | PASS | C[213], C[215], C[217]; game/diagnostics/guide titles; `src/ui/PlayView.tsx:44`, `Diagnostics.tsx:219`, `Guide.tsx:10` |
| B4 Content priority | PASS | C[213], C[245], C[282]; game precedes supporting details; `src/ui/PlayView.tsx:40–88` |
| B5 Semantic accents | PASS | C[209], C[213], C[295]; neutral navigation with labelled semantic accents; `src/tokens.css:2–13,39–50` |
| B6 Type hierarchy | PASS | C[217], C[268], C[303]; two font stacks and coherent hierarchy; `src/tokens.css:14–23`, `src/styles.css:63–100` |
| C1 Reading sizes | PASS | C[127–150]; body 17px, secondary 15px, accepted compact coordinates/data exceptions; `src/tokens.css:16–23`, `e2e/game.spec.ts:210–212` |
| C2 Human-facing copy | PASS | C[3], C[306–309]; concise statuses/errors and explicitly technical provenance; `src/App.tsx:147–163`, `src/ui/Guide.tsx:149–165` |
| C3 Labels/capitalization | PASS | C[213], C[244], C[318]; clear outcomes and sentence case; `src/App.tsx:75–87,116–155`, `src/ui/PlayView.tsx:96–151` |
| C4 Wrapping/200% zoom | PASS | C[10–73], C[154–172]; no clipped/overlapping text; `.cache/native-zoom-probe.ts:14–45`, `src/styles.css:964–1177` |
| C5 CJK | N/A | No CJK content; C[151], C[217], `src/ui/Guide.tsx:8–201` |
| C6 Empty/error recovery | PASS | C[3], C[306–307], C[318], C[323]; adjacent recovery, preserved game; `src/App.tsx:147–163`, `src/ui/Startup.tsx:1–16` |
| C7 Field labels | PASS | C[244], C[258], C[291–293]; visible seed/catalogue/inspector/slider labels; `src/ui/Controls.tsx:1–176` |
| C8 Selectable text | PASS | C[233], C[270], C[3]; ordinary selectable provenance/error DOM; `src/ui/Guide.tsx:149–170`, `src/App.tsx:159–163` |
| D1 Targets/spacing | PASS | C[244], C[254–256], C[281]; ordinary 44px controls, phone actions 48px; `src/styles.css:433–467,519–625,1000–1018`; accepted compact spatial-board exception |
| D2 Native phone tab bar | N/A | Web header navigation; all routes visible with selected check; C[221], C[268], C[282] |
| D3 Native action toolbar | N/A | No native back/close toolbar; web masthead and game actions are separate; C[213], C[245] |
| D4 Continuous hit areas | PASS | C[244], C[281]; full padded rectangular targets; `src/styles.css:141–163,583–599,1000–1018` |
| E1 Paired themes | PASS | C[209]/C[215], C[213]/C[219], C[245]/C[282], C[295]/C[301]; paired assets/surfaces; `src/tokens.css:1–51` |
| E2 Contrast | PASS | C[89], C[108], C[127–150]; independent disabled text ratios 7.11:1 dark / 5.72:1 light, boundary/raised 4.75:1 / 3.84:1; `e2e/game.spec.ts:200–209` |
| E3 Redundant cues/focus | PASS | C[245–246], C[74], C[4]; symbols/text plus colour, focus outline; `src/ui/Board.tsx:88–108`, `src/styles.css:48–51,305–355` |
| E4 Colour semantics | PASS | C[74], C[173–181], C[213]; consistent labelled roles; `src/tokens.css:9–13,46–50`, `src/ui/BattleBoards.tsx:51–56,109–122` |
| E5 Translucent surfaces | N/A | No translucent scrolling overlay; phone action bar is opaque; C[254], C[281] |
| E6 System theme | PASS | C[308–310], C[319]; visible System option, default and live preference listener; `src/App.tsx:59–69`, `src/ui/useBattle.ts:35,51–60` |
| F1 Icons | PASS | C[213], C[244], C[281]; consistent Phosphor glyphs, no emoji icons; `src/App.tsx:1–8,44–49` |
| F2 Tokens/radii | PASS | C[219], C[282], C[305]; shared panel/control/board geometry; `src/tokens.css:24–35`, `src/styles.css:230–244,305–312,583–599` |
| F3 Shared components | PASS | C[208–305], C[308–331]; shared header/footer/panels/controls; `src/App.tsx:40–165`, `src/styles.css:230–244,855–914` |
| F4 Branding | PASS | C[213], C[245], C[303]; masthead wordmark/crosshair, no branding-only loading screen; `src/App.tsx:44–49` |
| F5 Active/focus states | PASS | C[245], C[268], C[90–126]; check/wash selection, hover/press even with reduced motion; `src/styles.css:48–51,141–163,433–467,1178–1189` |
| F6 Standard glyphs | PASS | C[244], C[281], C[318]; conventional symbols with text; `src/App.tsx:116–141`, `src/ui/PlayView.tsx:96–151,217` |
| F7 Windows/sheets/popovers | N/A | No custom windows, sheets or popovers; native select/file controls; C[258], C[318] |

Pass B confirmed actual Chrome Page zoom at 200%: outer width remained 1440, layout width changed 1440→720, DPR changed 1→2, and CSS zoom stayed 1. All 64 final zoom application frames are 1440 physical pixels wide. The Pointer receipt records all 12 real active states and distinct feedback; reduced-motion presses retain `transform: none`.

This is approval of the supplied Chrome packet and matching source. It does not renew numerical R3 or establish native Safari, physical-device, screen-reader, fresh offline-installation, or deployment readiness.

## Prior red evidence

Round 1 reproduced offline guide session loss, missing remote-view progress/cancellation, inaccessible autoplay pause, remote/raw replay errors, mobile focus-order mismatch, undersized reading/targets, weak boundaries, and a corrupted full-page mobile source image. Round 2 accepted those repairs and found remaining small dial explanations, faded disabled controls, missing pointer feedback, and unproved native zoom.

The final packet follows the last application edit. It uses bounded mobile segments and unclipped full-width native zoom frames; earlier corrupted/cropped artifacts remain retained and excluded. The [validation receipt](VALIDATION.md) locates red reproductions, mutation controls, native zoom setup, numerical approval, and the passing execution/performance results.
