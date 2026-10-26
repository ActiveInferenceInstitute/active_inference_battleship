import specification from "../../models/battleship.gnn.md?raw";
import type { ActionScore, Controls } from "../core/inference";
import type { CompiledModel } from "../model/schema";

export function FactorInspector({
  model,
  controls,
  action,
  count,
}: {
  readonly model: CompiledModel;
  readonly controls: Controls;
  readonly action: ActionScore | undefined;
  readonly count: number;
}) {
  const rows = [
    [
      "A",
      "Observation likelihood",
      `ε = ${controls.sensorNoise.toPrecision(3)}`,
      "Procedural hit/miss likelihood for each fleet and cell; the actual game is deterministic.",
    ],
    [
      "B",
      "State transition",
      "Identity",
      "The hidden fleet stays fixed. No moving ships or transition learning.",
    ],
    [
      "C",
      "Normalized log preferences",
      `[${(-Math.log1p(Math.exp(controls.hitPreference))).toFixed(4)}, ${(-Math.log1p(Math.exp(-controls.hitPreference))).toFixed(4)}]`,
      "Miss, hit order; these are log probabilities, not raw rewards.",
    ],
    [
      "D",
      "Initial state prior",
      `1 / ${count}`,
      "Uniform over sampled catalog labels. Repeated layouts retain separate mass.",
    ],
    [
      "E",
      "Habit over available actions",
      `strength = ${controls.habitStrength.toFixed(2)}`,
      "Spatial center bias, renormalized after removing visited cells.",
    ],
    [
      "G",
      "One-shot objective",
      action ? `${action.expectedFreeEnergy.toFixed(4)} nats` : "No available action",
      "Preference cross-entropy minus β-weighted expected information; standard decomposition only at β = 1.",
    ],
    [
      "q_pi",
      "Posterior over actions",
      action ? `${(100 * action.probability).toFixed(3)}% selected` : "No available action",
      "softmax(log E − γG), rather than a multi-step policy tree.",
    ],
  ];
  return (
    <section className="panel factor-inspector">
      <div className="panel-heading">
        <h2>From GNN to this decision</h2>
        <span className="tag mono">{model.contract}</span>
      </div>
      <p className="small muted">
        This inspector evaluates the supported GNN contract with sandbox settings. Board and fleet
        dimensions are compiled model settings; sliders alter inference and policy only. The live
        catalog has {count.toLocaleString()} state labels; the specification default is{" "}
        {model.parameters.catalogue_size.toLocaleString()}.
      </p>
      <details className="lab-disclosure">
        <summary>Inspect A / B / C / D / E / G / q_pi</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">GNN factors evaluated at sandbox settings</caption>
            <thead>
              <tr>
                <th>Factor</th>
                <th>Meaning</th>
                <th>Current value</th>
                <th>Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([factor, meaning, value, explanation]) => (
                <tr key={factor}>
                  <td data-label="Factor" className="mono">
                    {factor}
                  </td>
                  <td data-label="Meaning">{meaning}</td>
                  <td data-label="Current value" className="mono">
                    {value}
                  </td>
                  <td data-label="Interpretation">{explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">Exact equations from the imported specification:</p>
        <pre className="source-code">
          {specification.split("## Equations")[1]?.split("## Time")[0]?.trim()}
        </pre>
        <p className="small muted">
          Specification SHA-256 <code>{model.source.specificationSha256}</code>. The build imports
          the local MarkdownGNNParser and rejects unsupported equations, dimensions, duplicate
          variables, and time semantics.
        </p>
      </details>
    </section>
  );
}
