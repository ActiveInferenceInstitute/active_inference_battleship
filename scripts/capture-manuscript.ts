import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium, expect, type Page } from "@playwright/test";
import { waitForReader } from "./manuscript-menus";
import { externalEnvironment, projectRoot } from "./paths";
import { inspectReadyFigures } from "./reader-images";
import { assertMathHelpContained } from "./reader-math";
import { captureReadingFrame, verifyReadingFrames } from "./reader-paint";
import { assertAllTableReadingOrigins, checkAndResetTableScroll } from "./reader-table";

if (await Bun.file(join(projectRoot, "output/html-captures.json")).exists())
  throw new Error("Preserve the accepted reader manifest before recapturing");
const env = externalEnvironment();
const manuscriptSections = (await readdir(join(projectRoot, "manuscript"))).filter((name) =>
  /^\d\d_.*\.md$/.test(name),
);
const expectedFigures = (
  await Promise.all(
    manuscriptSections.map((name) => readFile(join(projectRoot, "manuscript", name), "utf8")),
  )
).reduce((count, content) => count + [...content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].length, 0);
const profile = await mkdtemp(join(env["TMPDIR"] ?? "", "manuscript-chrome-"));
const output = join(projectRoot, "output/qa/html");
await mkdir(output, { recursive: true });
const context = await chromium.launchPersistentContext(profile, {
  channel: "chrome",
  headless: true,
  env,
  viewport: { width: 1440, height: 1000 },
});
const captures: { path: string; sha256: string; width: number; theme: string; y: number }[] = [];
const paintFrames: Awaited<ReturnType<typeof captureReadingFrame>>[] = [];
let completed = false;
let failure: string | null = null;
const checks = [];
const interactionChecks = [];
const labelChecks = [];
const negativeControls = [];
const printChecks = [];
const mathFocusChecks: {
  theme: string;
  mode: string;
  width: number;
  targets: number;
  expressions: Awaited<ReturnType<typeof inspectMath>>[];
  afterBlur: { foreground: string; background: string; page: string }[];
}[] = [];
const errors: string[] = [];
function contrast(first: string, second: string): number {
  const luminance = (color: string) => {
    const channels = color
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number);
    if (channels?.length !== 3) throw new Error(`Unsupported color: ${color}`);
    const linear = channels.map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return (linear[0] ?? 0) * 0.2126 + (linear[1] ?? 0) * 0.7152 + (linear[2] ?? 0) * 0.0722;
  };
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
function assertReadableLabels(labels: { size: number; color: string; background: string }[]): void {
  expect(labels).toHaveLength(expectedFigures);
  for (const label of labels) {
    expect(contrast(label.color, label.background)).toBeGreaterThanOrEqual(4.5);
    expect(label.size).toBeGreaterThanOrEqual(15);
  }
}
function composite(color: string, background: string): string {
  const foreground = color.match(/[\d.]+/g)?.map(Number);
  const under = background.match(/[\d.]+/g)?.map(Number);
  if (!foreground || !under || ![3, 4].includes(foreground.length) || under.length !== 3)
    throw new Error(`Unsupported focus colors: ${color}, ${background}`);
  const alpha = foreground[3] ?? 1;
  return `rgb(${foreground
    .slice(0, 3)
    .map((value, index) => {
      const channel = under[index];
      if (channel === undefined) throw new Error("Missing background channel");
      return value * alpha + channel * (1 - alpha);
    })
    .join(", ")})`;
}
async function inspectMath(page: Page) {
  const state = await page.evaluate(() => {
    const active = document.activeElement;
    const host = active?.closest("mjx-container");
    const selected = host?.querySelector(".mjx-selected");
    if (!active || !host || !selected)
      throw new Error("Keyboard focus has no selected math expression");
    const style = getComputedStyle(selected);
    return {
      kind: host.getAttribute("display") === "true" ? "display" : "inline",
      text: host.textContent,
      activeTag: active.tagName,
      focusVisible: active.matches(":focus-visible"),
      foreground: style.color,
      background: style.backgroundColor,
      outline: style.outlineColor,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      page: getComputedStyle(document.body).backgroundColor,
    };
  });
  const effectiveBackground = composite(state.background, state.page);
  return {
    ...state,
    effectiveBackground,
    textContrast: contrast(state.foreground, effectiveBackground),
    ringContrast: contrast(state.outline, state.page),
  };
}
function assertReadableMath(state: Awaited<ReturnType<typeof inspectMath>>): void {
  expect(state.activeTag).toBe("MJX-SPEECH");
  expect(state.focusVisible).toBe(true);
  expect(state.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(state.textContrast).toBeGreaterThanOrEqual(4.5);
  expect(state.ringContrast).toBeGreaterThanOrEqual(3);
}
try {
  const page = context.pages()[0] ?? (await context.newPage());
  const record = async (name: string, theme: string, width: number) => {
    const path = join(output, `${name}.png`);
    paintFrames.push(await captureReadingFrame(page, path));
    captures.push({
      path: path.slice(projectRoot.length + 1),
      theme,
      width,
      y: await page.evaluate(() => scrollY),
      sha256: createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    });
  };
  const checkMathKeyboard = async (theme: string, width: number, mode: string) => {
    const targets = await page
      .locator('a[href],mjx-container,.table-scroll[tabindex="0"]')
      .evaluateAll((elements) =>
        elements
          .filter((element) => element.getBoundingClientRect().width > 0)
          .map((element) => ({
            tag: element.tagName,
            text: element.textContent?.trim(),
            href: element.getAttribute("href"),
          })),
      );
    const expectedMath = await page.locator("mjx-container").count();
    const entry: (typeof mathFocusChecks)[number] = {
      theme,
      width,
      mode,
      targets: targets.length,
      expressions: [],
      afterBlur: [],
    };
    mathFocusChecks.push(entry);
    const kinds = new Set<string>();
    for (const target of targets) {
      await page.keyboard.press("Tab");
      const actual = await page.evaluate(() => {
        const active = document.activeElement;
        const element = active?.closest("mjx-container") ?? active;
        if (!element) throw new Error("Keyboard traversal lost its active element");
        return {
          tag: element.tagName,
          text: element.textContent?.trim(),
          href: element.getAttribute("href"),
        };
      });
      expect(actual).toEqual(target);
      if (actual.tag !== "MJX-CONTAINER") continue;
      const state = await inspectMath(page);
      entry.expressions.push(state);
      if (!kinds.has(state.kind)) {
        await page.evaluate(() =>
          document.activeElement?.closest("mjx-container")?.scrollIntoView({ block: "center" }),
        );
        await record(
          `math-${mode}-${state.kind}-${theme}-${width}`,
          `${theme}-${mode}-math-${state.kind}`,
          width,
        );
        kinds.add(state.kind);
      }
      assertReadableMath(state);
      if (state.kind === "display") await assertMathHelpContained(page);
      if (
        mode === "screen" &&
        width === 390 &&
        theme === "dark" &&
        entry.expressions.length === 1
      ) {
        const old = await page.addStyleTag({
          content:
            "mjx-container .mjx-selected {color:black!important;background-color:rgba(0,0,255,0.2)!important;outline-color:black!important}",
        });
        const bad = await inspectMath(page);
        let rejection: string | null = null;
        try {
          assertReadableMath(bad);
        } catch (error) {
          rejection = String(error);
        }
        expect(rejection).not.toBeNull();
        negativeControls.push({
          name: "old dark focused math",
          rejected: true,
          rejection,
          state: bad,
        });
        await old.evaluate((element) => element.parentNode?.removeChild(element));
        assertReadableMath(await inspectMath(page));
      }
    }
    expect(entry.expressions).toHaveLength(expectedMath);
    expect([...kinds].sort()).toEqual(["display", "inline"]);
    if (mode === "screen" && width === 390 && theme === "dark") {
      await page.locator('mjx-container[display="true"]').first().focus();
      await assertMathHelpContained(page);
      const oldGlyph = await page.addStyleTag({
        content: 'mjx-container[display="true"] mjx-help {top:-20px!important}',
      });
      let rejection: string | null = null;
      try {
        await assertMathHelpContained(page);
      } catch (error) {
        rejection = String(error);
      }
      expect(rejection).not.toBeNull();
      negativeControls.push({
        name: "clipped equation information glyph",
        rejected: true,
        rejection,
      });
      await oldGlyph.evaluate((element) => element.parentNode?.removeChild(element));
      await assertMathHelpContained(page);
    }
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    });
    entry.afterBlur = await page.locator("mjx-container mjx-math").evaluateAll((elements) =>
      elements.map((element) => ({
        foreground: getComputedStyle(element).color,
        background: getComputedStyle(element).backgroundColor,
        page: getComputedStyle(document.body).backgroundColor,
      })),
    );
    expect(entry.afterBlur).toHaveLength(expectedMath);
    for (const math of entry.afterBlur)
      expect(
        contrast(math.foreground, composite(math.background, math.page)),
      ).toBeGreaterThanOrEqual(4.5);
    console.log(
      JSON.stringify({
        mathKeyboard: {
          theme,
          width,
          mode,
          expressions: entry.expressions.length,
          targets: targets.length,
        },
      }),
    );
  };
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196", {
        waitUntil: "networkidle",
      });
      await page.waitForFunction(() => document.querySelectorAll("mjx-container").length > 10);
      await waitForReader(page);
      await page.evaluate(() => document.fonts.ready);
      const imageAspects = await inspectReadyFigures(page, expectedFigures);
      console.log(JSON.stringify({ figureReadiness: { width, theme, images: imageAspects } }));
      const bibliography: unknown = JSON.parse(
        await readFile(join(projectRoot, "output/bibliography.json"), "utf8"),
      );
      if (!Array.isArray(bibliography) || bibliography.length === 0)
        throw new Error("Missing parsed manuscript bibliography");
      await expect(page.locator("#refs .csl-entry")).toHaveCount(bibliography.length);
      const openingOrder = await page.evaluate(() => {
        const ids = [
          "graphical-overview",
          "visual-model",
          "visual-play",
          "visual-decisions",
          "TOC",
          "abstract",
        ];
        return ids.map((id) => {
          const node = document.getElementById(id);
          if (!node) throw new Error(`Missing illustrated opening target: ${id}`);
          return {
            id,
            top: node.getBoundingClientRect().top + scrollY,
            bottom: node.getBoundingClientRect().bottom + scrollY,
          };
        });
      });
      for (let index = 1; index < openingOrder.length; index++) {
        const previous = openingOrder[index - 1],
          current = openingOrder[index];
        if (!previous || !current) throw new Error("Incomplete opening-order check");
        expect(current.top).toBeGreaterThanOrEqual(previous.bottom - 1);
      }
      interactionChecks.push({ width, theme, openingOrder });
      const state = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
        math: document.querySelectorAll("mjx-container").length,
        failedImages: [...document.images]
          .filter((i) => !i.complete || !i.naturalWidth)
          .map((i) => i.src),
        mathErrors: document.querySelectorAll("mjx-merror").length,
        table: document.querySelector("table")?.textContent,
        styles: {
          body: getComputedStyle(document.body).backgroundColor,
          text: getComputedStyle(document.body).color,
          link: getComputedStyle(document.querySelector("a") ?? document.body).color,
          bodySize: Number.parseFloat(getComputedStyle(document.body).fontSize),
          titleHyphens: getComputedStyle(document.querySelector("h1") ?? document.body).hyphens,
        },
      }));
      const title = page.locator("h1").first();
      const titleLines = async () =>
        title.evaluate(
          (e) =>
            e.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(e).lineHeight),
        );
      expect(await titleLines()).toBeLessThanOrEqual(3.05);
      if (width === 390 && theme === "light") {
        const original = await title.textContent();
        await title.evaluate((e) => {
          e.textContent = "An inspectable GNN-based active inference implementation for Battleship";
        });
        let rejected = false;
        try {
          expect(await titleLines()).toBeLessThanOrEqual(3.05);
        } catch {
          rejected = true;
        }
        expect(rejected).toBe(true);
        negativeControls.push({ titleFourLinesRejected: true });
        await title.evaluate((e, text) => {
          e.textContent = text;
        }, original);
        expect(await titleLines()).toBeLessThanOrEqual(3.05);
      }
      checks.push({ theme, titleLines: await titleLines(), ...state });
      const visibleLinkColors = () =>
        page.locator("a[href]").evaluateAll((elements) =>
          elements
            .filter((element) => {
              const bounds = element.getBoundingClientRect();
              return bounds.width > 0 && bounds.height > 0;
            })
            .map((element) => getComputedStyle(element).color),
        );
      const expectedRed = theme === "dark" ? "rgb(255, 170, 160)" : "rgb(166, 27, 27)";
      const assertRedLinks = async () => {
        const colors = await visibleLinkColors();
        expect(colors.length).toBeGreaterThan(0);
        for (const color of colors) expect(color).toBe(expectedRed);
      };
      await assertRedLinks();
      if (width === 390) {
        const blue = await page.addStyleTag({
          content: "html body a[href]{color:#185a87!important}",
        });
        let rejected = false;
        try {
          await assertRedLinks();
        } catch {
          rejected = true;
        }
        expect(rejected).toBe(true);
        negativeControls.push({ blueLinksRejected: true, theme });
        await blue.evaluate((element) => {
          if (!element.parentNode) throw new Error("Negative style control lost its parent");
          element.parentNode.removeChild(element);
        });
        await assertRedLinks();
      }
      await checkMathKeyboard(theme, width, "screen");
      expect(state.scrollWidth).toBeLessThanOrEqual(width);
      expect(state.failedImages).toEqual([]);
      expect(state.mathErrors).toBe(0);
      expect(contrast(state.styles.text, state.styles.body)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(state.styles.link, state.styles.body)).toBeGreaterThanOrEqual(4.5);
      expect(state.styles.bodySize).toBeGreaterThanOrEqual(17);
      expect(state.styles.titleHyphens).toBe("none");
      const navigationTargets = await page.locator("nav#TOC a").evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent,
          width: element.getBoundingClientRect().width,
          height: element.getBoundingClientRect().height,
          top: element.getBoundingClientRect().top,
          bottom: element.getBoundingClientRect().bottom,
        })),
      );
      for (const target of navigationTargets) {
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
      }
      for (let index = 1; index < navigationTargets.length; index++) {
        const previous = navigationTargets[index - 1];
        const current = navigationTargets[index];
        if (!previous || !current) throw new Error("Missing measured navigation target");
        expect(current.top - previous.bottom).toBeGreaterThanOrEqual(8);
      }
      interactionChecks.push({ theme, width, navigationTargets });
      const labels = () =>
        page.locator(".figure-full-size-label").evaluateAll((elements) =>
          elements.map((element) => {
            let ancestor: Element | null = element;
            let background = "rgba(0, 0, 0, 0)";
            while (ancestor && background === "rgba(0, 0, 0, 0)") {
              background = getComputedStyle(ancestor).backgroundColor;
              ancestor = ancestor.parentElement;
            }
            return {
              text: element.textContent,
              color: getComputedStyle(element).color,
              size: Number.parseFloat(getComputedStyle(element).fontSize),
              background,
            };
          }),
        );
      const labelState = await labels();
      assertReadableLabels(labelState);
      labelChecks.push({ theme, width, labelState });
      if (width === 390 && theme === "dark") {
        const badStyle = await page.addStyleTag({
          content: ".figure-full-size-label {color:#1f6f8b !important;font-size:14px !important}",
        });
        const bad = await labels();
        let rejection: string | null = null;
        try {
          assertReadableLabels(bad);
        } catch (error) {
          rejection = String(error);
        }
        expect(rejection).not.toBeNull();
        negativeControls.push({
          name: "old dark figure labels",
          rejected: true,
          rejection,
          labels: bad,
        });
        await badStyle.evaluate((element) => element.parentNode?.removeChild(element));
        expect(await labels()).toEqual(labelState);
      }
      if (width === 390) {
        const link = page.locator("nav#TOC a").first();
        await link.scrollIntoViewIfNeeded();
        await page.mouse.move(1, 1);
        const appearance = () =>
          link.evaluate((element) => ({
            background: getComputedStyle(element).backgroundColor,
            thickness: getComputedStyle(element).textDecorationThickness,
            active: element.matches(":active"),
          }));
        const rest = await appearance();
        await link.hover();
        const hover = await appearance();
        await page.mouse.down();
        const pressed = await appearance();
        expect(pressed.active).toBe(true);
        expect(hover.background).not.toBe(rest.background);
        expect(pressed.background).not.toBe(hover.background);
        interactionChecks.push({ theme, rest, hover, pressed });
        await page.mouse.move(1, 1);
        await page.mouse.up();
        for (let index = 0; index < (await page.locator(".table-scroll").count()); index++) {
          interactionChecks.push({
            theme,
            index,
            tableScroll: await checkAndResetTableScroll(page, index),
          });
        }
      }
      for (let y = 0, i = 0; y < state.height; y += 800, i++) {
        await page.evaluate((value) => scrollTo(0, value), y);
        const actualY = await page.evaluate(() => scrollY);
        await assertAllTableReadingOrigins(page);
        const path = join(output, `${theme}-${width}-${String(i).padStart(2, "0")}.png`);
        paintFrames.push(await captureReadingFrame(page, path));
        captures.push({
          path: path.slice(projectRoot.length + 1),
          width,
          theme,
          y: actualY,
          sha256: createHash("sha256")
            .update(await readFile(path))
            .digest("hex"),
        });
        if (actualY + 1000 >= state.height) break;
      }
    }
  }
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ media: "print", colorScheme: theme });
    await page.goto(process.env["MANUSCRIPT_URL"] ?? "http://127.0.0.1:5196", {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(() => document.querySelectorAll("mjx-container").length > 10);
    await waitForReader(page);
    await checkMathKeyboard(theme, 1440, "print");
    await page.evaluate(() => scrollTo(0, 0));
    const print = await page.evaluate(() => ({
      body: getComputedStyle(document.body).backgroundColor,
      colors: [...document.querySelectorAll("h1,h2,p,a,.figure-full-size-label")].map(
        (element) => ({
          color: getComputedStyle(element).color,
          background: getComputedStyle(element).backgroundColor,
          isLink: Boolean(element.closest("a[href]")),
        }),
      ),
    }));
    expect(print.body).toBe("rgb(255, 255, 255)");
    for (const element of print.colors) {
      expect(element.color).toBe(element.isLink ? "rgb(166, 27, 27)" : "rgb(0, 0, 0)");
      expect(["rgba(0, 0, 0, 0)", "rgb(255, 255, 255)"]).toContain(element.background);
    }
    const path = join(output, `${theme}-print.png`);
    paintFrames.push(await captureReadingFrame(page, path));
    captures.push({
      path: path.slice(projectRoot.length + 1),
      width: 1440,
      theme: `${theme}-print`,
      y: 0,
      sha256: createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    });
    printChecks.push({ theme, ...print });
  }
  expect(errors).toEqual([]);
  await verifyReadingFrames(paintFrames);
  completed = true;
} catch (error) {
  failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  throw error;
} finally {
  await context.close();
  await writeFile(
    join(
      projectRoot,
      completed ? "output/html-captures.json" : "output/html-captures-rejected.json",
    ),
    `${JSON.stringify({ completed, failure, checks, labelChecks, interactionChecks, negativeControls, printChecks, mathFocusChecks, errors, captures }, null, 2)}\n`,
  );
}
console.log(JSON.stringify({ configurations: checks.length, captures: captures.length, errors }));
