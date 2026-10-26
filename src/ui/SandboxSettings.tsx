import { FlaskIcon } from "@phosphor-icons/react";
import { strategyPresets } from "../core/analysis";
import type { Controls } from "../core/inference";
import { InferenceControls } from "./Controls";

export function SandboxSettings({
  controls,
  liveControls,
  onChange,
  onApply,
  onNotice,
  notice,
  busy,
}: {
  readonly controls: Controls;
  readonly liveControls: Controls;
  readonly onChange: (controls: Controls) => void;
  readonly onApply: () => void;
  readonly onNotice: (notice: string) => void;
  readonly notice: string;
  readonly busy: boolean;
}) {
  const dirty = JSON.stringify(controls) !== JSON.stringify(liveControls);
  return (
    <>
      <section className="panel controls-panel" aria-labelledby="sandbox-title">
        <div className="panel-heading">
          <h2 id="sandbox-title">What-if controls</h2>
          <FlaskIcon size={22} aria-hidden="true" />
        </div>
        <p className="small muted">
          {dirty ? "Sandbox differs from live settings." : "Sandbox matches live settings."} Opening
          another view discards these temporary changes. Both agents share live controls.
        </p>
        <InferenceControls controls={controls} onChange={onChange} prefix="lab-" />
        <div className="control-options">
          <button
            className="button primary"
            type="button"
            disabled={!dirty || busy}
            onClick={onApply}
          >
            Apply settings to both agents
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              onChange(liveControls);
              onNotice("Sandbox reset to live settings.");
            }}
          >
            Copy live settings
          </button>
          <a className="button ghost" href="#map-title">
            Return to decision map
          </a>
        </div>
        {notice && (
          <p role="status" className="small muted">
            {notice}
          </p>
        )}
      </section>
      <section className="panel strategy-presets">
        <h2>Try a different motive</h2>
        <p className="small muted">
          Illustrative strategies, not claims of superior play. Each preserves your assumed sensor
          noise.
        </p>
        {strategyPresets.map((preset) => (
          <div key={preset.name}>
            <button
              className="button"
              type="button"
              onClick={() => {
                onChange({ ...controls, ...preset.controls });
                onNotice(`${preset.name} preset loaded in the sandbox.`);
              }}
            >
              {preset.name}
            </button>
            <p className="small muted">{preset.description}</p>
          </div>
        ))}
      </section>
    </>
  );
}
