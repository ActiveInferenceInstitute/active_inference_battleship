#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, open, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CommandError, parseCell, parseCommand, usage } from "../src/cli/arguments";
import {
  analyzeReplay,
  applyEvent,
  controlsSchema,
  createSession,
  encodeAnalysis,
  exportSession,
  loadDefaultModel,
  modelDefaults,
  suggestedCell,
} from "../src/index";
import { project } from "../src/project";

async function boundedText(path: string, limit: number): Promise<string> {
  if (path === "-") {
    const chunks: Buffer[] = [];
    let count = 0;
    for await (const chunk of process.stdin) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      count += bytes.length;
      if (count > limit) throw new CommandError(`Input exceeds ${limit} bytes`, 1);
      chunks.push(bytes);
    }
    return Buffer.concat(chunks).toString("utf8");
  }
  const file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > limit)
      throw new CommandError(`Input must be a regular file of at most ${limit} bytes`, 1);
    const data = Buffer.alloc(limit + 1);
    let count = 0;
    while (count <= limit) {
      const { bytesRead } = await file.read(data, count, data.length - count, null);
      count += bytesRead;
      if (!bytesRead) break;
    }
    if (count > limit) throw new CommandError(`Input exceeds ${limit} bytes`, 1);
    return data.subarray(0, count).toString("utf8");
  } finally {
    await file.close();
  }
}

async function writeNew(path: string, contents: string): Promise<void> {
  const temporary = join(dirname(path), `.battleship-${randomUUID()}.tmp`);
  const file = await open(temporary, "wx", 0o600);
  try {
    try {
      await file.writeFile(contents);
      await file.sync();
    } finally {
      await file.close();
    }
    await link(temporary, path);
  } finally {
    await unlink(temporary);
  }
}

try {
  const command = parseCommand(process.argv.slice(2));
  if (command.kind === "help") process.stdout.write(usage);
  else if (command.kind === "version") process.stdout.write(`${project.version}\n`);
  else {
    const model = loadDefaultModel(),
      defaults = modelDefaults(model);
    const overrides =
      command.controls === undefined
        ? {}
        : controlsSchema.partial().parse(JSON.parse(await boundedText(command.controls, 65536)));
    let output: string;
    if (command.kind === "analyze") {
      const report = analyzeReplay(
        await boundedText(command.replay, 1000000),
        {
          actor: command.actor,
          controls: overrides,
          ...(command.cell === undefined
            ? {}
            : { cell: parseCell(command.cell, defaults.rules.boardSize) }),
        },
        model,
      );
      const bunVersion = process.versions["bun"];
      output = encodeAnalysis({
        ...report,
        producer: {
          runtime: bunVersion === undefined ? "node" : "bun",
          version: bunVersion ?? process.versions.node,
        },
      });
    } else {
      let session = createSession(
        model,
        command.seed ?? defaults.seed,
        command.catalogueSize ?? defaults.catalogueSize,
      );
      session = applyEvent(session, {
        type: "controls",
        value: controlsSchema.parse({ ...defaults.controls, ...overrides }),
      });
      session = applyEvent(session, { type: "mode", value: command.mode });
      session = applyEvent(session, { type: "begin" });
      for (
        let turn = 0;
        turn < defaults.rules.boardSize ** 2 && session.game.phase === "playing";
        turn++
      )
        session = applyEvent(session, { type: "shot", cell: suggestedCell(session) });
      if (session.game.phase === "playing")
        throw new Error("Headless game exceeded the finite board turn limit");
      output = exportSession(session, model) + "\n";
    }
    if (command.output === undefined) process.stdout.write(output);
    else await writeNew(command.output, output);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  // Zod errors remain actionable without printing an entire machine validation tree.
  const safe =
    error instanceof Error && error.name === "ZodError"
      ? "Invalid replay or controls. Use a replay exported by this app and supported control values."
      : message;
  process.stderr.write(`battleship: ${safe}\n`);
  process.exitCode = error instanceof CommandError ? error.exitCode : 1;
}
