import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { materializePinned } from "./gnn-source";
import { externalEnvironment, projectRoot, vaultRoot } from "./paths";
import { runTemplatePython } from "./template-process";

/** Scratch belongs to one invocation, and survives until its child has settled. */
export async function withManuscriptEnvironment<T>(
  run: (env: Record<string, string>, signal: AbortSignal) => Promise<T>,
  environment = externalEnvironment(),
): Promise<T> {
  const cancellation = new AbortController();
  const cancel = () => cancellation.abort(new Error("Manuscript invocation interrupted"));
  process.on("SIGINT", cancel);
  process.on("SIGTERM", cancel);
  let cache: string | undefined;
  try {
    const template =
      environment["TEMPLATE_ROOT"] ?? join(vaultRoot(), "Username/docxology/Public/template");
    const parent = join(vaultRoot(), "Local/cache/active-inference-battleship/manuscript");
    await mkdir(parent, { recursive: true });
    cancellation.signal.throwIfAborted();
    cache = await mkdtemp(join(parent, "run-"));
    // Preparation subprocesses settle before invocation-private cleanup.
    const { source } = await materializePinned(
      join(cache, "gnn-pinned"),
      environment["GNN_ROOT"],
      cancellation.signal,
    );
    const soffice =
      environment["SOFFICE"] ??
      join(
        vaultRoot(),
        "Local/runtimes/libreoffice-26.8.1/LibreOffice/LibreOffice.app/Contents/MacOS/soffice",
      );
    const escapeXml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
    const fontConfig = join(cache, "fonts.conf"),
      fontCache = join(cache, "fontconfig");
    const temporary = join(cache, "tmp");
    await mkdir(fontCache);
    await mkdir(temporary);
    await writeFile(
      fontConfig,
      `<?xml version="1.0"?><fontconfig><dir>${escapeXml(join(dirname(dirname(soffice)), "Resources/fonts/truetype"))}</dir><cachedir>${escapeXml(fontCache)}</cachedir></fontconfig>\n`,
      { flag: "wx" },
    );
    cancellation.signal.throwIfAborted();
    return await run(
      {
        ...environment,
        TEMPLATE_ROOT: template,
        TMPDIR: temporary,
        MPLCONFIGDIR: join(cache, "matplotlib"),
        TEXMFVAR: join(cache, "texmf-var"),
        TEXMFCONFIG: join(cache, "texmf-config"),
        PYTHONPATH: [template, projectRoot, join(source, "src"), environment["PYTHONPATH"]]
          .filter(Boolean)
          .join(":"),
        SOFFICE: soffice,
        XDG_CACHE_HOME: join(cache, "xdg"),
        FONTCONFIG_FILE: fontConfig,
      },
      cancellation.signal,
    );
  } finally {
    try {
      if (cache) await rm(cache, { recursive: true, force: true });
    } finally {
      process.off("SIGINT", cancel);
      process.off("SIGTERM", cancel);
    }
  }
}

if (import.meta.main)
  process.exitCode = await withManuscriptEnvironment((env, signal) =>
    runTemplatePython(
      ["-m", "research.manuscript", ...process.argv.slice(2)],
      env,
      projectRoot,
      signal,
    ),
  );
