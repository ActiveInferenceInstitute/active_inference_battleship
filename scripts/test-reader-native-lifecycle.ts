import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect, type Page } from "@playwright/test";
import type * as MenuHelpers from "./manuscript-menus";
import { externalEnvironment, projectRoot } from "./paths";

const allowed = new Set([
  "--retain-posted-submenu",
  "--local-preference-escape",
  "--omit-render-readiness",
]);
for (const option of process.argv.slice(2))
  if (!allowed.has(option)) throw new Error(`Unknown lifecycle option: ${option}`);
const retainedSubmenu = process.argv.includes("--retain-posted-submenu");
const localEscape = process.argv.includes("--local-preference-escape");
const omitReadiness = process.argv.includes("--omit-render-readiness");
const env = externalEnvironment();
const output = await mkdtemp(join(env["TMPDIR"] ?? "", "reader-native-lifecycle-"));
let helpers: typeof MenuHelpers;
if (omitReadiness) {
  const original = await Bun.file(join(projectRoot, "scripts/manuscript-menus.ts")).text();
  const target = "await waitForNativeMathRender(page);";
  if (original.split(target).length !== 2)
    throw new Error("Readiness mutation target is not unique");
  const mutated = original
    .replace(target, "/* Readiness omitted by isolated negative control. */")
    .replace(
      'from "@playwright/test"',
      `from ${JSON.stringify(pathToFileURL(join(projectRoot, "node_modules/@playwright/test/index.mjs")).href)}`,
    );
  const copy = join(output, "menus-without-readiness.ts");
  await Bun.write(copy, mutated);
  helpers = (await import(pathToFileURL(copy).href)) as typeof MenuHelpers;
} else helpers = await import("./manuscript-menus");
const {
  checkClearSpeakPreferences,
  checkMenus,
  checkPreferenceEscapeOutside,
  openClearSpeakMenu,
  waitForReader,
} = helpers;
const context = await chromium.launchPersistentContext(join(output, "chrome"), {
  channel: "chrome",
  headless: true,
  viewport: { width: 390, height: 1000 },
  env: { ...env, TMPDIR: output, XDG_CACHE_HOME: join(output, "cache") },
});
const page = await context.newPage();
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));
const result = {
  retainedSubmenu,
  localEscape,
  omitReadiness,
  browser: context.browser()?.version(),
  configurations: [] as unknown[],
  completed: false,
  errors,
  failure: null as string | null,
  diagnostics: null as unknown,
};

type NativeMenu = {
  _html?: HTMLElement;
  frame: HTMLElement;
  mathItem: { math: string } | null;
  widgets: object[];
  items: { submenu?: NativeMenu }[];
  isPosted(): boolean;
  dynamicSubmenus(): void;
  findID(...names: string[]): { submenu: NativeMenu };
};

await page.addInitScript(() => {
  const events: unknown[] = [];
  const identities = new WeakMap<Element, number>();
  let identity = 0;
  const snapshot = () => {
    const engine = Reflect.get(window, "MathJax") as
      | { startup?: { document?: { menu?: { menu?: NativeMenu } } } }
      | undefined;
    const menu = engine?.startup?.document?.menu?.menu;
    return {
      active: document.activeElement?.outerHTML.slice(0, 1200),
      dialogs: [...document.querySelectorAll('.CtxtMenu_Info[role="dialog"]')].map((dialog) => {
        if (!identities.has(dialog)) identities.set(dialog, ++identity);
        return {
          identity: identities.get(dialog),
          containsActive: dialog.contains(document.activeElement),
        };
      }),
      native: menu
        ? {
            posted: menu.isPosted(),
            frameConnected: menu.frame?.isConnected,
            widgetCount: menu.widgets.length,
            expression: menu.mathItem?.math,
          }
        : null,
    };
  };
  for (const type of ["keydown", "keyup", "focusin", "focusout", "mousedown"])
    document.addEventListener(
      type,
      (event) => {
        const key = event instanceof KeyboardEvent ? event.key : null;
        if (key && !["Escape", "Tab", " "].includes(key)) return;
        events.push({
          type,
          key,
          at: performance.now(),
          path: event
            .composedPath()
            .slice(0, 8)
            .map((node) => (node instanceof Element ? node.tagName : node.constructor.name)),
          ...snapshot(),
        });
        if (events.length > 600) events.shift();
      },
      true,
    );
  Reflect.set(window, "battleshipNativeProbe", { events, snapshot });
});

if (retainedSubmenu || localEscape)
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    const original = await response.text();
    let body = original;
    if (retainedSubmenu) {
      const updated = body.replace(
        /\/\* Dynamic submenu replacement: begin \*\/[\s\S]*?\/\* Dynamic submenu replacement: end \*\//,
        "complete(submenu);",
      );
      if (updated === body) throw new Error("Native submenu control target missing");
      body = updated;
    }
    if (localEscape) {
      const updated = body.replace(
        "if (event.key !== 'Escape') return;",
        "if (event.key !== 'Escape') return;\n    if (!(event.target instanceof Element) || !event.target.closest('.CtxtMenu_Selection')) return;",
      );
      if (updated === body) throw new Error("Preference Escape control target missing");
      body = updated;
    }
    await route.fulfill({ response, body });
  });

async function replacePostedSubmenu(page: Page) {
  await openClearSpeakMenu(page);
  await page.evaluate(() => {
    const engine = Reflect.get(window, "MathJax") as {
      startup: { document: { menu: { menu: NativeMenu } } };
    };
    const menu = engine.startup.document.menu.menu;
    const parent = menu.findID("Speech", "Clearspeak");
    const previous = parent.submenu;
    if (!previous.isPosted() || !previous._html?.isConnected)
      throw new Error("A real posted submenu is required");
    Reflect.set(window, "battleshipNativeReplacement", {
      parent,
      previous,
      expression: menu.mathItem,
    });
    menu.dynamicSubmenus();
  });
  await page.waitForFunction(() => {
    const state = Reflect.get(window, "battleshipNativeReplacement") as {
      parent: { submenu: NativeMenu };
      previous: NativeMenu;
    };
    return state.parent.submenu !== state.previous;
  });
  const state = await page.evaluate(() => {
    const audit = Reflect.get(window, "battleshipNativeReplacement") as {
      parent: { submenu: NativeMenu };
      previous: NativeMenu;
      expression: object;
    };
    const engine = Reflect.get(window, "MathJax") as {
      startup: { document: { menu: { menu: NativeMenu } } };
    };
    const menu = engine.startup.document.menu.menu;
    return {
      previousPosted: audit.previous.isPosted(),
      previousConnected: audit.previous._html?.isConnected,
      currentPosted: audit.parent.submenu.isPosted(),
      currentConnected: audit.parent.submenu._html?.isConnected,
      sameExpression: menu.mathItem === audit.expression,
    };
  });
  expect(state.previousPosted).toBe(false);
  expect(state.previousConnected).toBe(false);
  expect(state.currentPosted).toBe(true);
  expect(state.currentConnected).toBe(true);
  expect(state.sameExpression).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(".CtxtMenu_ContextMenu")).toHaveCount(0);
  return state;
}

async function checkQueuedNativeReadiness(page: Page) {
  await page.evaluate(() => {
    const engine = Reflect.get(window, "MathJax") as {
      whenReady(callback: () => unknown): Promise<unknown>;
    };
    const original = engine.whenReady;
    let release: () => void = () => {
      throw new Error("Native queue release is not initialized");
    };
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const state = { entered: false, calls: 0, release, original };
    Reflect.set(window, "battleshipNativeQueueGate", state);
    original(() => {
      state.entered = true;
      return gate;
    });
    engine.whenReady = (callback) => {
      state.calls++;
      return original(callback);
    };
  });
  await page.waitForFunction(() => Reflect.get(window, "battleshipNativeQueueGate").entered);
  const spaceCount = () =>
    page.evaluate(() => {
      const probe = Reflect.get(window, "battleshipNativeProbe") as {
        events: { type: string; key: string | null }[];
      };
      return probe.events.filter((event) => event.type === "keydown" && event.key === " ").length;
    });
  const before = await spaceCount();
  const opening: Promise<{ ok: true } | { ok: false; error: unknown }> = openClearSpeakMenu(
    page,
  ).then(
    () => ({ ok: true }),
    (error) => ({ ok: false, error }),
  );
  try {
    await page.waitForFunction((baseline) => {
      const gate = Reflect.get(window, "battleshipNativeQueueGate") as { calls: number };
      const probe = Reflect.get(window, "battleshipNativeProbe") as {
        events: { type: string; key: string | null }[];
      };
      return (
        gate.calls > 0 ||
        probe.events.filter((event) => event.type === "keydown" && event.key === " ").length >
          baseline
      );
    }, before);
    expect(await spaceCount()).toBe(before);
  } finally {
    await page.evaluate(() => {
      const gate = Reflect.get(window, "battleshipNativeQueueGate") as {
        release(): void;
        original: (callback: () => unknown) => Promise<unknown>;
      };
      gate.release();
      Reflect.set(Reflect.get(window, "MathJax"), "whenReady", gate.original);
    });
  }
  const opened = await opening;
  if (!opened.ok) throw opened.error;
  await page.keyboard.press("Escape");
  await expect(page.locator(".CtxtMenu_ContextMenu")).toHaveCount(0);
  return { noPrematureSpace: true };
}

try {
  for (const width of [390, 1440, 1920])
    for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto(process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196", {
        waitUntil: "networkidle",
      });
      await waitForReader(page);
      const readiness = await checkQueuedNativeReadiness(page);
      const replacement = await replacePostedSubmenu(page);
      // Exercise the scope control before unrelated preference changes can re-render math.
      if (localEscape) await checkPreferenceEscapeOutside(page);
      const menus = await checkMenus(page, async () => {});
      const preferences = [];
      for (let cycle = 0; cycle < (width === 390 ? 5 : 2); cycle++) {
        preferences.push(await checkClearSpeakPreferences(page));
        expect(preferences.at(-1)?.escapeKeys).toBe(1);
      }
      const escapedOutside = await checkPreferenceEscapeOutside(page);
      expect(errors).toEqual([]);
      result.configurations.push({
        width,
        theme,
        readiness,
        replacement,
        menuStates: menus.paths.length,
        preferences,
        escapedOutside,
      });
      console.log(
        JSON.stringify({ width, theme, cycles: preferences.length, errors: errors.length }),
      );
    }
  result.completed = true;
} catch (error) {
  result.failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  throw error;
} finally {
  // A failed page can also prevent diagnostics; preserve the original test failure.
  try {
    result.diagnostics = await page.evaluate(() => {
      const probe = Reflect.get(window, "battleshipNativeProbe") as {
        snapshot(): object;
        events: unknown[];
      };
      return {
        ...probe.snapshot(),
        events: probe.events,
        contextMenus: [...document.querySelectorAll(".CtxtMenu_ContextMenu")].map(
          (element) => element.outerHTML,
        ),
      };
    });
  } catch (error) {
    result.diagnostics = { unavailable: error instanceof Error ? error.message : String(error) };
  }
  const receipt = join(output, "results.json");
  await Bun.write(receipt, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ receipt, completed: result.completed, errors: errors.length }));
  await context.close();
}
