import {
  CheckIcon,
  CrosshairIcon,
  DownloadSimpleIcon,
  UploadSimpleIcon,
  WavesIcon,
} from "@phosphor-icons/react";
import type { Session } from "./core/session";
import { project } from "./project";
import { DecisionLab } from "./ui/DecisionLab";
import { Diagnostics } from "./ui/Diagnostics";
import { Guide } from "./ui/Guide";
import { PlayView } from "./ui/PlayView";
import { useBattle, type View } from "./ui/useBattle";

export function App({ initialSession }: { readonly initialSession: Session }) {
  const controller = useBattle(initialSession);
  const {
    view,
    setView,
    error,
    notice,
    theme,
    setTheme,
    diagnostic,
    inspectedActor,
    setInspectedActor,
    game,
    download,
    upload,
    selectCell,
    model,
    busy,
    operation,
    workError,
    workNotice,
    cancelWork,
  } = controller;

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to game
      </a>
      <header className="masthead">
        <a className="brand" href="#main">
          <CrosshairIcon size={32} weight="thin" />
          <span>
            <strong>BATTLESHIP</strong>
            <small>{project.organization.toUpperCase()}</small>
          </span>
          <WavesIcon size={32} className="brand-waves" weight="thin" />
        </a>
        <div className="header-meta">
          <span className="connection">
            <span />
            GNN MODEL IMPORTED
          </span>
          <select
            id="color-theme"
            aria-label="Color theme"
            value={theme}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value === "system" || value === "light" || value === "dark") setTheme(value);
            }}
          >
            <option value="system">System theme</option>
            <option value="light">Light theme</option>
            <option value="dark">Dark theme</option>
          </select>
        </div>
        <nav aria-label="Workspace">
          {(
            [
              { key: "play", label: "Play" },
              { key: "diagnostics", label: "Diagnostics" },
              { key: "lab", label: "Decision explorer" },
              { key: "guide", label: "Model & guide" },
            ] satisfies { key: View; label: string }[]
          ).map((tab) => (
            <button
              type="button"
              key={tab.key}
              className="nav-tab"
              aria-pressed={view === tab.key}
              onClick={() => setView(tab.key)}
            >
              <CheckIcon className="nav-selection" size={16} aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main id="main">
        {error && (
          <div role="alert" className="error-message">
            {error}
          </div>
        )}
        <div className="sr-only" aria-live="polite">
          {notice}
        </div>
        {view === "play" && <PlayView controller={controller} />}
        {view === "diagnostics" && (
          <Diagnostics
            belief={diagnostic.belief}
            actions={diagnostic.actions}
            shots={inspectedActor === "player" ? game.playerShots : game.opponentShots}
            size={game.rules.boardSize}
            onSelect={inspectedActor === "player" ? selectCell : null}
            actor={inspectedActor}
            onActorChange={setInspectedActor}
          />
        )}
        {view === "guide" && <Guide model={model} />}
        {view === "lab" && <DecisionLab controller={controller} />}
      </main>
      <footer>
        <span className="small muted">
          BATTLESHIP / FINITE-STATE ACTIVE INFERENCE{" "}
          <span className="footer-version">
            {project.version} · GNN {model.source.specificationSha256.slice(0, 8)}
          </span>
        </span>
        <div className="replay-tools">
          <div className="footer-actions" aria-busy={busy}>
            <button type="button" className="button ghost" onClick={download}>
              <DownloadSimpleIcon size={18} />
              Export replay
            </button>
            <label className="button ghost upload-label">
              <UploadSimpleIcon size={18} />
              Import replay
              <input
                id="replay-file"
                type="file"
                accept="application/json,.json"
                aria-label="Import replay file"
                onChange={(e) => {
                  void upload(e.currentTarget.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <div className="operation-feedback">
            {busy && (
              <>
                <p role="status">
                  {operation === "import"
                    ? "Importing replay and reconstructing the game…"
                    : "Preparing a new fleet catalog…"}{" "}
                  Your current game is preserved.
                </p>
                <button type="button" className="button" onClick={cancelWork}>
                  Cancel operation
                </button>
              </>
            )}
            {workError && (
              <p role="alert" className="work-error">
                {workError}
              </p>
            )}
            {!busy && workNotice && <p role="status">{workNotice}</p>}
          </div>
        </div>
      </footer>
    </div>
  );
}
