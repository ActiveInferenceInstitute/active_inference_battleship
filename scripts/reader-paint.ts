import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { externalEnvironment, projectRoot, vaultRoot } from "./paths";

export async function captureReadingFrame(
  page: Page,
  path: string,
  capture?: () => Promise<Buffer>,
) {
  await page.waitForFunction(
    async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return true;
    },
    undefined,
    { timeout: 10000 },
  );
  const expected = await page.evaluate(() => {
    if (!document.querySelector("main")) throw new Error("Missing manuscript main");
    // Title and table of contents precede main in the template's reading edition.
    const root = document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const rectangles = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      const parent = node.parentElement;
      if (!parent || parent.closest("mjx-container,script,style,noscript,[hidden],.sr-only"))
        continue;
      const style = getComputedStyle(parent);
      if (
        style.visibility !== "visible" ||
        Number(style.opacity) === 0 ||
        style.color === "rgba(0, 0, 0, 0)"
      )
        continue;
      let visible = true;
      for (let ancestor: Element | null = parent; ancestor; ancestor = ancestor.parentElement)
        if (Number(getComputedStyle(ancestor).opacity) === 0) {
          visible = false;
          break;
        }
      if (!visible) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (
          r.width < 5 ||
          r.height < 8 ||
          r.x < 0 ||
          r.y < 0 ||
          r.right > innerWidth ||
          r.bottom > innerHeight
        )
          continue;
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        if (!hit || !parent.contains(hit)) continue;
        rectangles.push({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          color: style.color,
          text: node.textContent.slice(0, 80),
        });
      }
    }
    const images = [...document.images].flatMap((image) => {
      const border = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      if (style.objectFit !== "fill" || style.transform !== "none")
        throw new Error("Unsupported transformed reading image or object fit");
      const inset = {
        left: Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.paddingLeft),
        right: Number.parseFloat(style.borderRightWidth) + Number.parseFloat(style.paddingRight),
        top: Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.paddingTop),
        bottom: Number.parseFloat(style.borderBottomWidth) + Number.parseFloat(style.paddingBottom),
      };
      // The source raster fills the content box, excluding CSS border and padding.
      const bounds = {
        x: border.x + inset.left,
        y: border.y + inset.top,
        left: border.left + inset.left,
        top: border.top + inset.top,
        right: border.right - inset.right,
        bottom: border.bottom - inset.bottom,
        width: border.width - inset.left - inset.right,
        height: border.height - inset.top - inset.bottom,
      };
      const left = Math.max(0, bounds.left),
        top = Math.max(0, bounds.top);
      const right = Math.min(innerWidth, bounds.right),
        bottom = Math.min(innerHeight, bounds.bottom);
      if (right - left < 20 || bottom - top < 20 || !image.complete || !image.naturalWidth)
        return [];
      const source = new URL(image.currentSrc, location.href);
      if (source.origin !== location.origin) throw new Error("Unbound external reading image");
      if (getComputedStyle(image).filter !== "none")
        throw new Error("Unsupported reading image filter");
      return [
        {
          source: `output/web${decodeURIComponent(source.pathname)}`,
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
          imageX: bounds.x,
          imageY: bounds.y,
          imageWidth: bounds.width,
          imageHeight: bounds.height,
        },
      ];
    });
    return {
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      y: scrollY,
      rectangles,
      images,
    };
  });
  const bytes = capture ? await capture() : await page.screenshot({ path });
  if (capture) await writeFile(path, bytes);
  const after = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, y: scrollY }));
  if (
    after.width !== expected.viewportWidth ||
    after.height !== expected.viewportHeight ||
    Math.abs(after.y - expected.y) > 0.01
  )
    throw new Error("Reader viewport changed during capture");
  return {
    path: path.slice(projectRoot.length + 1),
    ...expected,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export async function verifyReadingFrames(
  frames: Awaited<ReturnType<typeof captureReadingFrame>>[],
  name = "reader-paint",
) {
  const manifest = join(projectRoot, `output/${name}.json`);
  await writeFile(manifest, `${JSON.stringify(frames, null, 2)}\n`);
  const template =
    process.env["TEMPLATE_ROOT"] ?? join(vaultRoot(), "Username/docxology/Public/template");
  const child = Bun.spawn(
    [
      "uv",
      "run",
      "--no-project",
      "--python",
      join(template, ".venv/bin/python"),
      "python",
      "-B",
      "-m",
      "research.capture_pixels",
      manifest,
    ],
    {
      cwd: projectRoot,
      env: { ...externalEnvironment(), PYTHONPATH: projectRoot },
      stdout: "inherit",
      stderr: "inherit",
    },
  );
  const status = await child.exited;
  if (status !== 0)
    throw new Error(
      `Reader paint validation exited ${status}; retain the failed captures and inspect their recorded DOM rectangles`,
    );
}
