import { project } from "../project";
export function Startup({ error = "" }: { readonly error?: string }) {
  return (
    <main className="startup panel" aria-busy={!error}>
      <span className="overline">BATTLESHIP / {project.organization.toUpperCase()}</span>
      <h1>{error ? "Unable to prepare the fleet" : "Preparing the fleet catalog…"}</h1>
      <p role={error ? "alert" : "status"}>
        {error || "Generating legal fleets in a background worker. The game will be ready shortly."}
      </p>
      {error && (
        <button type="button" className="button" onClick={() => location.reload()}>
          Retry startup
        </button>
      )}
    </main>
  );
}
