export class CommandError extends Error {
  constructor(
    message: string,
    readonly exitCode: 1 | 2 = 2,
  ) {
    super(message);
    this.name = "CommandError";
  }
}
export type Command =
  | { readonly kind: "help" }
  | { readonly kind: "version" }
  | {
      readonly kind: "analyze";
      readonly replay: string;
      readonly actor: "player" | "opponent";
      readonly cell?: string;
      readonly controls?: string;
      readonly output?: string;
    }
  | {
      readonly kind: "play";
      readonly seed?: number;
      readonly catalogueSize?: number;
      readonly mode: "sample" | "greedy";
      readonly controls?: string;
      readonly output?: string;
    };

const allowed = {
  analyze: new Set(["--actor", "--cell", "--controls", "--output"]),
  play: new Set(["--seed", "--catalog-size", "--mode", "--controls", "--output"]),
};
function integer(value: string, name: string, min: number, max: number): number {
  if (
    !/^(0|[1-9]\d*)$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new CommandError(`${name} must be an integer from ${min} to ${max}`);
  return Number(value);
}
export function parseCommand(argv: readonly string[]): Command {
  if (argv.length === 1 && argv[0] === "--version") return { kind: "version" };
  if (argv.length === 0 || (argv.length === 1 && (argv[0] === "--help" || argv[0] === "help")))
    return { kind: "help" };
  const kind = argv[0];
  if (kind !== "analyze" && kind !== "play")
    throw new CommandError("Choose analyze or play; use --help for usage");
  if (argv.length === 2 && argv[1] === "--help") return { kind: "help" };
  const flags = new Map<string, string>();
  let replay: string | undefined;
  for (let index = 1; index < argv.length; index++) {
    const key = argv[index];
    if (key === undefined) throw new CommandError("Missing argument");
    if (!key.startsWith("--")) {
      if (kind !== "analyze" || replay !== undefined)
        throw new CommandError(`Unexpected argument: ${key}`);
      replay = key;
      continue;
    }
    if (!allowed[kind].has(key)) throw new CommandError(`Unknown option: ${key}`);
    if (flags.has(key)) throw new CommandError(`Duplicate option: ${key}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new CommandError(`Missing value for ${key}`);
    flags.set(key, value);
  }
  const controls = flags.get("--controls"),
    output = flags.get("--output");
  const common = {
    ...(controls === undefined ? {} : { controls }),
    ...(output === undefined ? {} : { output }),
  };
  if (kind === "analyze") {
    if (replay === undefined)
      throw new CommandError("analyze requires a replay file, or - for standard input");
    if (replay === "-" && controls === "-")
      throw new CommandError("Standard input can supply only one input file");
    const actor = flags.get("--actor") ?? "player";
    if (actor !== "player" && actor !== "opponent")
      throw new CommandError("--actor must be player or opponent");
    const cell = flags.get("--cell");
    return { kind, replay, actor, ...common, ...(cell === undefined ? {} : { cell }) };
  }
  const mode = flags.get("--mode") ?? "sample";
  if (mode !== "sample" && mode !== "greedy")
    throw new CommandError("--mode must be sample or greedy");
  const seed = flags.get("--seed"),
    count = flags.get("--catalog-size");
  return {
    kind,
    mode,
    ...common,
    ...(seed === undefined ? {} : { seed: integer(seed, "--seed", 0, 4294967295) }),
    ...(count === undefined ? {} : { catalogueSize: integer(count, "--catalog-size", 16, 16384) }),
  };
}

export function parseCell(text: string, size: number): number {
  if (/^(0|[1-9]\d*)$/.test(text)) return integer(text, "--cell", 0, size ** 2 - 1);
  const match = /^([A-La-l])([1-9]|1[0-2])$/.exec(text);
  const row = match?.[1],
    column = match?.[2];
  if (row === undefined || column === undefined)
    throw new CommandError("--cell requires a coordinate such as A1 or a zero-based cell index");
  const r = row.toUpperCase().charCodeAt(0) - 65,
    c = Number(column) - 1;
  if (r >= size || c >= size) throw new CommandError("--cell is outside this model's board");
  return r * size + c;
}

export const usage = `Active Inference Institute — Battleship v0.4.0

Usage:
  battleship analyze REPLAY [--actor player|opponent] [--cell A1|INDEX]
                     [--controls FILE] [--output FILE]
  battleship play [--seed INTEGER] [--catalog-size 16..16384]
                  [--mode sample|greedy] [--controls FILE] [--output FILE]
  battleship --help
  battleship --version

analyze reconstructs a version-one replay and reports public inference candidates.
Use - for REPLAY to read standard input (1 MB maximum). Controls are a JSON
object of supported partial overrides; analysis overrides do not fire shots.
play runs the actual two-actor game to completion and exports a resumable replay.
Defaults come from the bundled GNN model; play defaults to sampled decisions.
JSON goes to standard output unless --output selects a new file. Existing files
are never replaced. Analysis reports are not resumable replays. Local seeds can
reconstruct selected fleets; this is not cryptographically private multiplayer.
Exit codes: 0 success/help; 2 invalid command; 1 input, inference, or I/O failure.
`;
