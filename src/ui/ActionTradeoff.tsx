import { coordinate } from "../core/fleet";
import type { ActionScore } from "../core/inference";

/** A read-only view of public action scores; target selection stays in named DOM controls. */
export function ActionTradeoff({
  actions,
  selected,
  size,
}: {
  readonly actions: readonly ActionScore[];
  readonly selected: ActionScore;
  readonly size: number;
}) {
  const leader = actions[0];
  const x = (action: ActionScore) => `${action.predictedHit * 100}%`;
  const y = (action: ActionScore) => `${(1 - action.informationGain / Math.LN2) * 100}%`;
  return (
    <section className="panel action-tradeoff" aria-labelledby="tradeoff-title">
      <div className="panel-heading">
        <h2 id="tradeoff-title">Hit probability and information</h2>
        <span className="small muted">{actions.length} legal actions</span>
      </div>
      <p className="small muted reading-measure">
        Each dot is an unvisited cell under the sandbox settings. Farther right predicts more hits;
        higher predicts more information. Under this binary sensor model, information is a function
        of predicted hit probability and assumed noise. Dots can overlap exactly. This is a decision
        map, not a measured performance comparison.
      </p>
      <figure aria-label="Action trade-off plot">
        <div className="tradeoff-y-title">Expected information gain (nats)</div>
        <div className="tradeoff-chart">
          <div className="tradeoff-y-ticks" aria-hidden="true">
            <span>{Math.LN2.toFixed(3)}</span>
            <span>0</span>
          </div>
          <div className="tradeoff-plot">
            <svg
              role="img"
              aria-label="Predicted hit probability versus expected information gain for legal cells"
              width="100%"
              height="240"
            >
              <title>
                Selected {coordinate(selected.cell, size)}: hit probability{" "}
                {(selected.predictedHit * 100).toFixed(1)} percent, expected information{" "}
                {selected.informationGain.toFixed(3)} nats. Leading cell{" "}
                {leader ? coordinate(leader.cell, size) : "none"}.
              </title>
              {[0, 0.5, 1].map((value) => (
                <line
                  key={`x${value}`}
                  x1={`${value * 100}%`}
                  x2={`${value * 100}%`}
                  y1="0"
                  y2="100%"
                  className="tradeoff-grid"
                />
              ))}
              <line
                className="tradeoff-crosshair"
                x1={x(selected)}
                x2={x(selected)}
                y1={y(selected)}
                y2="100%"
              />
              <line
                className="tradeoff-crosshair"
                x1="0"
                x2={x(selected)}
                y1={y(selected)}
                y2={y(selected)}
              />
              {[0, 0.5, 1].map((value) => (
                <line
                  key={`y${value}`}
                  y1={`${value * 100}%`}
                  y2={`${value * 100}%`}
                  x1="0"
                  x2="100%"
                  className="tradeoff-grid"
                />
              ))}
              {actions.map((action) => (
                <circle
                  key={action.cell}
                  data-cell={action.cell}
                  cx={x(action)}
                  cy={y(action)}
                  r="4"
                  className="tradeoff-dot"
                >
                  <title>
                    {coordinate(action.cell, size)}: {(action.predictedHit * 100).toFixed(1)}% hit,{" "}
                    {action.informationGain.toFixed(3)} nats
                  </title>
                </circle>
              ))}
              {leader && <circle cx={x(leader)} cy={y(leader)} r="9" className="tradeoff-leader" />}
              <rect
                x={x(selected)}
                y={y(selected)}
                transform="translate(-6 -6)"
                width="12"
                height="12"
                className="tradeoff-selected"
              />
            </svg>
            <div className="tradeoff-x-ticks" aria-hidden="true">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
        <figcaption>
          <span className="tradeoff-key">
            <i className="tradeoff-ring" aria-hidden="true" /> Leading{" "}
            {leader ? coordinate(leader.cell, size) : "—"}
          </span>
          <span className="tradeoff-key">
            <i className="tradeoff-square" aria-hidden="true" /> Selected{" "}
            {coordinate(selected.cell, size)}
          </span>
          <span>Predicted hit probability →</span>
        </figcaption>
      </figure>
      <dl className="tradeoff-readout" aria-label="Selected action plot values">
        <div>
          <dt>Selected coordinate</dt>
          <dd>{coordinate(selected.cell, size)}</dd>
        </div>
        <div>
          <dt>Predicted hit</dt>
          <dd>{(selected.predictedHit * 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt>Expected information</dt>
          <dd>{selected.informationGain.toFixed(4)} nats</dd>
        </div>
        <div>
          <dt>Choice probability</dt>
          <dd>{(selected.probability * 100).toFixed(1)}%</dd>
        </div>
      </dl>
      <p className="small muted reading-measure">
        Inspect any legal coordinate with the map selector to read its values in the decision
        receipt. The policy table initially lists up to eight leading actions; expand it to see
        every legal action, or use Export analysis JSON. These controls never fire a shot.
      </p>
    </section>
  );
}
