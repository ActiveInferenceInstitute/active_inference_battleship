import { coordinate } from "../core/fleet";
import { Board } from "./Board";
import type { BattleController } from "./useBattle";
export function BattleBoards({ controller }: { readonly controller: BattleController }) {
  const {
    selected,
    autoplay,
    heatmap,
    setHeatmap,
    belief,
    game,
    top,
    hits,
    enemyHits,
    totalSegments,
    last,
    lastEnemy,
    playing,
    selectCell,
    status,
  } = controller;
  return (
    <section className="panel board-panel" aria-label="Battle area">
      <div className="boards">
        <div className="target-area">
          <div className="panel-heading">
            <h2>Unknown waters</h2>
            <label className="check-label">
              <input
                type="checkbox"
                checked={heatmap}
                onChange={(e) => setHeatmap(e.currentTarget.checked)}
              />
              Belief overlay
            </label>
          </div>
          <p className="small muted board-subtitle">Posterior ship probability · enemy fleet</p>
          <Board
            title="Target"
            size={game.rules.boardSize}
            shots={game.playerShots}
            probabilities={belief.occupancy}
            fleet={game.phase === "won" || game.phase === "lost" ? game.opponentFleet : null}
            selected={selected}
            recommended={top?.cell ?? null}
            heatmap={heatmap}
            interactive={playing && !autoplay}
            onSelect={selectCell}
          />
          <div className="board-legend">
            <span className="hit-text">× Hit</span>
            <span>· Miss</span>
            <span className="accent-text">⌖ Suggested</span>
            <span>
              Low <i /> High belief
            </span>
          </div>
        </div>
        <div className="own-area">
          <div className="panel-heading">
            <h2>Your fleet</h2>
            <span className="mono small muted">
              {totalSegments - enemyHits}/{totalSegments}
            </span>
          </div>
          <p className="small muted board-subtitle">Hidden from the opponent</p>
          <Board
            title="Your fleet"
            size={game.rules.boardSize}
            shots={game.opponentShots}
            probabilities={[]}
            fleet={game.playerFleet}
            selected={null}
            recommended={null}
            heatmap={false}
            interactive={false}
            onSelect={() => undefined}
          />
          <div className="fleet-list">
            {game.playerFleet.ships.map((ship, index) => (
              <span
                key={ship.join("-")}
                className={
                  ship.every((c) => game.opponentShots.some((s) => s.cell === c))
                    ? "fleet-sunk"
                    : ""
                }
              >
                <span aria-hidden="true">{"▪".repeat(ship.length)}</span>
                <span className="sr-only">
                  Ship {index + 1}, length {ship.length}
                </span>
              </span>
            ))}
          </div>
          <p className="small muted">
            Your hits:{" "}
            <b className="hit-text">
              {hits}/{totalSegments}
            </b>
            <br />
            Opponent hits:{" "}
            <b>
              {enemyHits}/{totalSegments}
            </b>
          </p>
        </div>
      </div>
      <div
        className={`game-status ${game.phase === "won" || game.phase === "lost" ? "terminal" : ""}`}
        role="status"
      >
        <strong>{status}</strong>
        <span className="small muted">
          {last
            ? `You: ${coordinate(last.cell, game.rules.boardSize)} ${last.hit ? "hit" : "miss"}${last.sunk !== null ? ", ship sunk" : ""}`
            : "Each shot is an observation."}
          {lastEnemy
            ? ` · Opponent: ${coordinate(lastEnemy.cell, game.rules.boardSize)} ${lastEnemy.hit ? "hit" : "miss"}`
            : ""}
        </span>
      </div>
    </section>
  );
}
