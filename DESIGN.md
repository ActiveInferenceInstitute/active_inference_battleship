# Battleship design system

## 0. Research log

- Embedded references: Linear, Vercel, Carbon considered; selected operational taste plus Linear's restrained tonal hierarchy. This is a custom naval aesthetic, not the Linear brand.
- Spatial reference: [StyleGallery supporting pane](https://github.com/changeroa/StyleGallery/blob/main/patterns/split-sidebar/supporting-pane.md). Main task precedes controls in source order; document owns scrolling; columns reflow into a stack.
- Image generation: full primary-screen concept commissioned before implementation; extend its naval console palette to diagnostics and guide.
- Functional additions to the concept: reproducible seed, pre-game fleet shuffle, catalog-size setting, observation-only agent boundary, accessible tables, import provenance, export/replay, and honest finite-catalog labels are necessary for this brief.

## 1. Atmosphere and identity

A quiet naval research console. The signature is the sea-green belief field against ink-blue water, with coral hits and a precise coordinate system. The board is the central working surface. Diagnostics explain each action without requiring a second tool.

## 2. Color

| Role | Token | Dark | Light |
| --- | --- | --- | --- |
| Canvas | --bg | #0b1520 | #f2f6f7 |
| Panel | --panel | #101e2b | #ffffff |
| Raised/water | --raised | #172938 | #e7eff1 |
| Rule | --line | #2b4050 | #c2d0d4 |
| Interactive boundary | --control-edge | #7c95a6 | #607b89 |
| Primary text | --text | #ecf3f5 | #142b39 |
| Secondary | --muted | #a3b6c3 | #45606e |
| Accent | --accent | #75d9b1 | #12694e |
| Accent ink | --accent-ink | #09281c | #ffffff |
| Hit | --hit | #ff9c88 | #aa3929 |
| Information | --info | #9ec9ff | #285e9a |
| Warning | --warning | #eac78a | #795516 |

Belief probabilities interpolate between water and accent using color-mix. Color always has a text/symbol equivalent. Accent is for primary actions, plotted information, and game state. No decorative edge stripes.

The theme selector offers system, light, and dark. System is the default and follows changes in the operating-system preference from startup, including loading and failure states.

## 3. Typography

System sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif. Mono: ui-monospace, SFMono-Regular, Menlo, monospace. Sizes: 11px coordinate/overline; 14px table/metadata; 15px secondary/control; 17px body and guide prose; 20px panel title; 24px statistic; 32px heading; 40px wide heading. Weights 400/500/600/700. Body line-height 1.6, heading 1.15, mono 1.4. Reading paragraphs and definitions have a 70ch maximum measure. Small coordinate text is supplemented by full cell accessible names.

## 4. Spacing and layout

Base unit 4px. Tokens --s1 through --s8 are 4,8,12,16,20,24,28,32px; --s10 is 40px; --s12 is 48px. The dense spatial board has explicit 3px exceptions: --board-gap and --radius-cell, shared by Play and Decision explorer. Maximum width 1600px, outer inset clamp(16px,3vw,48px). Desktop: main boards plus 300px supporting pane. At 1100px controls move below main; below 680px boards stack. Every grid child has min-inline-size:0. No fixed viewport height. Tables own horizontal overflow when needed; document owns vertical scroll.

## 5. Components

- Button: native button, primary/secondary/ghost variants; 44px minimum primary control height, 8px radius. Hover tonal fill, pressed translation, visible focus ring, opaque disabled treatment. Text and Phosphor icons; no icon-only critical actions.
- Disabled controls use opaque raised surfaces, readable secondary text, and the strong control boundary; disabled state never relies on faded opacity. Text actions, candidates, and navigation share hover and distinct pressed feedback. Reduced motion preserves the tonal feedback while removing positional presses. Metric explanations and all dial labels use the 15px secondary scale.
- Board: coordinate rail plus a 10x10 button grid; square cells; labels include coordinate, shot outcome, and probability. Unknown/hit/miss/sunk/revealed/selected variants. Arrow keys traverse and Enter/Space selects. Mobile two-tap selection/fire separates targeting from firing. Own board is informational and ships are visible.
- Panel: semantic section, heading and metadata cluster; 24px padding, 12px radius, neutral hairline; no shadows. Empty/error states contain explanatory text.
- RangeControl: label + native slider + numeric output + help; value remains visible; 44px target container, keyboard adjustable. Controls preserve focus across state updates.
- Meter: native meter plus large numeric value and unit. Never communicates a value using an arc alone.
- Chart: shared responsive SVG geometry with HTML axis labels at an effective 15px and an adjacent data table. Labels remain outside the scaled SVG so phone layouts cannot shrink or clip their glyphs. Tick positions use the corresponding data-point coordinate and SVG padding, including single, odd and even histories. A shared 16px trailing gutter keeps multi-digit endpoint labels inside the figure while the SVG and HTML axes use the same plot width. A point marks a single observation. Lines are measured history, not decoration. No invented pre-game trajectory.
- Tabs: native buttons with aria-pressed, a selected check marker, persistent focus, connected to the plain visible view heading. Play/Diagnostics/Model & guide. Theme precedes navigation in both DOM and visual order.
- Log/ActionTable: semantic table, explicit units, scroll wrapper, empty state, bounded rows in the main panel; full data in export.
- Decision explorer: fourth workspace destination. Reuses the supporting-pane layout: diagnostic map and decision receipt precede the 300px sandbox controls; document owns vertical scroll. Both columns stack below 1100px. No hidden fleet is rendered or passed to analysis.
- Diagnostic map: shared square cell geometry, coordinate rails, explicit low/high legend and numeric accessible names. Layers show occupancy, hit forecast, information gain, preference cost, generalized G or policy probability; color intensity is normalized over available cells for cost/G, and captions expose the actual bounds. Selected and leading actions use distinct symbols and text. A leading marker has opaque panel backing and primary text, retaining contrast at every heatmap intensity. Visited cells remain labeled but unavailable. An explicit coordinate select provides a compact alternative to the board.
- Decision receipt: numbered prediction → preference/information → policy steps, using existing typography, neutral separators and semantic color tokens. Every equation includes substituted numbers, units, and its GNN symbol. Hypothetical hit/miss outcomes are labeled counterfactual and distinguish zero-probability outcomes from numerical errors.
- Sandbox: reusable native range controls with unique label/help IDs, named illustrative presets, copy-from-live and explicit apply-to-both-agents actions. No shot is fired by exploration. Opening the lab initializes its temporary settings from live controls; changes are discarded on leaving. Local status messages announce apply/export outcomes. Native anchor links connect the map and controls so the stacked phone layout is quick to traverse.
- Sensitivity plot: native SVG with labeled axes and a full semantic data table. Sweeps vary only β or γ; observation history and other settings stay fixed. Highlighting marks the selected cell's probability rather than implying a multi-step plan. The table includes the leading cell, rank, and probability.
- GNN factor inspector: native details plus a semantic table linking A/B/C/D/E/G/q_pi to declared equations, evaluated values and implementation. Export is a labeled analysis JSON snapshot, distinct from resumable game replay.

## 6. Motion and interaction

120ms ease-out opacity/transform feedback on buttons and selected cells. No decorative ambient animation. Autoplay uses a user-adjustable shot interval, exposes Pause on Play, and pauses when leaving that view. Reduced motion disables positional presses. A new game stops autoplay. Each player action is atomic: one human shot then one opponent shot unless terminal. Session operations expose progress, cancellation, and concise errors beside the replay controls on every view. Controls announce their own native values; shot status uses polite live text.

## 7. Depth and surface

On narrow screens the action group is fixed to the safe-area bottom, with document padding reserving its space; firing and pause stay reachable while the board scrolls. Table rows become labeled three-column records with intact words and values; the table header remains accessible. Ordinary sliders, checkbox labels, candidate actions, and text actions have at least 44px hit areas. Catalog creation and replay reconstruction run in an owned cancellable Web Worker with startup/error feedback.

Borders-only: neutral 1px rules plus tonal panel fills; no shadows, glass, or accent stripes. Radius 3px cells via --radius-cell, 8px controls, 12px panels, 999px small status lozenges.

## 8. Accessibility, constraints, and debt

Personas: keyboard-only player; researcher inspecting definitions and exporting runs; mobile player; motion-sensitive user. Preserve keyboard focus on fire, visible focus in both themes, textual shot symbols, and probability labels. Dense desktop charts reflow and offer tabular values. All model limits are visible in the guide. No accepted accessibility debt at inception. Real browser QA must check both themes and widths, navigation, controls, terminal games, replay, and reduced motion. Independent review follows measured evidence.

## Institute identity and interpretation additions

Current organization branding is **Active Inference Institute**. **Decision explorer** names the exploratory workspace; internal `lab` keys remain compatibility details. American English applies to current authored labels and prose, with published titles and stable model/replay identifiers preserved.

The GNN pipeline uses the existing panel, raised surface, typography, radius, and spacing tokens. Five numbered stages reflow from five columns to two to one. Stage descriptions use 15px text; source/model download buttons retain ordinary 44px targets.

The public-score trade-off plot uses the existing accent and text tokens. Dot positions encode predicted hit probability (0–100%) and expected information (0–log 2 nats). Ring/square marks and written captions distinguish the leader and selection. No scaled SVG text is used: HTML labels stay 15px, align to the shared plot coordinates, and have `--s6` gutters for complete endpoint containment. The numerical receipt, coordinate selector, and policy table remain available. Overlap and the binary-model relationship are stated explicitly.
