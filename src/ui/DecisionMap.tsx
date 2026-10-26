import { useState } from "react";
import { coordinate } from "../core/fleet";
import type { Shot } from "../core/game";
import type { ActionScore } from "../core/inference";
import { Board } from "./Board";

const layers = [
  { key: "occupancy", label: "Ship probability", unit: "probability", scale: 1, lower: false },
  { key: "predictedHit", label: "Hit forecast", unit: "probability", scale: 1, lower: false },
  {
    key: "informationGain",
    label: "Expected information",
    unit: "nats",
    scale: Math.log(2),
    lower: false,
  },
  { key: "risk", label: "Preference cost", unit: "nats", scale: 0, lower: true },
  { key: "expectedFreeEnergy", label: "Generalized G", unit: "nats", scale: 0, lower: true },
  { key: "probability", label: "Choice probability", unit: "probability", scale: 0, lower: false },
] as const;

export function DecisionMap({
  actions,
  shots,
  size,
  selectedCell,
  onSelect,
  onUseTarget,
  canUseTarget,
}: {
  readonly actions: readonly ActionScore[];
  readonly shots: readonly Shot[];
  readonly size: number;
  readonly selectedCell: number | undefined;
  readonly onSelect: (cell: number) => void;
  readonly onUseTarget: (() => void) | null;
  readonly canUseTarget: boolean;
}) {
  const [layer, setLayer] = useState<(typeof layers)[number]>(layers[0]);
  const values = actions.map((candidate) => candidate[layer.key]);
  const low = layer.scale || !values.length ? 0 : Math.min(...values);
  const high = layer.scale || (values.length ? Math.max(...values) : 0);
  const map = new Map(actions.map((candidate) => [candidate.cell, candidate]));
  const intensities = Array.from({ length: size ** 2 }, (_, cell) => {
    const candidate = map.get(cell);
    if (!candidate) return 0;
    const fraction = high === low ? 0.5 : (candidate[layer.key] - low) / (high - low);
    return layer.lower ? 1 - fraction : fraction;
  });
  const cellDetails = Array.from({ length: size ** 2 }, (_, cell) => {
    const candidate = map.get(cell);
    return candidate
      ? `, ${layer.label} ${candidate[layer.key].toFixed(5)} ${layer.unit}`
      : ", already observed";
  });
  return (
    <section className="panel lab-map-panel" aria-labelledby="map-title">
      <div className="panel-heading">
        <h2 id="map-title">A map of the decision</h2>
        <label>
          Map layer
          <select
            aria-label="Map layer"
            value={layer.key}
            onChange={(event) => {
              const next = layers.find((candidate) => candidate.key === event.currentTarget.value);
              if (next) setLayer(next);
            }}
          >
            {layers.map((candidate) => (
              <option key={candidate.key} value={candidate.key}>
                {candidate.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="lab-map-layout">
        <Board
          title="Analysis target"
          size={size}
          shots={shots}
          probabilities={intensities}
          cellDetails={cellDetails}
          fleet={null}
          selected={selectedCell ?? null}
          recommended={actions[0]?.cell ?? null}
          heatmap
          interactive
          onSelect={onSelect}
        />
        <div className="lab-map-description">
          <span className="overline">{layer.label}</span>
          <div className="map-scale" aria-hidden="true">
            <span>Low intensity</span>
            <span>High intensity</span>
          </div>
          <p className="small muted">
            {layer.lower
              ? "Stronger green indicates lower cost."
              : "Stronger green indicates higher values."}
            {layer.scale ? " Fixed scale: " : " Relative scale over unvisited cells: "}
            {low.toFixed(4)}–{high.toFixed(4)} {layer.unit}.
          </p>
          <label>
            Inspect coordinate
            <select
              aria-label="Inspect coordinate"
              value={selectedCell ?? ""}
              disabled={selectedCell === undefined}
              onChange={(event) => onSelect(Number(event.currentTarget.value))}
            >
              {[...actions]
                .sort((a, b) => a.cell - b.cell)
                .map((candidate) => (
                  <option key={candidate.cell} value={candidate.cell}>
                    {coordinate(candidate.cell, size)}
                  </option>
                ))}
            </select>
          </label>
          <p className="small muted">
            + selected · ⌖ leading policy action · × hit · · miss. Select a cell to explain it; the
            receipt below gives exact values.
          </p>
          <a className="button ghost" href="#sandbox-title">
            Jump to what-if controls
          </a>
          {onUseTarget && (
            <button className="button" type="button" disabled={!canUseTarget} onClick={onUseTarget}>
              Select on game board
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
