import type { Controls } from "../core/inference";

const controlFields: readonly {
  key: keyof Controls;
  label: string;
  min: number;
  max: number;
  step: number;
  help: string;
  symbol: string;
}[] = [
  {
    key: "epistemicWeight",
    label: "Epistemic weight",
    min: 0,
    max: 4,
    step: 0.05,
    symbol: "β",
    help: "Value of learning about the fleet. 1 gives standard one-step EFE; 0 is preference only.",
  },
  {
    key: "hitPreference",
    label: "Hit preference",
    min: 0,
    max: 8,
    step: 0.1,
    symbol: "C",
    help: "Log-preference for a hit versus a miss. Larger values favor immediate hits.",
  },
  {
    key: "policyPrecision",
    label: "Policy precision",
    min: 0,
    max: 32,
    step: 0.5,
    symbol: "γ",
    help: "Concentration of the policy posterior. At 0, choices follow the habit prior.",
  },
  {
    key: "sensorNoise",
    label: "Assumed sensor noise",
    min: 0,
    max: 0.25,
    step: 0.005,
    symbol: "ε",
    help: "Subjective probability of a flipped hit/miss. The game itself has deterministic observations.",
  },
  {
    key: "habitStrength",
    label: "Center habit",
    min: 0,
    max: 4,
    step: 0.1,
    symbol: "E",
    help: "Prior bias toward central cells. 0 gives a uniform habit over unvisited cells.",
  },
];

export function InferenceControls({
  controls,
  onChange,
  prefix = "",
}: {
  readonly controls: Controls;
  readonly onChange: (value: Controls) => void;
  readonly prefix?: string;
}) {
  return controlFields.map((field) => (
    <div className="range-control" key={field.key}>
      <div className="range-label">
        <label htmlFor={`${prefix}${field.key}`}>
          <span className="control-symbol">{field.symbol}</span>
          {field.label}
        </label>
        <output htmlFor={`${prefix}${field.key}`}>
          {controls[field.key].toFixed(field.key === "sensorNoise" ? 3 : 2)}
        </output>
      </div>
      <input
        id={`${prefix}${field.key}`}
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={controls[field.key]}
        aria-describedby={`${prefix}${field.key}-help`}
        onChange={(event) =>
          onChange({ ...controls, [field.key]: event.currentTarget.valueAsNumber })
        }
      />
      <p id={`${prefix}${field.key}-help`} className="control-help">
        {field.help}
      </p>
    </div>
  ));
}

export function AgentControls({
  controls,
  onChange,
  mode,
  onMode,
  pace,
  onPace,
  onReset,
}: {
  readonly controls: Controls;
  readonly onChange: (value: Controls) => void;
  readonly mode: "sample" | "greedy";
  readonly onMode: (mode: "sample" | "greedy") => void;
  readonly pace: number;
  readonly onPace: (pace: number) => void;
  readonly onReset: () => void;
}) {
  return (
    <section className="panel controls-panel" aria-labelledby="controls-title">
      <div className="panel-heading">
        <h2 id="controls-title">Agent controls</h2>
        <span className="mono muted">A / B / C / D / E</span>
      </div>
      <p className="small muted">
        Both agents use these settings. Beliefs replay from all observed shots.
      </p>
      <InferenceControls controls={controls} onChange={onChange} />
      <div className="control-options">
        <label htmlFor="selection-mode">Action selection</label>
        <select
          id="selection-mode"
          value={mode}
          onChange={(e) => onMode(e.currentTarget.value === "greedy" ? "greedy" : "sample")}
        >
          <option value="sample">Sample posterior</option>
          <option value="greedy">Highest probability</option>
        </select>
        <label htmlFor="pace">
          Autoplay interval <output>{pace} ms</output>
        </label>
        <input
          id="pace"
          type="range"
          min="100"
          max="2000"
          step="100"
          value={pace}
          onChange={(e) => onPace(e.currentTarget.valueAsNumber)}
        />
        <button type="button" className="button ghost" onClick={onReset}>
          Reset agent defaults
        </button>
      </div>
    </section>
  );
}

export function Dial({
  label,
  value,
  max,
  detail,
}: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly detail: string;
}) {
  const angle = -120 + 240 * Math.min(1, Math.max(0, value / max));
  return (
    <div className="dial">
      <svg viewBox="0 0 140 100" aria-hidden="true">
        <path className="dial-track" d="M 25 80 A 52 52 0 1 1 115 80" />
        <path
          className="dial-value"
          d="M 25 80 A 52 52 0 1 1 115 80"
          pathLength="100"
          strokeDasharray={`${Math.min(100, (value / max) * 100)} 100`}
        />
        <g transform={`rotate(${angle} 70 54)`}>
          <line x1="70" y1="54" x2="70" y2="15" />
          <circle cx="70" cy="54" r="4" />
        </g>
      </svg>
      <strong className="mono">{value.toFixed(2)}</strong>
      <span>{label}</span>
      <meter className="sr-only" min={0} max={max} value={value} aria-label={label} />
      <small className="muted">{detail}</small>
    </div>
  );
}
