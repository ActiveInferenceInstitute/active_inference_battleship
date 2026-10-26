import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { externalEnvironment, projectRoot, vaultRoot } from "./paths";

const template =
  process.env["TEMPLATE_ROOT"] ?? join(vaultRoot(), "Username/docxology/Public/template");
const cache = join(vaultRoot(), "Local/cache/active-inference-battleship/manuscript");
await mkdir(cache, { recursive: true });
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
  PYTHONPATH: [template, projectRoot, process.env["PYTHONPATH"]].filter(Boolean).join(":"),
  SOFFICE: soffice,
  XDG_CACHE_HOME: join(cache, "xdg"),
  FONTCONFIG_FILE: fontConfig,
};
const args = [
  "uv",
  "run",
  "--no-project",
  "--python",
  join(template, ".venv/bin/python"),
  "python",
  "-B",
  "-m",
  "research.manuscript",
  ...process.argv.slice(2),
];
const child = Bun.spawn(args, { cwd: projectRoot, env, stdout: "inherit", stderr: "inherit" });
process.on("SIGINT", () => child.kill("SIGINT"));
process.exit(await child.exited);
