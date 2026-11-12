import { mkdir, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { projectRoot, vaultRoot } from "./paths";

/**
 * The two git objects a fetch names. Transport only: the pinned tree does not
 * exist until they are fetched, so they are read here before the reader can
 * run. Pin shape, schema, alias normalization, the pointer and the
 * specification are the pinned reader's (`python -m gnn.importers check`);
 * this accessor asserts nothing about them and reports no verdict.
 */
export type PinTransport = {
  readonly path: string;
  readonly repository: string;
  readonly tag: string;
  readonly commit: string;
};

export async function pinTransport(
  pinPath = process.env["GNN_PIN"] ?? join(projectRoot, "models/gnn.pin.json"),
): Promise<PinTransport> {
  const declared: unknown = JSON.parse(await readFile(pinPath, "utf8"));
  const record = (declared ?? {}) as Record<string, unknown>;
  const { repository, tag, commit } = record;
  if (typeof repository !== "string" || typeof tag !== "string" || typeof commit !== "string")
    throw new Error(
      `${relative(projectRoot, pinPath)} must name repository, tag and commit to provision the pinned upstream; run python -m gnn.importers check --repo . for the pin verdict`,
    );
  return { path: pinPath, repository, tag, commit };
}

/** The canonical upstream checkout the pin is resolved against. */
export async function upstreamRoot(): Promise<string> {
  const vault = vaultRoot();
  const upstream = await realpath(
    process.env["GNN_ROOT"] ??
      join(vault, "Username/ActiveInferenceInstitute/Public/Generalized_Notation_Notation"),
  );
  const containment = relative(vault, upstream);
  if (containment.startsWith("..") || isAbsolute(containment))
    throw new Error("GNN_ROOT is outside GitVault");
  return upstream;
}

async function git(upstream: string, ...args: string[]): Promise<string> {
  const child = Bun.spawn(["git", "-C", upstream, ...args], { stdout: "pipe", stderr: "pipe" });
  const [output, errors, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`git ${args.join(" ")} failed (${code}): ${errors}`);
  return output.trim();
}

/** Resolve the pinned fetch against real git objects; a moved tag is a failure. */
export async function pinnedRevision(): Promise<{
  readonly transport: PinTransport;
  readonly upstream: string;
  readonly revision: string;
}> {
  const transport = await pinTransport();
  const upstream = await upstreamRoot();
  const revision = await git(upstream, "rev-parse", "--verify", `${transport.commit}^{commit}`);
  if (revision !== transport.commit)
    throw new Error(`Pinned commit resolves to ${revision}, not ${transport.commit}`);
  const tagCommit = await git(upstream, "rev-parse", "--verify", `${transport.tag}^{commit}`);
  if (tagCommit !== transport.commit)
    throw new Error(
      `Pinned tag ${transport.tag} resolves to ${tagCommit}, not ${transport.commit}`,
    );
  return { transport, upstream, revision };
}

/**
 * Extract exactly the pinned revision's `src/gnn` into `destination`, never the
 * checkout's working tree, so the parser and the reader are the pinned ones.
 */
export async function materializePinned(destination: string): Promise<{
  readonly transport: PinTransport;
  readonly revision: string;
  readonly source: string;
}> {
  const { transport, upstream, revision } = await pinnedRevision();
  await mkdir(destination, { recursive: true });
  const archive = Bun.spawn(["git", "-C", upstream, "archive", revision, "src/gnn"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const extract = Bun.spawn(["tar", "-xf", "-", "-C", destination], {
    stdin: archive.stdout,
    stderr: "pipe",
  });
  const [archiveErrors, archiveCode, extractErrors, extractCode] = await Promise.all([
    new Response(archive.stderr).text(),
    archive.exited,
    new Response(extract.stderr).text(),
    extract.exited,
  ]);
  if (archiveCode !== 0 || extractCode !== 0)
    throw new Error(
      `Cannot materialize ${revision} (archive ${archiveCode}, extract ${extractCode}): ${archiveErrors}${extractErrors}`,
    );
  return { transport, revision, source: destination };
}

if (import.meta.main) {
  // Hosted provisioning and local bootstrap read the same accessor.
  const { repository, tag, commit } = await pinTransport();
  const quote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;
  console.log(`REPOSITORY=${quote(repository)}\nTAG=${quote(tag)}\nREVISION=${quote(commit)}`);
}
