import { expect, type Page } from "@playwright/test";

/** Measure decoded figures, never an unfinished or broken image's 0/0 ratio. */
export async function inspectReadyFigures(page: Page, expected: number) {
  await expect(page.locator("figure img")).toHaveCount(expected);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("figure img")].every(
        (image) => image instanceof HTMLImageElement && image.complete,
      ),
    undefined,
    { timeout: 30000 },
  );
  const images = await page.locator("figure img").evaluateAll(async (elements) =>
    Promise.all(
      elements.map(async (element) => {
        if (!(element instanceof HTMLImageElement)) throw new Error("Unexpected figure element");
        try {
          await element.decode();
        } catch (error) {
          throw new Error(`Figure could not decode: ${element.currentSrc}`, { cause: error });
        }
        const bounds = element.getBoundingClientRect(),
          style = getComputedStyle(element);
        const width =
          bounds.width -
          Number.parseFloat(style.borderLeftWidth) -
          Number.parseFloat(style.borderRightWidth) -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight);
        const height =
          bounds.height -
          Number.parseFloat(style.borderTopWidth) -
          Number.parseFloat(style.borderBottomWidth) -
          Number.parseFloat(style.paddingTop) -
          Number.parseFloat(style.paddingBottom);
        return {
          source: element.currentSrc,
          complete: element.complete,
          width,
          height,
          naturalWidth: element.naturalWidth,
          naturalHeight: element.naturalHeight,
          difference: Math.abs(width / height - element.naturalWidth / element.naturalHeight),
        };
      }),
    ),
  );
  for (const image of images) {
    for (const value of [image.width, image.height, image.naturalWidth, image.naturalHeight]) {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThan(0);
    }
    expect(image.difference).toBeLessThan(0.02);
  }
  return images;
}
