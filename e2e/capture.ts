import type { Page } from "@playwright/test";

export async function capture(page: Page, path: string, fullPage = true) {
  const geometry = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    viewport: innerHeight,
    ratio: devicePixelRatio,
    y: scrollY,
  }));
  if (!fullPage) {
    await page.screenshot({ path, fullPage });
    return;
  }
  let segment = 0;
  for (let y = 0; y < geometry.height; y += Math.max(1, geometry.viewport - 200)) {
    await page.evaluate((value) => scrollTo(0, value), y);
    await page.waitForFunction(async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return true;
    });
    const skip = await page.locator(".skip-link").evaluateAll((elements) =>
      elements.map((e) => ({
        focused: e === document.activeElement,
        bottom: e.getBoundingClientRect().bottom,
      })),
    );
    for (const state of skip)
      if (!state.focused && state.bottom > 0)
        throw new Error("Unfocused skip link is visible before capture");
    await page.screenshot({ path: path.replace(/\.png$/, `-segment-${segment++}.png`) });
    if (await page.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight))
      break;
  }
  await page.evaluate((y) => scrollTo(0, y), geometry.y);
}
