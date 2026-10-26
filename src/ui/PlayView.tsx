import {
  ArrowCounterClockwiseIcon,
  CrosshairIcon,
  PauseIcon,
  PlayIcon,
  ShuffleIcon,
} from "@phosphor-icons/react";
import { coordinate } from "../core/fleet";
import { suggestedCell } from "../core/session";
import { BattleBoards } from "./BattleBoards";
import { AgentControls, Dial } from "./Controls";
import { ActionTable, Metric, ShotLog } from "./Diagnostics";
import type { BattleController } from "./useBattle";
export function PlayView({ controller }: { readonly controller: BattleController }) {
  const {
    session,
    setView,
    selected,
    autoplay,
    setAutoplay,
    pace,
    setPace,
    seed,
    setSeed,
    count,
    setCount,
    belief,
    actions,
    game,
    target,
    playing,
    dispatch,
    shoot,
    newGame,
    selectCell,
    defaults,
    busy,
  } = controller;
  return (
    <>
      <div className="view-heading">
        <div>
          <span className="overline">A game of uncertainty</span>
          <h1>Battleship game</h1>
          <p className="view-summary">Search the sea. Update your beliefs.</p>
        </div>
        <span className="tag">{session.catalogueSize.toLocaleString()} fleet hypotheses</span>
      </div>
      <div className="workspace">
        <div className="play-main">
          <BattleBoards controller={controller} />
          <section className="panel metrics-strip" aria-label="Live diagnostics">
            <Metric
              label="Fleet entropy"
              value={belief.entropy.toFixed(2)}
              unit="nats"
              detail={`${belief.effectiveStates.toFixed(1)} effective hypotheses`}
            />
            <Metric
              label="Expected information"
              value={(target?.informationGain ?? 0).toFixed(3)}
              unit="nats"
              detail="Selected or highest-probability action"
            />
            <Metric
              label="Ship probability"
              value={((target?.occupancy ?? 0) * 100).toFixed(1)}
              unit="%"
              detail="Posterior occupancy at target"
            />
            <Metric
              label="Expected free energy"
              value={(target?.expectedFreeEnergy ?? 0).toFixed(3)}
              unit="G"
              detail="Preference cost − β · information"
            />
          </section>
          <section className="panel ledger">
            <div className="panel-heading">
              <h2>Observation log</h2>
              <button type="button" className="text-button" onClick={() => setView("diagnostics")}>
                Full diagnostics →
              </button>
            </div>
            <ShotLog shots={game.playerShots} belief={belief} size={game.rules.boardSize} compact />
          </section>
          <section className="panel">
            <div className="panel-heading">
              <h2>Top action candidates</h2>
              <button type="button" className="text-button" onClick={() => setView("lab")}>
                Explain and compare →
              </button>
            </div>
            <ActionTable actions={actions} size={game.rules.boardSize} onSelect={selectCell} />
          </section>
        </div>
        <aside className="agent-rail" aria-label="Agent inspector">
          <div className="game-actions">
            {game.phase === "ready" ? (
              <>
                <button
                  type="button"
                  className="button primary"
                  onClick={() => dispatch({ type: "begin" })}
                  disabled={busy}
                >
                  <PlayIcon size={20} weight="fill" />
                  Launch game
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => dispatch({ type: "shuffle" })}
                  disabled={busy}
                >
                  <ShuffleIcon size={20} />
                  Shuffle your fleet
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="button primary"
                  disabled={!playing || autoplay || selected === null}
                  onClick={() => {
                    if (selected !== null) shoot(selected);
                  }}
                >
                  <CrosshairIcon size={20} />
                  Fire
                  {selected === null
                    ? " selected target"
                    : ` at ${coordinate(selected, game.rules.boardSize)}`}
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={!playing || autoplay}
                  onClick={() => shoot(suggestedCell(session))}
                >
                  <CrosshairIcon size={20} />
                  Fire suggested shot
                </button>
                <button
                  type="button"
                  className="button"
                  disabled={!playing}
                  onClick={() => setAutoplay(!autoplay)}
                >
                  {autoplay && playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}{" "}
                  {autoplay && playing ? "Pause autoplay" : "Autoplay both agents"}
                </button>
              </>
            )}
          </div>
          <AgentControls
            controls={session.controls}
            mode={session.mode}
            onMode={(value) => dispatch({ type: "mode", value })}
            onChange={(value) => dispatch({ type: "controls", value })}
            pace={pace}
            onPace={setPace}
            onReset={() => dispatch({ type: "controls", value: defaults.controls })}
          />
          <div className="panel dials">
            <Dial
              label="Learning drive"
              value={session.controls.epistemicWeight}
              max={4}
              detail="epistemic weight"
            />
            <Dial
              label="Policy focus"
              value={session.controls.policyPrecision}
              max={32}
              detail="precision"
            />
          </div>
          <p className="small muted rail-note">
            Exact Bayes within a sampled fleet catalog. One-step planning.{" "}
            <button type="button" className="text-button" onClick={() => setView("guide")}>
              Understand the model →
            </button>
          </p>
        </aside>
      </div>
      <section className="panel session-bar" aria-label="Session settings">
        <div>
          <h2>Experiment setup</h2>
          <p className="small muted">Seed and catalog size apply to the next game.</p>
        </div>
        <div className="setup-fields">
          <label>
            Seed
            <input
              aria-label="Game seed"
              type="number"
              min="0"
              max="4294967295"
              value={seed}
              onChange={(e) => setSeed(e.currentTarget.value)}
            />
          </label>
          <label>
            Fleet catalog
            <select
              aria-label="Fleet catalog size"
              value={count}
              onChange={(e) => setCount(Number(e.currentTarget.value))}
            >
              {[256, 1024, 4096, 8192, 16384].map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString()} states
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button" onClick={newGame} disabled={busy}>
            <ArrowCounterClockwiseIcon size={18} />
            {busy ? "Preparing fleet…" : "New game"}
          </button>
        </div>
      </section>
    </>
  );
}
