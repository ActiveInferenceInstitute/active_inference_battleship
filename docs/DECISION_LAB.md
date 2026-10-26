# Decision explorer

The explorer connects the imported GNN specification to a concrete decision. It supports either actor, uses only that actor's public binary observations, and cannot fire a shot. Inference remains exact within the finite sampled fleet catalog; planning remains one shot.

## Follow one decision

1. Open **Decision explorer** from navigation or **Explain and compare** beside Play's candidate table. Leaving Play pauses autoplay.
2. Choose **Inspect agent**. The player assistant and opponent each condition on their own shots. Opponent coordinates cannot select a target on the player's game board.
3. Select a map cell, choose a coordinate, or select a row in **Sandbox policy ranking**. Previously observed cells are unavailable. The selected cell is marked `+`; the policy leader is marked `⌖` when distinct. Ties use ascending cell order.
4. Read **Why this action?**: occupancy becomes an observation forecast through A; preference cost and information combine into G; E and precision normalize the policy. The log-odds comparison explains the selected action relative to the current leader.
5. Inspect both hypothetical outcomes. Each possible branch gives probability, log probability, posterior entropy, ESS and realized KL. Impossible outcomes show probability zero with no invented posterior. A branch may increase entropy; the probability-weighted reduction matches expected information gain.
6. Use **Policy sensitivity** to vary β or γ. The plot shows the selected cell's choice probability. **Sweep values and ranking** gives all nine points, ranks, G values and leading cells. These are separate policies at the same posterior, not a multi-shot rollout.

## Map meanings

| Layer | Value | Intensity |
| --- | --- | --- |
| Ship probability | Posterior occupancy P(ship at cell) | Fixed 0–1, brighter is higher |
| Hit forecast | ε + (1−2ε) P(ship) | Fixed 0–1, brighter is higher |
| Expected information | Mutual information between one observation and the fleet label | Fixed 0–log 2 nats, brighter is higher |
| Preference cost | Expected negative normalized log preference | Relative to available cells; brighter is lower |
| Generalized G | Cost − β × information | Relative to available cells; brighter is lower |
| Choice probability | Normalized posterior over available actions | Relative to available cells; brighter is higher |

The caption gives actual numeric bounds. Equal-valued relative maps use a uniform midpoint intensity. Map colors indicate the active layer, not additional observations; cell accessible names contain the exact layer value. The coordinate selector provides an alternative to traversing the dense board. On a stacked phone layout, **Jump to what-if controls** and **Return to decision map** connect the two working areas.

## Hit probability and information

The fixed-axis action plot shows predicted hit probability from 0–100% and expected information from 0–log 2 nats. A ring marks the leader; a square marks the selection, with written labels for both. Identical scores overlap. In this binary symmetric sensor model, information is determined by forecast and noise, so this plot is an interpretation of the same action scores, not independent performance evidence. The coordinate selector and ranking table provide keyboard and numeric alternatives. Viewing or selecting never fires a shot.

## Compare assumptions safely

The five what-if sliders reuse the same bounds and definitions as live controls. Changing sensor noise reconstructs all prior observations under the new likelihood; other controls change action valuation or selection probabilities. **Live leading cell** and **Sandbox leading cell** compare policies. Sampling can select a non-leading cell; the leader is not a promised next shot.

Four presets illustrate distinct motives:

| Preset | β | Hit preference | γ | Center habit |
| --- | --- | --- | --- | --- |
| Information first | 4 | 0 | 8 | 0 |
| Immediate hits | 0 | 8 | 16 | 0 |
| Habit only | 1 | 2.5 | 0 | 4 |
| Uniform choices | 1 | 2.5 | 0 | 0 |

Each preset preserves assumed sensor noise. These are illustrative settings, not measured claims of better Battleship play. **Copy live settings** resets the experiment. **Apply settings to both agents** sends the usual validated controls event and fires no shot. Both actors share live settings. Navigating away discards unapplied temporary controls; opening the explorer again copies the current live settings. Importing/creating a new game while the explorer is open changes the inspected public history and catalog; temporary controls remain until copied, applied, or discarded.

**Select on game board** returns a player coordinate to Play without firing; it is unavailable before launch, after terminal, or during session work. Terminal-game remaining-cell scores are explicitly hypothetical.

## Inspect and export

**From GNN to this decision** expands A/B/C/D/E/G/q_pi definitions and evaluated values. Its equation block is read from the same specification file imported at build time. Preferences are normalized log probabilities in miss/hit order; no dense likelihood or transition tensor is materialized. Runtime catalog size and specification default are identified separately. Board/fleet edits still require an intentional supported GNN change and recompilation.

**Export analysis JSON** saves format `battleship-analysis`, version 1, with the model SHA-256, seed, catalog size, actor, public history, live and sandbox controls, posterior weights/occupancy, all available action scores, selected cell, both hypothetical branches, and the selected sweep. It is an analysis record, not an importable replay. The seed can reconstruct hidden fleets; this is a local experiment tool, not secure multiplayer. Use **Export replay** and **Import replay** to resume actual gameplay.

The analysis API is independent of React and the DOM; see [API](API.md). Equations and floating-point boundaries are in [MODEL](MODEL.md). Reproduction steps are in [VERIFICATION](VERIFICATION.md).
