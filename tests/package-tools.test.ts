import { expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rename, symlink, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeDeclaration } from "../scripts/declarations";
import { packageInputPaths } from "../scripts/package-inputs";
import { requireLocalOutput } from "../scripts/package-output";
import { externalEnvironment, projectRoot } from "../scripts/paths";
import { parseCell, parseCommand } from "../src/cli/arguments";

test("command interface supports both operations and explicit help", () => {
  expect(parseCommand(["--version"])).toEqual({ kind: "version" });
  for (const args of [[], ["help"], ["--help"], ["play", "--help"], ["analyze", "--help"]])
    expect(parseCommand(args)).toEqual({ kind: "help" });
  expect(parseCommand(["play"])).toEqual({ kind: "play", mode: "sample" });
  expect(
    parseCommand([
      "play",
      "--seed",
      "4294967295",
      "--catalog-size",
      "16",
      "--mode",
      "greedy",
      "--controls",
      "controls.json",
      "--output",
      "new.json",
    ]),
  ).toEqual({
    kind: "play",
    seed: 4294967295,
    catalogueSize: 16,
    mode: "greedy",
    controls: "controls.json",
    output: "new.json",
  });
  expect(parseCommand(["analyze", "--actor", "opponent", "-", "--cell", "a1"])).toEqual({
    kind: "analyze",
    replay: "-",
    actor: "opponent",
    cell: "a1",
  });
  expect(
    parseCommand(["analyze", "replay.json", "--controls", "-", "--output", "out.json"]),
  ).toEqual({
    kind: "analyze",
    replay: "replay.json",
    actor: "player",
    controls: "-",
    output: "out.json",
  });
});

test("ambiguous, incomplete and unsupported commands are rejected", () => {
  for (const args of [
    ["unknown"],
    ["analyze"],
    ["play", "unexpected"],
    ["analyze", "a", "b"],
    ["analyze", "--actor", "truth", "a"],
    ["play", "--mode", "optimal"],
    ["play", "--force"],
    ["play", "--seed"],
    ["play", "--seed", "--mode", "sample"],
    ["play", "--seed", "1", "--seed", "2"],
    ["analyze", "-", "--controls", "-"],
    ["play", "--seed", "-1"],
    ["play", "--seed", "4294967296"],
    ["play", "--seed", "1.5"],
    ["play", "--catalog-size", "15"],
    ["play", "--catalog-size", "16385"],
    ["play", "--seed", "9007199254740993"],
  ])
    expect(() => parseCommand(args)).toThrow();
  expect(() => Reflect.apply(parseCommand, undefined, [["play", undefined]])).toThrow(
    "Missing argument",
  );
});

test("coordinates support full declared boards without accepting malformed cells", () => {
  expect(parseCell("A1", 10)).toBe(0);
  expect(parseCell("j10", 10)).toBe(99);
  expect(parseCell("99", 10)).toBe(99);
  expect(parseCell("L12", 12)).toBe(143);
  for (const cell of ["A0", "M1", "A13", "J11", "100", "01", "-1", "NaN", " A1", "A1 "])
    expect(() => parseCell(cell, 10)).toThrow();
});

test("declaration imports normalize while comments and string/template literal types stay unchanged", () => {
  const source = `// import("./comment").X\n/* export { X } from './comment' */\nimport type { X } from "./x";\nexport { Y } from '../y.js';\nimport './side';\nexport type Q = import("../q").Q;\nexport type Text = 'from "./literal"';\nexport type T = \`from "./literal" \${import("./x").X}\`;\nexport type Nested = \`x\${\`y\${import("./x").X}\`}\`;\nimport { z } from "zod";\n`;
  const checked: string[] = [];
  const output = normalizeDeclaration(source, (path) => {
    if (!["./x", "../y.js", "./side", "../q"].includes(path))
      throw new Error("Unresolved test declaration");
    checked.push(path);
  });
  expect(output).toContain('from "./x.js"');
  expect(output).toContain("from '../y.js'");
  expect(output).toContain("import './side.js'");
  expect(output).toContain('import("../q.js").Q');
  expect(output).toContain('// import("./comment").X');
  expect(output).toContain("'from \"./literal\"'");
  // biome-ignore lint/suspicious/noTemplateCurlyInString: The literal is generated declaration syntax under test.
  expect(output).toContain('`from "./literal" ${import("./x.js").X}`');
  expect(output).toContain('import { z } from "zod"');
  expect(checked).toHaveLength(6);
});

test("declaration lexer fails closed on invalid or unresolved module syntax", () => {
  for (const source of [
    'import "./unfinished',
    "/* unfinished",
    "type T = `unfinished",
    "type T = `x${import('./x').X",
    "import './escaped\\x';",
  ])
    expect(() => normalizeDeclaration(source, () => {})).toThrow();
  expect(() =>
    normalizeDeclaration('import "./missing";', () => {
      throw new Error("Missing declaration");
    }),
  ).toThrow("Missing declaration");
  expect(normalizeDeclaration("// final comment", () => {})).toBe("// final comment");
  expect(normalizeDeclaration('type T = "escaped\\"quote";', () => {})).toContain("escaped");
  expect(normalizeDeclaration("type T = `escaped\\`text`;", () => {})).toContain("escaped");
});

test("ignored package output and cache paths cannot traverse or follow symlinks", async () => {
  const root = await mkdtemp(join(externalEnvironment()["TMPDIR"] ?? "", "package-paths-"));
  await mkdir(join(root, "project"));
  await mkdir(join(root, "outside"));
  await requireLocalOutput(join(root, "project"), join(root, "project/lib/types/index.d.ts"));
  await requireLocalOutput(join(root, "project"), "lib");
  await expect(
    requireLocalOutput(join(root, "project"), join(root, "outside/out")),
  ).rejects.toThrow("outside");
  await symlink(join(root, "outside"), join(root, "project/.cache"));
  await expect(
    requireLocalOutput(join(root, "project"), join(root, "project/.cache/history")),
  ).rejects.toThrow("Symlinked");
  await writeFile(join(root, "project/regular"), "preserved");
  await requireLocalOutput(join(root, "project"), join(root, "project/regular"));
});

test("package input inventory binds additions and rejects invalid source types", async () => {
  const files = await packageInputPaths(projectRoot);
  for (const name of [
    "src/core/report.ts",
    "scripts/package-inputs.ts",
    "scripts/package-receipt.ts",
    "scripts/paths.ts",
    "tsconfig.json",
  ])
    expect(files).toContain(name);
  const root = await mkdtemp(join(externalEnvironment()["TMPDIR"] ?? "", "package-inputs-"));
  for (const name of files) {
    const target = join(root, name);
    await mkdir(join(target, ".."), { recursive: true });
    await cp(join(projectRoot, name), target);
  }
  expect(await packageInputPaths(root)).toEqual(files);
  await mkdir(join(root, "src/core/extra"));
  await writeFile(join(root, "src/core/extra/nested.ts"), "export const value = 1;\n");
  expect(await packageInputPaths(root)).toContain("src/core/extra/nested.ts");
  await writeFile(join(root, "src/core/.hidden.ts"), "export const hidden = 1;\n");
  await mkdir(join(root, "src/core/.hidden"));
  await writeFile(join(root, "src/core/.hidden/nested.ts"), "export const nested = 1;\n");
  expect(await packageInputPaths(root)).toContain("src/core/.hidden.ts");
  expect(await packageInputPaths(root)).toContain("src/core/.hidden/nested.ts");
  const linked = join(root, "src/core/linked");
  await symlink(join(root, "src/core/extra"), linked, "dir");
  await expect(packageInputPaths(root)).rejects.toThrow("Symlinked");
  await unlink(linked);
  const pipe = join(root, "src/core/input.pipe");
  expect(await Bun.spawn(["mkfifo", pipe]).exited).toBe(0);
  await expect(packageInputPaths(root)).rejects.toThrow("not a regular file");
  await unlink(pipe);
  await rename(join(root, "src/core"), join(root, "saved-core"));
  await writeFile(join(root, "src/core"), "unexpected regular file");
  await expect(packageInputPaths(root)).rejects.toThrow("source directory");
  await unlink(join(root, "src/core"));
  await rename(join(root, "saved-core"), join(root, "src/core"));
  await unlink(join(root, "src/index.ts"));
  await mkdir(join(root, "src/index.ts"));
  await expect(packageInputPaths(root)).rejects.toThrow("not a regular file");
});
