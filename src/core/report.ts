import { z } from "zod";
import { loadDefaultModel } from "../model/default";
import type { CompiledModel } from "../model/schema";
import { forecastOutcomes } from "./analysis";
import { coordinate } from "./fleet";
import { observations } from "./game";
import { type ActionScore, type Belief, type Controls, controlsSchema } from "./inference";
import { applyEvent, assistant, importSession, type Session } from "./session";

export const analysisOptionsSchema = z.strictObject({
  actor: z.enum(["player", "opponent"]).optional(),
  cell: z.number().int().min(0).max(143).optional(),
  controls: controlsSchema.partial().optional(),
});
export type AnalysisOptions = z.infer<typeof analysisOptionsSchema>;
export interface ReplayAnalysis {
  readonly kind: "active-inference-battleship/analysis";
  readonly schemaVersion: 1;
  readonly producer?: { readonly runtime: "node" | "bun"; readonly version: string };
  readonly model: {
    readonly contract: CompiledModel["contract"];
    readonly source: CompiledModel["source"];
  };
  readonly actor: "player" | "opponent";
  readonly replay: {
    readonly seed: number;
    readonly catalogueSize: number;
    readonly phase: Session["game"]["phase"];
    readonly events: number;
  };
  readonly baselineControls: Controls;
  readonly controls: Controls;
  readonly overrides: Partial<Controls>;
  readonly observations: ReturnType<typeof observations>;
  readonly belief: Omit<Belief, "logWeights"> & {
    readonly logWeights: readonly (number | "-Infinity")[];
  };
  /** Unvisited inference candidates, including in a terminal replay; not permission to fire. */
  readonly actions: readonly ActionScore[];
  readonly selected: {
    readonly cell: number;
    readonly coordinate: string;
    readonly score: ActionScore;
    readonly outcomes: ReturnType<typeof forecastOutcomes>;
  } | null;
}

/** Reconstruct a model-bound replay and analyze public history without firing or exposing fleets. */
export function analyzeReplay(
  text: string,
  options: AnalysisOptions = {},
  model: CompiledModel = loadDefaultModel(),
): ReplayAnalysis {
  const parsed = analysisOptionsSchema.parse(options);
  const original = importSession(text, model);
  const overrides: Partial<Controls> = {};
  for (const key of [
    "epistemicWeight",
    "hitPreference",
    "policyPrecision",
    "sensorNoise",
    "habitStrength",
  ] as const) {
    const value = parsed.controls?.[key];
    if (value !== undefined) overrides[key] = value;
  }
  const controls = controlsSchema.parse({ ...original.controls, ...overrides });
  const session =
    parsed.controls === undefined
      ? original
      : applyEvent(original, { type: "controls", value: controls });
  const actor = parsed.actor ?? "player";
  const history = observations(
    actor === "player" ? session.game.playerShots : session.game.opponentShots,
  );
  const { belief, actions } = assistant(session, actor);
  const cell = parsed.cell ?? actions[0]?.cell;
  const score = cell === undefined ? undefined : actions.find((action) => action.cell === cell);
  if (cell !== undefined && score === undefined)
    throw new RangeError("Select an unvisited cell inside this replay's board");
  return {
    kind: "active-inference-battleship/analysis",
    schemaVersion: 1,
    model: {
      contract: model.contract,
      source: {
        ...model.source,
        parserFiles: model.source.parserFiles.map((file) => ({ ...file })),
      },
    },
    actor,
    replay: {
      seed: original.seed,
      catalogueSize: original.catalogueSize,
      phase: original.game.phase,
      events: original.events.length,
    },
    baselineControls: { ...original.controls },
    controls,
    overrides,
    observations: history,
    belief: {
      ...belief,
      logWeights: belief.logWeights.map((value) => (value === -Infinity ? "-Infinity" : value)),
    },
    actions,
    selected:
      score === undefined
        ? null
        : {
            cell: score.cell,
            coordinate: coordinate(score.cell, session.game.rules.boardSize),
            score,
            outcomes: forecastOutcomes(
              session.catalogue,
              history,
              controls.sensorNoise,
              score.cell,
              belief,
            ),
          },
  };
}

/** JSON.stringify otherwise silently replaces non-finite mathematical values with null. */
export function encodeAnalysis(report: ReplayAnalysis): string {
  if (report.kind !== "active-inference-battleship/analysis" || report.schemaVersion !== 1)
    throw new TypeError("Expected a version-one Battleship analysis report");
  return (
    JSON.stringify(
      report,
      (key: string, value: unknown) => {
        if (typeof value === "number" && !Number.isFinite(value))
          throw new RangeError(`Non-finite analysis value: ${key}`);
        return value;
      },
      2,
    ) + "\n"
  );
}
