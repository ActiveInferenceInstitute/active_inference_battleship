import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { forecastOutcomes, type SweepParameter, sweepPolicy } from "../core/analysis";
import { coordinate } from "../core/fleet";
import { observations } from "../core/game";
import { infer, scoreActions } from "../core/inference";
import { ActionTradeoff } from "./ActionTradeoff";
import { DecisionMap } from "./DecisionMap";
import { DecisionReceipt } from "./DecisionReceipt";
import { ActionTable, Metric } from "./Diagnostics";
import { FactorInspector } from "./FactorInspector";
import { PolicySensitivity } from "./PolicySensitivity";
import { SandboxSettings } from "./SandboxSettings";
import type { BattleController } from "./useBattle";

export function DecisionLab({ controller }: { readonly controller: BattleController }) {
  const {
    session,
    inspectedActor: actor,
    setInspectedActor,
    model,
    diagnostic,
    dispatch,
    busy,
    selectCell,
  } = controller;
  const [controls, setControls] = useState(session.controls);
  const [selected, setSelected] = useState<number | null>(null);
  const [parameter, setParameter] = useState<SweepParameter>("epistemicWeight");
  const [notice, setNotice] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const size = session.game.rules.boardSize;
  const shots = actor === "player" ? session.game.playerShots : session.game.opponentShots;
  const history = useMemo(() => observations(shots), [shots]);
  const belief = useMemo(
    () => infer(session.catalogue, history, controls.sensorNoise),
    [session.catalogue, history, controls.sensorNoise],
  );
  const actions = useMemo(
    () => scoreActions(belief, history, size, controls),
    [belief, history, size, controls],
  );
  const leader = actions[0];
  const action = actions.find((candidate) => candidate.cell === selected) ?? leader;
  const selectedCell = action?.cell;
  const branches = useMemo(
    () =>
      selectedCell !== undefined
        ? forecastOutcomes(session.catalogue, history, controls.sensorNoise, selectedCell, belief)
        : [],
    [session.catalogue, history, controls.sensorNoise, selectedCell, belief],
  );
  const sweep = useMemo(
    () =>
      selectedCell !== undefined
        ? sweepPolicy(belief, history, size, controls, parameter, selectedCell)
        : [],
    [belief, history, size, controls, parameter, selectedCell],
  );
  const liveLeader = diagnostic.actions[0];
  const download = () => {
    const snapshot = {
      format: "battleship-analysis",
      version: 1,
      modelSha256: model.source.specificationSha256,
      seed: session.seed,
      catalogueSize: session.catalogueSize,
      actor,
      observations: history,
      liveControls: session.controls,
      sandboxControls: controls,
      selectedCell: action?.cell ?? null,
      belief: {
        entropy: belief.entropy,
        effectiveStates: belief.effectiveStates,
        weights: belief.weights,
        occupancy: belief.occupancy,
      },
      actions,
      branches,
      sweep: { parameter, points: sweep },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `battleship-analysis-${session.seed}-${actor}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportNotice(
      "Analysis snapshot exported. This file contains the seed and is not a resumable replay.",
    );
  };
  return (
    <div className="decision-lab">
      <div className="view-heading">
        <div>
          <span className="overline">An experiment before every shot</span>
          <h1>Decision explorer</h1>
          <p className="view-summary">See the choice. Change the assumptions.</p>
        </div>
        <label className="inspect-agent">
          Inspect agent
          <select
            aria-label="Inspect agent"
            value={actor}
            onChange={(event) => {
              setInspectedActor(event.currentTarget.value === "opponent" ? "opponent" : "player");
              setSelected(null);
            }}
          >
            <option value="player">Player assistant</option>
            <option value="opponent">Opponent agent</option>
          </select>
        </label>
      </div>
      <p className="lab-introduction muted">
        Explore {actor === "player" ? "your assistant’s" : "the opponent’s"} next decision using
        only its {shots.length} observed shots and the {session.catalogueSize.toLocaleString()}
        -label fleet catalog. This temporary sandbox starts from live settings when opened.
        Exploration never fires a shot. Live controls change only when you explicitly apply
        settings.
      </p>
      {session.game.phase === "won" || session.game.phase === "lost" ? (
        <p className="lab-notice">
          The game has ended. Remaining-cell scores are hypothetical; no more shots can be fired.
        </p>
      ) : null}
      <div className="workspace lab-workspace">
        <div className="play-main">
          <DecisionMap
            actions={actions}
            shots={shots}
            size={size}
            selectedCell={selectedCell}
            onSelect={setSelected}
            onUseTarget={action && actor === "player" ? () => selectCell(action.cell) : null}
            canUseTarget={!busy && session.game.phase === "playing"}
          />
          <section className="panel metrics-strip" aria-label="Sandbox comparison">
            <Metric
              label="Live leading cell"
              value={liveLeader ? coordinate(liveLeader.cell, size) : "—"}
              unit=""
              detail="Current game settings"
            />
            <Metric
              label="Sandbox leading cell"
              value={leader ? coordinate(leader.cell, size) : "—"}
              unit=""
              detail="Highest policy probability; ties use coordinate order"
            />
            <Metric
              label="Sandbox entropy"
              value={belief.entropy.toFixed(3)}
              unit="nats"
              detail="Current public history under sandbox noise"
            />
            <Metric
              label="Selected policy rank"
              value={action ? String(actions.indexOf(action) + 1) : "—"}
              unit={`/ ${actions.length}`}
              detail="Ranked by choice probability"
            />
          </section>
          {action && leader ? (
            <>
              <DecisionReceipt
                action={action}
                leader={leader}
                belief={belief}
                controls={controls}
                branches={branches}
                size={size}
              />
              <PolicySensitivity
                points={sweep}
                parameter={parameter}
                onParameter={setParameter}
                cell={action.cell}
                size={size}
              />
              <ActionTradeoff actions={actions} selected={action} size={size} />
            </>
          ) : (
            <section className="panel">
              <h2>No unvisited cells remain</h2>
              <p>Start a new game to explore another decision.</p>
            </section>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h2>Sandbox policy ranking</h2>
              <span className="small muted">Select to inspect, without firing</span>
            </div>
            <ActionTable actions={actions} size={size} onSelect={setSelected} />
          </section>
        </div>
        <aside className="agent-rail" aria-label="Sandbox settings">
          <SandboxSettings
            controls={controls}
            liveControls={session.controls}
            onChange={setControls}
            onApply={() => {
              dispatch({ type: "controls", value: controls });
              setNotice("Sandbox settings applied to both agents. No shot was fired.");
            }}
            onNotice={setNotice}
            notice={notice}
            busy={busy}
          />
          <section className="panel lab-export">
            <h2>Keep the experiment</h2>
            <p className="small muted">
              Export all action scores, posterior weights, controls, hypothetical outcomes and the
              sweep. Includes the seed; treat it as a complete local experiment record. Use Export
              replay to resume a game.
            </p>
            <button className="button" type="button" onClick={download}>
              <DownloadSimpleIcon size={18} aria-hidden="true" />
              Export analysis JSON
            </button>
            <p role="status" className="small muted">
              {exportNotice}
            </p>
          </section>
        </aside>
      </div>
      <FactorInspector
        model={model}
        controls={controls}
        action={action}
        count={session.catalogueSize}
      />
      <p className="small muted lab-scope">
        Exact Bayes within a biased sampled catalog. One-shot planning, fixed likelihood, no
        parameter learning. Counterfactual outcomes describe this subjective model; the real game
        returns deterministic hit/miss observations.
      </p>
    </div>
  );
}
