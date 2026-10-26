import { useState } from "react";
import { coordinate } from "../core/fleet";
import type { Shot } from "../core/game";
import type { ActionScore, Belief } from "../core/inference";
import { entropy } from "../core/math";
import { LineChart } from "./LineChart";

export function Metric({
  label,
  value,
  unit,
  detail,
}: {
  readonly label: string;
  readonly value: string;
  readonly unit: string;
  readonly detail: string;
}) {
  return (
    <div className="metric">
      <span className="small muted">{label}</span>
      <div>
        <strong className="mono">{value}</strong>
        <span className="unit">{unit}</span>
      </div>
      <small className="muted">{detail}</small>
    </div>
  );
}

export function HistoryChart({
  title,
  values,
  color,
  unit,
}: {
  readonly title: string;
  readonly values: readonly number[];
  readonly color: string;
  readonly unit: string;
}) {
  return (
    <LineChart
      title={title}
      values={values}
      labels={values.map((_, index) => String(index + 1))}
      xTitle="Shot index"
      unit={unit}
      color={color}
      ariaLabel={`${title}: ${values.length} observations; latest ${values.at(-1)?.toFixed(3)} ${unit}`}
    />
  );
}

export function ActionTable({
  actions,
  size,
  onSelect,
}: {
  readonly actions: readonly ActionScore[];
  readonly size: number;
  readonly onSelect: ((cell: number) => void) | null;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="table-scroll" aria-label="Action candidate table">
      <table>
        <caption className="action-table-caption">
          {expanded ? "All legal actions" : "Leading action candidates"} at current settings
          {actions.length > 8 && (
            <button
              className="text-button"
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Show leading eight" : `Show all ${actions.length} actions`}
            </button>
          )}
        </caption>
        <thead>
          <tr>
            <th>Cell</th>
            <th>P(ship)</th>
            <th>IG nats</th>
            <th>Risk</th>
            <th>G</th>
            <th>q(action)</th>
          </tr>
        </thead>
        <tbody>
          {(expanded ? actions : actions.slice(0, 8)).map((a) => (
            <tr key={a.cell}>
              <td data-label="Cell">
                {onSelect ? (
                  <button className="table-action" type="button" onClick={() => onSelect(a.cell)}>
                    {coordinate(a.cell, size)}
                  </button>
                ) : (
                  <span className="mono">{coordinate(a.cell, size)}</span>
                )}
              </td>
              <td data-label="P(ship)">{(100 * a.occupancy).toFixed(1)}%</td>
              <td data-label="IG nats">{a.informationGain.toFixed(3)}</td>
              <td data-label="Risk">{a.risk.toFixed(3)}</td>
              <td data-label="G">{a.expectedFreeEnergy.toFixed(3)}</td>
              <td data-label="q(action)">{(100 * a.probability).toFixed(1)}%</td>
            </tr>
          ))}
          {actions.length === 0 && (
            <tr>
              <td colSpan={6}>No unvisited cells remain.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export function ShotLog({
  shots,
  belief,
  size,
  compact = false,
}: {
  readonly shots: readonly Shot[];
  readonly belief: Belief;
  readonly size: number;
  readonly compact?: boolean;
}) {
  const indexed = shots.map((shot, index) => ({ shot, index })).reverse();
  return (
    <section className="table-scroll" aria-label="Shot ledger table">
      <table>
        <caption className="sr-only">
          Selected agent shots; diagnostics recomputed under current settings
        </caption>
        <thead>
          <tr>
            <th>Shot</th>
            <th>Cell</th>
            <th>Outcome</th>
            <th>Surprise</th>
            <th>KL update</th>
            <th>F</th>
            <th>Brier</th>
          </tr>
        </thead>
        <tbody>
          {(compact ? indexed.slice(0, 5) : indexed).map(({ shot, index }) => {
            const d = belief.history[index];
            return (
              <tr key={shot.cell}>
                <td data-label="Shot">{index + 1}</td>
                <td data-label="Cell" className="mono">
                  {coordinate(shot.cell, size)}
                </td>
                <td data-label="Outcome" className={shot.hit ? "hit-text" : "muted"}>
                  {shot.sunk !== null ? "Sunk" : shot.hit ? "Hit" : "Miss"}
                </td>
                <td data-label="Surprise">{d?.surprise.toFixed(3)}</td>
                <td data-label="KL update">{d?.informationGain.toFixed(3)}</td>
                <td data-label="F">{d?.freeEnergy.toFixed(3)}</td>
                <td data-label="Brier">{d?.brier.toFixed(3)}</td>
              </tr>
            );
          })}
          {shots.length === 0 && (
            <tr>
              <td colSpan={7} className="empty-row">
                No observations yet. Launch, select a coordinate, and fire.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}

export function Diagnostics({
  belief,
  actions,
  shots,
  size,
  onSelect,
  actor,
  onActorChange,
}: {
  readonly belief: Belief;
  readonly actions: readonly ActionScore[];
  readonly shots: readonly Shot[];
  readonly size: number;
  readonly actor: "player" | "opponent";
  readonly onActorChange: (actor: "player" | "opponent") => void;
  readonly onSelect: ((cell: number) => void) | null;
}) {
  const top = actions[0];
  const last = belief.history.at(-1);
  const meanBrier =
    belief.history.reduce((sum, d) => sum + d.brier, 0) / Math.max(1, belief.history.length);
  return (
    <div className="diagnostics-view">
      <div className="view-heading">
        <div>
          <span className="overline">Inside the agent</span>
          <h1>Agent diagnostics</h1>
          <p className="view-summary">Every action has a reason.</p>
        </div>
        <label className="inspect-agent">
          Inspect agent
          <select
            aria-label="Inspect agent"
            value={actor}
            onChange={(event) =>
              onActorChange(event.currentTarget.value === "opponent" ? "opponent" : "player")
            }
          >
            <option value="player">Player assistant</option>
            <option value="opponent">Opponent agent</option>
          </select>
        </label>
      </div>
      <p className="muted">
        {actor === "player" ? "Player assistant" : "Opponent agent"} diagnostics. All histories
        below are recomputed at the current settings; the replay records settings changes in order.
      </p>
      <div className="metrics-grid panel">
        <Metric
          label="Posterior entropy"
          value={belief.entropy.toFixed(3)}
          unit="nats"
          detail="H[q(fleet)]"
        />
        <Metric
          label="Effective hypotheses"
          value={belief.effectiveStates.toFixed(1)}
          unit="ESS"
          detail={`${belief.support} nonzero state labels`}
        />
        <Metric
          label="Policy entropy"
          value={entropy(actions.map((a) => a.probability)).toFixed(3)}
          unit="nats"
          detail="H[q(action)]"
        />
        <Metric
          label="Cumulative surprise"
          value={(-belief.logEvidence).toFixed(3)}
          unit="nats"
          detail="−log P(observation history)"
        />
        <Metric
          label="Mean Brier score"
          value={shots.length ? meanBrier.toFixed(3) : "—"}
          unit="[0,1]"
          detail="Pre-update hit forecast error; lower is better"
        />
        <Metric
          label="VFE identity residual"
          value={last ? Math.abs(last.freeEnergy - last.surprise).toExponential(1) : "—"}
          unit="nats"
          detail="|KL − accuracy − surprise|"
        />
      </div>
      <div className="chart-grid panel">
        <HistoryChart
          title="Fleet belief entropy"
          values={belief.history.map((d) => d.entropy)}
          unit="nats"
          color="var(--accent)"
        />
        <HistoryChart
          title="Observation surprise"
          values={belief.history.map((d) => d.surprise)}
          unit="nats"
          color="var(--info)"
        />
        <HistoryChart
          title="Realized Bayesian information gain"
          values={belief.history.map((d) => d.informationGain)}
          unit="nats"
          color="var(--warning)"
        />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h2>Expected free energy decomposition</h2>
          <span className="mono muted">{top ? coordinate(top.cell, size) : "—"}</span>
        </div>
        {top && (
          <div className="decomposition">
            <p>
              <span>Cross-entropy cost</span>
              <strong>{top.risk.toFixed(4)}</strong>
            </p>
            <p>
              <span>Expected information gain</span>
              <strong>{top.informationGain.toFixed(4)}</strong>
            </p>
            <p>
              <span>Observation ambiguity</span>
              <strong>{top.ambiguity.toFixed(4)}</strong>
            </p>
            <p>
              <span>Outcome KL risk</span>
              <strong>{top.outcomeRisk.toFixed(4)}</strong>
            </p>
            <p>
              <span>Expected log-preference reward</span>
              <strong>{top.expectedUtility.toFixed(4)}</strong>
            </p>
            <p>
              <span>Habit prior</span>
              <strong>{top.habit.toFixed(5)}</strong>
            </p>
            <p>
              <span>Generalized G = cost − β · IG</span>
              <strong className="accent-text">{top.expectedFreeEnergy.toFixed(4)}</strong>
            </p>
          </div>
        )}
        <p className="small muted">
          At β = 1, G also equals outcome KL risk + ambiguity. At other weights this is a
          generalized EFE objective. Planning horizon is one shot.
        </p>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Policy posterior</h2>
          <span className="small muted">Unvisited cells only</span>
        </div>
        <ActionTable actions={actions} size={size} onSelect={onSelect} />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <h2>Observation ledger</h2>
          <span className="small muted">Current-settings reconstruction</span>
        </div>
        <ShotLog shots={shots} belief={belief} size={size} />
      </section>
    </div>
  );
}
