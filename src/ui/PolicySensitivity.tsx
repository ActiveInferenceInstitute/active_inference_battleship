import type { PolicySweepPoint, SweepParameter } from "../core/analysis";
import { coordinate } from "../core/fleet";
import { LineChart } from "./LineChart";

export function PolicySensitivity({
  points,
  parameter,
  onParameter,
  cell,
  size,
}: {
  readonly points: readonly PolicySweepPoint[];
  readonly parameter: SweepParameter;
  readonly onParameter: (parameter: SweepParameter) => void;
  readonly cell: number;
  readonly size: number;
}) {
  return (
    <section className="panel sensitivity-panel" aria-labelledby="sensitivity-title">
      <div className="panel-heading">
        <h2 id="sensitivity-title">Policy sensitivity</h2>
        <label>
          Vary parameter
          <select
            aria-label="Sweep parameter"
            value={parameter}
            onChange={(event) =>
              onParameter(
                event.currentTarget.value === "policyPrecision"
                  ? "policyPrecision"
                  : "epistemicWeight",
              )
            }
          >
            <option value="epistemicWeight">Epistemic weight β</option>
            <option value="policyPrecision">Policy precision γ</option>
          </select>
        </label>
      </div>
      <p className="small muted">
        How often would the policy choose {coordinate(cell, size)}? Only the selected parameter
        varies; the posterior, available cells, and other sandbox controls stay fixed. These are
        nine one-step policies.
      </p>
      <LineChart
        className="sensitivity-chart"
        title={`Choice probability for ${coordinate(cell, size)}`}
        values={points.map((point) => point.probability)}
        labels={points.map((point) => String(point.value))}
        xTitle={parameter === "epistemicWeight" ? "Epistemic weight β" : "Policy precision γ"}
        unit="probability"
        color="var(--accent)"
        format="percent"
        showData={false}
        ariaLabel={`Policy sensitivity for ${coordinate(cell, size)} across nine ${parameter === "epistemicWeight" ? "epistemic weight" : "policy precision"} values; full values in the table below`}
      />
      <details className="lab-disclosure">
        <summary>Sweep values and ranking</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">One-parameter policy sensitivity</caption>
            <thead>
              <tr>
                <th>Value</th>
                <th>Leading cell</th>
                <th>Selected rank</th>
                <th>q(selected)</th>
                <th>G selected</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.value}>
                  <td data-label="Value">{point.value}</td>
                  <td data-label="Leading cell">{coordinate(point.leadingCell, size)}</td>
                  <td data-label="Selected rank">{point.rank}</td>
                  <td data-label="q(selected)">{(point.probability * 100).toFixed(3)}%</td>
                  <td data-label="G selected">{point.expectedFreeEnergy.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
