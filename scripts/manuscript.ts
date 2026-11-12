import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { materializePinned } from "./gnn-source";
import { externalEnvironment, projectRoot, vaultRoot } from "./paths";

const template =
  process.env["TEMPLATE_ROOT"] ?? join(vaultRoot(), "Username/docxology/Public/template");
// The renderer refuses an interpreter whose base prefix is outside GitVault. A
// template checkout built from a home-directory uv Python therefore needs an
// explicit vault-local interpreter; the template source still comes from
// TEMPLATE_ROOT through PYTHONPATH.
const templatePython = process.env["TEMPLATE_PYTHON"] ?? join(template, ".venv/bin/python");
const cache = join(vaultRoot(), "Local/cache/active-inference-battleship/manuscript");
await mkdir(cache, { recursive: true });
// `research/variables.py` calls the pinned `gnn.importers`; put exactly the
// pinned revision's `src` on PYTHONPATH rather than a checkout's working tree.
const gnnSource = join(cache, "gnn-pinned");
await rm(gnnSource, { recursive: true, force: true });
const { source } = await materializePinned(gnnSource);
const soffice =
  process.env["SOFFICE"] ??
  join(
    vaultRoot(),
    "Local/runtimes/libreoffice-26.8.1/LibreOffice/LibreOffice.app/Contents/MacOS/soffice",
  );
const escapeXml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const fontConfig = join(cache, "fonts.conf");
const fontCache = join(cache, "fontconfig");
await mkdir(fontCache, { recursive: true });
await writeFile(
  fontConfig,
  `<?xml version="1.0"?><fontconfig><dir>${escapeXml(join(dirname(dirname(soffice)), "Resources/fonts/truetype"))}</dir><cachedir>${escapeXml(fontCache)}</cachedir></fontconfig>\n`,
);
const env = {
  ...externalEnvironment(),
  TEMPLATE_ROOT: template,
  MPLCONFIGDIR: join(cache, "matplotlib"),
  TEXMFVAR: join(cache, "texmf-var"),
  TEXMFCONFIG: join(cache, "texmf-config"),
  PYTHONPATH: [template, projectRoot, join(source, "src"), process.env["PYTHONPATH"]]
    .filter(Boolean)
    .join(":"),
  SOFFICE: soffice,
  XDG_CACHE_HOME: join(cache, "xdg"),
  FONTCONFIG_FILE: fontConfig,
};
const args = [
  "uv",
  "run",
  "--no-project",
  "--python",
  templatePython,
  "python",
  "-B",
  "-m",
  "research.manuscript",
  ...process.argv.slice(2),
];
const child = Bun.spawn(args, { cwd: projectRoot, env, stdout: "inherit", stderr: "inherit" });
process.on("SIGINT", () => child.kill("SIGINT"));
process.exit(await child.exited);
