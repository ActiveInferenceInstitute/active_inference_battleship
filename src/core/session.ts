import { z } from "zod";
import { type CompiledModel, modelDefaults } from "../model/schema";
import { drawFleet, makeCatalogue } from "./fleet";
import { begin, createGame, fire, type Game, observations } from "./game";
import { type Controls, chooseAction, controlsSchema, infer, scoreActions } from "./inference";
import { SeededRandom } from "./random";

const eventSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("begin") }),
  z.strictObject({
    type: z.literal("shuffle"),
    count: z.number().int().min(1).max(1000000).optional(),
  }),
  z.strictObject({ type: z.literal("shot"), cell: z.number().int().min(0).max(143) }),
  z.strictObject({ type: z.literal("controls"), value: controlsSchema }),
  z.strictObject({ type: z.literal("mode"), value: z.enum(["sample", "greedy"]) }),
]);
export type SessionEvent = z.infer<typeof eventSchema>;
const replaySchema = z.strictObject({
  version: z.literal(1),
  modelSha256: z.string(),
  seed: z.number().int().min(0).max(4294967295),
  catalogueSize: z.number().int().min(16).max(16384),
  events: z.array(eventSchema).max(1000),
});

export interface Session {
  readonly seed: number;
  readonly catalogueSize: number;
  readonly catalogue: ReturnType<typeof makeCatalogue>;
  readonly controls: Controls;
  readonly mode: "sample" | "greedy";
  readonly game: Game;
  readonly events: readonly SessionEvent[];
  readonly shuffles: number;
}

export function createSession(model: CompiledModel, seed: number, catalogueSize: number): Session {
  if (!Number.isInteger(seed) || seed < 0 || seed > 4294967295)
    throw new Error("Seed must be an integer from 0 to 4294967295");
  const defaults = modelDefaults(model);
  const catalogue = makeCatalogue(defaults.rules, catalogueSize, seed);
  return {
    seed,
    catalogueSize,
    catalogue,
    controls: defaults.controls,
    mode: "sample",
    events: [],
    shuffles: 0,
    game: createGame(
      defaults.rules,
      drawFleet(catalogue, new SeededRandom(seed ^ 0x19ea23)),
      drawFleet(catalogue, new SeededRandom(seed ^ 0x8c7234)),
    ),
  };
}

export function assistant(session: Session, actor: "player" | "opponent" = "player") {
  const shots = observations(
    actor === "player" ? session.game.playerShots : session.game.opponentShots,
  );
  const belief = infer(session.catalogue, shots, session.controls.sensorNoise);
  const actions = scoreActions(belief, shots, session.game.rules.boardSize, session.controls);
  return { belief, actions };
}

export function suggestedCell(session: Session): number {
  return chooseAction(
    assistant(session).actions,
    session.mode,
    new SeededRandom(session.seed ^ (session.game.playerShots.length * 7919 + 0x12ab)),
  );
}

export function applyEvent(session: Session, event: SessionEvent): Session {
  let next: Session;
  let recorded = event;
  switch (event.type) {
    case "begin":
      next = { ...session, game: begin(session.game) };
      break;
    case "shuffle": {
      if (session.game.phase !== "ready")
        throw new Error("Fleet can only be shuffled before launch");
      const shuffles = event.count ?? session.shuffles + 1;
      if (!Number.isInteger(shuffles) || shuffles < 1 || shuffles > 1000000)
        throw new Error("Shuffle count is outside the supported range");
      recorded = { type: "shuffle", count: shuffles };
      next = {
        ...session,
        shuffles,
        game: {
          ...session.game,
          playerFleet: drawFleet(
            session.catalogue,
            new SeededRandom(session.seed ^ (shuffles * 3571 + 0x19ea23)),
          ),
        },
      };
      break;
    }
    case "controls":
      next = { ...session, controls: controlsSchema.parse(event.value) };
      break;
    case "mode":
      next = { ...session, mode: event.value };
      break;
    case "shot": {
      let game = fire(session.game, "player", event.cell);
      if (game.phase === "playing") {
        const shots = observations(game.opponentShots);
        const belief = infer(session.catalogue, shots, session.controls.sensorNoise);
        const actions = scoreActions(belief, shots, game.rules.boardSize, session.controls);
        const cell = chooseAction(
          actions,
          session.mode,
          new SeededRandom(session.seed ^ (game.opponentShots.length * 7919 + 0xb12c)),
        );
        game = fire(game, "opponent", cell);
      }
      next = { ...session, game };
      break;
    }
  }
  const boundary = session.events.findLastIndex((e) => e.type === "shot" || e.type === "begin");
  const events =
    recorded.type === "shot" || recorded.type === "begin"
      ? session.events
      : session.events.filter((e, index) => index <= boundary || e.type !== recorded.type);
  return { ...next, events: [...events, recorded] };
}

export function exportSession(session: Session, model: CompiledModel): string {
  return JSON.stringify(
    {
      version: 1,
      modelSha256: model.source.specificationSha256,
      seed: session.seed,
      catalogueSize: session.catalogueSize,
      events: session.events,
    },
    null,
    2,
  );
}

export function importSession(text: string, model: CompiledModel): Session {
  if (text.length > 1000000) throw new Error("Replay exceeds 1 MB limit");
  const replay = replaySchema.parse(JSON.parse(text));
  if (replay.modelSha256 !== model.source.specificationSha256)
    throw new Error("Replay belongs to a different GNN model");
  return replay.events.reduce(applyEvent, createSession(model, replay.seed, replay.catalogueSize));
}
