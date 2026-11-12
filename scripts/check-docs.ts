import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { YAML } from "bun";
import { projectRoot } from "./paths";

// This repository has no hosted docs builder. Check source links offline instead.
const excluded: Readonly<Record<string, true>> = {
  ".git": true,
  ".cache": true,
  node_modules: true,
  dist: true,
  lib: true,
  output: true,
  "test-results": true,
};
const files: string[] = [];
async function collect(directory: string): Promise<void> {
  for (const entry of await readdir(join(projectRoot, directory), { withFileTypes: true })) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!excluded[entry.name]) await collect(path);
    } else if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
}
await collect("");
files.sort();
const failures: string[] = [];
let links = 0;
for (const file of files) {
  const text = await Bun.file(join(projectRoot, file)).text();
  let fence = "";
  const prose = text
    .split("\n")
    .map((line) => {
      const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (marker) {
        if (!fence) fence = marker;
        else if (marker[0] === fence[0] && marker.length >= fence.length) fence = "";
        return "";
      }
      return fence ? "" : line;
    })
    .join("\n");
  // Inline destinations plus reference definitions. Titles are not destinations.
  const destinations =
    /\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)|^\s{0,3}\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm;
  for (const match of prose.matchAll(destinations)) {
    const raw = (match[1] ?? match[2] ?? "").replace(/^<|>$/g, "");
    if (!raw || raw.startsWith("#") || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(raw)) continue;
    const target = decodeURIComponent(raw.split(/[?#]/, 1)[0] ?? "");
    if (!target) continue;
    links++;
    const path = resolve(projectRoot, dirname(file), target);
    const offset = relative(projectRoot, path);
    if (
      offset === ".." ||
      offset.startsWith("../") ||
      offset.split("/").some((part) => excluded[part]) ||
      !existsSync(path)
    ) {
      const line = prose.slice(0, match.index).split("\n").length;
      failures.push(`${file}:${line}: unresolved relative link ${raw}`);
    }
  }
}
const index = await Bun.file(join(projectRoot, "docs/documentation-index.md")).text();
for (const file of files.filter((path) => /^docs\/[^/]+\.md$/.test(path))) {
  const name = file.slice("docs/".length);
  if (name !== "README.md" && name !== "documentation-index.md" && !index.includes(`](${name})`))
    failures.push(`${file}: missing from docs/documentation-index.md`);
}
const sidecar = YAML.parse(await Bun.file(join(projectRoot, ".aii/config.yaml")).text()) as {
  docs: unknown;
};
if (!Array.isArray(sidecar.docs)) {
  failures.push(".aii/config.yaml: docs must be a list of repository-relative paths");
} else {
  for (const target of sidecar.docs) {
    if (typeof target !== "string" || !target.trim()) {
      failures.push(".aii/config.yaml: docs entries must be nonempty paths");
      continue;
    }
    const path = resolve(projectRoot, target);
    const offset = relative(projectRoot, path);
    if (isAbsolute(target) || offset === ".." || offset.startsWith("../") || !existsSync(path))
      failures.push(`.aii/config.yaml: invalid documentation path ${target}`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `Documentation passed: ${files.length} Markdown files, ${links} relative links, flat index complete, sidecar docs valid.`,
);
