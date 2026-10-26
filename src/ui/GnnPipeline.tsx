import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import specification from "../../models/battleship.gnn.md?raw";
import type { CompiledModel } from "../model/schema";

const stages = [
  [
    "Declare",
    "GNN Markdown",
    "Variables, dimensions, dependencies, equations, and default parameters live in models/battleship.gnn.md.",
  ],
  [
    "Parse",
    "Upstream Python parser",
    "The build imports the real MarkdownGNNParser from Generalized_Notation_Notation. It produces structured model declarations.",
  ],
  [
    "Validate",
    "Supported model contract",
    "Our binary-static-fleet-v1 adapter rejects incompatible dimensions, duplicate variables, changed equations, and time horizons beyond one shot.",
  ],
  [
    "Compile",
    "Browser model JSON",
    "The checked declarations and source digests become src/generated/model.json. The browser loads this artifact; it does not run Python or evaluate arbitrary GNN equations.",
  ],
  [
    "Infer & act",
    "TypeScript implementation",
    "Public hit/miss history updates a categorical fleet belief. One-shot expected free energy and action priors produce the policy. Only the environment reads the selected fleet.",
  ],
] as const;

export function GnnPipeline({ model }: { readonly model: CompiledModel }) {
  const [notice, setNotice] = useState("");
  const download = (kind: "source" | "model") => {
    const source = kind === "source";
    const filename = source ? "battleship.gnn.md" : "battleship-model.json";
    const url = URL.createObjectURL(
      new Blob([source ? specification : `${JSON.stringify(model, null, 2)}\n`], {
        type: source ? "text/markdown;charset=utf-8" : "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      `${source ? "Verbatim GNN source" : "Compiled model with provenance"} downloaded. This is not a game replay.`,
    );
  };
  return (
    <section className="panel gnn-pipeline" aria-labelledby="gnn-pipeline-title">
      <span className="overline">A specification with an explicit implementation boundary</span>
      <h2 id="gnn-pipeline-title">What GNN does here</h2>
      <p className="reading-measure">
        <strong>Generalized Notation Notation (GNN)</strong> is a text notation for generative
        models, not a graph neural network. This game implements a deliberately bounded GNN
        contract. The notation declares the model; the parser reads it; our adapter checks it; the
        tested TypeScript backend supplies its supported numerical meaning.
      </p>
      <ol className="gnn-stages">
        {stages.map(([verb, title, detail], index) => (
          <li key={verb}>
            <span className="gnn-stage-number" aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <span className="overline">{verb}</span>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="gnn-runtime-note reading-measure">
        <h3>Defaults and live settings are different</h3>
        <p>
          The imported defaults use {model.parameters.catalogue_size.toLocaleString("en-US")} fleet
          labels and a {model.parameters.board_size} × {model.parameters.board_size} board. Setup
          can select another supported catalog size. Sliders change runtime assumptions and
          recompute public history; they never rewrite the GNN file. The source hash identifies the
          specification, while replay events retain the actual settings.
        </p>
      </div>
      <div className="gnn-downloads">
        <button type="button" className="button" onClick={() => download("source")}>
          <DownloadSimpleIcon size={18} aria-hidden="true" /> Download GNN source
        </button>
        <button type="button" className="button" onClick={() => download("model")}>
          <DownloadSimpleIcon size={18} aria-hidden="true" /> Download compiled model
        </button>
      </div>
      <p className="small muted" role="status">
        {notice}
      </p>
    </section>
  );
}
