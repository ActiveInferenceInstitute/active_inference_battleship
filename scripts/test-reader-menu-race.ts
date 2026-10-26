import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkClearSpeakPreferences } from "./manuscript-menus";
import { externalEnvironment, projectRoot } from "./paths";

const env = externalEnvironment();
const out = await mkdtemp(join(env["TMPDIR"] ?? "", "reader-menu-race-"));
const unprotected = process.argv.includes("--unprotected");
const readonlyContext = process.argv.includes("--readonly-context");
const legacyPreferences = process.argv.includes("--legacy-preferences-layout");
const legacyHeader = process.argv.includes("--legacy-preferences-header");
const omitReference = process.argv.includes("--omit-reference");
const omitFigure = process.argv.includes("--omit-figure");
const options = new Set([
  "--unprotected",
  "--readonly-context",
  "--legacy-preferences-layout",
  "--legacy-preferences-header",
  "--omit-reference",
  "--omit-figure",
]);
for (const option of process.argv.slice(2))
  if (!options.has(option)) throw new Error(`Unknown reader race option: ${option}`);
const bibliography = Bun.spawnSync(
  ["pandoc", join(projectRoot, "manuscript/references.bib"), "-f", "biblatex", "-t", "csljson"],
  { env },
);
if (bibliography.exitCode !== 0 || bibliography.stderr.toString().trim())
  throw new Error(`Bibliography parser failed: ${bibliography.stderr}`);
const entries: { id: string }[] = JSON.parse(bibliography.stdout.toString());
const expectedReferences = entries.length;
if (!expectedReferences || new Set(entries.map((entry) => entry.id)).size !== expectedReferences)
  throw new Error("Empty or duplicate authored bibliography inventory");
const sections = (await readdir(join(projectRoot, "manuscript"))).filter((name) =>
  /^\d\d_.*\.md$/.test(name),
);
const expectedImages = (
  await Promise.all(sections.map((name) => readFile(join(projectRoot, "manuscript", name), "utf8")))
).reduce((count, source) => count + [...source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].length, 0);
if (!expectedImages) throw new Error("Empty authored figure inventory");

import { chromium } from "@playwright/test";

const context = await chromium.launchPersistentContext(join(out, "root-repro-profile"), {
  channel: "chrome",
  headless: true,
  viewport: { width: 390, height: 1000 },
  env: { ...env, TMPDIR: out, XDG_CACHE_HOME: join(out, "chrome-cache") },
});
const log = {
  unprotected,
  readonlyContext,
  legacyPreferences,
  legacyHeader,
  omitReference,
  omitFigure,
  expectedReferences,
  expectedImages,
  browser: context.browser()?.version(),
  configurations: [] as unknown[],
  errors: [] as {
    phase: string;
    message: string;
    stack: string | undefined;
    url: string;
    at: string;
  }[],
  completed: false,
  failure: null as string | null,
  scope: "Fresh DOM and keyboard probes only; no screenshot capture or candidate writes",
};
const page = context.pages()[0] || (await context.newPage());
if (unprotected || readonlyContext) {
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    const original = await response.text();
    const body = unprotected
      ? original.replace(
          / {4}\/\* Native ClearSpeak adapter: begin \*\/[\s\S]*? {4}\/\* Native ClearSpeak adapter: end \*\//,
          "",
        )
      : original.replace("{mathItem: {value: item, writable: true}}", "{mathItem: {value: item}}");
    if (body === original) throw new Error("Lifetime negative-control target missing");
    await route.fulfill({ response, body });
  });
}
let phase = "start";
page.on("pageerror", (e) => {
  log.errors.push({
    phase,
    message: e.message,
    stack: e.stack,
    url: page.url(),
    at: new Date().toISOString(),
  });
  console.log("PAGEERROR", JSON.stringify(log.errors.at(-1)));
});
function assert(v: unknown, m: string): asserts v {
  if (!v) throw new Error(m);
}
try {
  for (const width of [390, 1440, 1920])
    for (const theme of ["light", "dark"] as const) {
      phase = `resize ${width} ${theme}`;
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      phase = `navigate ${width} ${theme}`;
      await page.goto(process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196", {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      await page.waitForFunction(
        async () => {
          const m = Reflect.get(window, "MathJax") as
            | { startup?: { promise?: Promise<unknown> } }
            | undefined;
          if (!m?.startup?.promise) return false;
          await m.startup.promise;
          await Reflect.get(window, "templateMathJaxReflowPromise");
          await Reflect.get(window, "battleshipMathMenuReady");
          await document.fonts.ready;
          return document.querySelectorAll("mjx-container").length > 10;
        },
        undefined,
        { timeout: 30000 },
      );
      if (legacyPreferences)
        await page.addStyleTag({
          content: `
        .CtxtMenu_Info.CtxtMenu_Selection {width:196px !important;}
        .CtxtMenu_SelectionBox {display:block !important;}
        .CtxtMenu_SelectionDivider {display:block !important;width:1050px !important;height:124px !important;}
        .CtxtMenu_SelectionMenu {float:left !important;width:169px !important;height:124px !important;}
        .CtxtMenu_SelectionMenu > .CtxtMenu_MenuItem {min-height:20px !important;font-size:12px !important;padding:0 32px !important;line-height:20px !important;}
      `,
        });
      if (legacyHeader)
        await page.addStyleTag({
          content: ".CtxtMenu_SelectionBox {position:static!important;z-index:auto!important;}",
        });
      if (omitReference)
        await page
          .locator("#refs .csl-entry")
          .first()
          .evaluate((node) => node.remove());
      if (omitFigure)
        await page
          .locator("figure")
          .first()
          .evaluate((node) => node.remove());
      const state = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodySize: getComputedStyle(document.body).fontSize,
        background: getComputedStyle(document.body).backgroundColor,
        foreground: getComputedStyle(document.body).color,
        math: document.querySelectorAll("mjx-container").length,
        mathErrors: document.querySelectorAll("mjx-merror").length,
        references: document.querySelectorAll("#refs .csl-entry").length,
        landmarks: [...document.querySelectorAll("main,nav,header")].map((e) => ({
          tag: e.tagName,
          id: e.id,
          label: e.getAttribute("aria-label"),
        })),
        images: [...document.images].map((i) => {
          const s = getComputedStyle(i),
            b = i.getBoundingClientRect();
          const w =
              b.width -
              parseFloat(s.borderLeftWidth) -
              parseFloat(s.borderRightWidth) -
              parseFloat(s.paddingLeft) -
              parseFloat(s.paddingRight),
            h =
              b.height -
              parseFloat(s.borderTopWidth) -
              parseFloat(s.borderBottomWidth) -
              parseFloat(s.paddingTop) -
              parseFloat(s.paddingBottom);
          return {
            src: i.getAttribute("src"),
            alt: i.alt,
            complete: i.complete,
            width: w,
            height: h,
            naturalWidth: i.naturalWidth,
            naturalHeight: i.naturalHeight,
            aspectError: Math.abs(w / h - i.naturalWidth / i.naturalHeight),
          };
        }),
        opening: [
          "graphical-overview",
          "visual-model",
          "visual-play",
          "visual-decisions",
          "TOC",
          "abstract",
        ].map((id) => {
          const e = document.getElementById(id);
          if (!e) throw new Error(`Missing opening section: ${id}`);
          const b = e.getBoundingClientRect();
          return { id, top: b.top + scrollY, bottom: b.bottom + scrollY };
        }),
      }));
      const entry: {
        width: number;
        theme: string;
        state: typeof state;
        keyboard?: unknown;
        fullSize?: unknown;
        menu?: unknown;
      } = { width, theme, state };
      log.configurations.push(entry);
      assert(state.scrollWidth <= width, "Horizontal primary content overflow");
      assert(
        state.references === expectedReferences &&
          state.images.length === expectedImages &&
          state.mathErrors === 0,
        "Document content differs from the authored bibliography or figure inventory",
      );
      for (const i of state.images)
        assert(
          i.complete && i.naturalWidth > 0 && i.alt && i.aspectError < 0.02,
          "Missing/described/distorted image",
        );
      for (let i = 1; i < state.opening.length; i++) {
        const previous = state.opening[i - 1],
          current = state.opening[i];
        assert(previous && current, "Incomplete opening order");
        assert(current.top >= previous.bottom - 1, "Wrong opening reading order");
      }
      const targets = await page
        .locator('a[href],mjx-container,.table-scroll[tabindex="0"]')
        .evaluateAll((es) =>
          es
            .filter((e) => e.getBoundingClientRect().width > 0)
            .map((e) => ({
              tag: e.tagName,
              text: e.textContent?.trim(),
              href: e.getAttribute("href"),
            })),
        );
      let mathCount = 0;
      const focused = [];
      phase = `keyboard ${width} ${theme}`;
      for (const target of targets) {
        await page.keyboard.press("Tab");
        const actual = await page.evaluate(() => {
          const a = document.activeElement;
          const e = a?.closest("mjx-container") ?? a;
          return {
            tag: e?.tagName,
            text: e?.textContent?.trim(),
            href: e?.getAttribute("href"),
            visible: a?.matches(":focus-visible"),
            outline: a ? getComputedStyle(a).outlineWidth : null,
          };
        });
        assert(
          actual.tag === target.tag && actual.text === target.text && actual.href === target.href,
          "Focus order mismatch",
        );
        if (target.tag === "MJX-CONTAINER") {
          mathCount++;
          const focus = await page.evaluate(() => {
            const a = document.activeElement;
            const s = a?.closest("mjx-container")?.querySelector(".mjx-selected");
            if (!a || !s) throw new Error("Missing focused mathematical expression");
            const c = getComputedStyle(s);
            return {
              visible: a.matches(":focus-visible"),
              tag: a.tagName,
              color: c.color,
              background: c.backgroundColor,
              outline: c.outlineWidth,
              outlineColor: c.outlineColor,
            };
          });
          assert(
            focus.visible && focus.tag === "MJX-SPEECH" && parseFloat(focus.outline) >= 2,
            "Math keyboard focus missing",
          );
          focused.push(focus);
        }
      }
      assert(mathCount === state.math, "Incomplete math keyboard traversal");
      entry.keyboard = { targets: targets.length, mathCount, focused };
      phase = `fullsize ${width} ${theme}`;
      const first = page.locator("a.figure-full-size-link").first();
      const href = await first.getAttribute("href");
      assert(href, "No full size URL");
      await first.focus();
      const popupWait = page.waitForEvent("popup");
      await page.keyboard.press("Enter");
      const popup = await popupWait;
      await popup.waitForLoadState("load");
      assert(popup.url().endsWith("/figures/graphical-abstract.png"), "Wrong full-size popup URL");
      entry.fullSize = {
        url: popup.url(),
        image: await popup.locator("img").evaluate((i) => {
          if (!(i instanceof HTMLImageElement)) throw new Error("Expected full-size image");
          return { width: i.naturalWidth, height: i.naturalHeight };
        }),
      };
      await popup.close();
      await page.waitForFunction(() => document.querySelectorAll("mjx-container").length > 10);

      // Delay only delivery of a completed real speech-worker response.
      await page.evaluate(() => {
        type Pool = {
          getLocalePreferences: (map: unknown) => Promise<unknown>;
          getRelevantPreferences: (...args: unknown[]) => Promise<unknown>;
        };
        const engine = Reflect.get(window, "MathJax") as {
          startup: { document: { math: Iterable<{ generatorPool: Pool }> } };
        };
        const item = Array.from(engine.startup.document.math)[0];
        if (!item) throw new Error("No real speech generator");
        const pool = item.generatorPool;
        const locale = pool.getLocalePreferences;
        const relevant = pool.getRelevantPreferences;
        let release = () => {};
        const hold = new Promise<void>((resolve) => {
          release = resolve;
        });
        const gate = { ready: false, finished: false, release: () => release() };
        Reflect.set(window, "readerSpeechGate", gate);
        pool.getLocalePreferences = async function (map) {
          const result = await locale.call(this, map);
          gate.ready = true;
          await hold;
          return result;
        };
        pool.getRelevantPreferences = async function (...args) {
          try {
            return await relevant.apply(this, args);
          } finally {
            gate.finished = true;
          }
        };
      });
      phase = `menu ${width} ${theme}`;
      await page.locator("mjx-container").first().focus();
      await page.keyboard.press("Space");
      await page.locator('[role="menu"]').first().waitFor();
      await page.waitForFunction(() => Reflect.get(window, "readerSpeechGate")?.ready, undefined, {
        timeout: 30000,
      });
      const menu = {
        afterRight: 0,
        dismissed: false,
        opened: await page.locator('[role="menu"]').count(),
        tree: await page.locator('[role="menu"]').first().ariaSnapshot(),
      };
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowRight");
      menu.afterRight = await page.locator('[role="menu"]').count();
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("Escape");
      assert((await page.locator('[role="menu"]').count()) === 0, "Escape failed to dismiss menu");

      await page.evaluate(() => {
        const gate = Reflect.get(window, "readerSpeechGate") as { release: () => void };
        gate.release();
      });
      await Promise.race([
        page.waitForFunction(() => Reflect.get(window, "readerSpeechGate")?.finished, undefined, {
          timeout: 30000,
        }),
        page.waitForEvent("pageerror", { timeout: 30000 }).then((error) => {
          throw error;
        }),
      ]);
      menu.dismissed = true;
      entry.menu = menu;
      phase = `preferences ${width} ${theme}`;
      await checkClearSpeakPreferences(page);
      console.log(
        JSON.stringify({
          width,
          theme,
          mathCount,
          targets: targets.length,
          fullSize: true,
          menu: true,
        }),
      );
    }
  assert(log.errors.length === 0, "Page errors");
  log.completed = true;
} catch (e) {
  log.failure = String(e);
  throw e;
} finally {
  await writeFile(join(out, "results.json"), JSON.stringify(log, null, 2) + "\n");
  await context.close();
  console.log(
    JSON.stringify({
      receipt: join(out, "results.json"),
      unprotected,
      readonlyContext,
      legacyPreferences,
      legacyHeader,
      completed: log.completed ?? false,
      errors: log.errors.length,
    }),
  );
}
