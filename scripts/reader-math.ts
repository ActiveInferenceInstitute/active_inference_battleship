import { expect, type Page } from "@playwright/test";

export async function assertMathHelpContained(page: Page) {
  const state = await page
    .locator('mjx-container[display="true"]:focus-within')
    .evaluate((host) => {
      const glyph = host.querySelector("mjx-help svg");
      if (!glyph) throw new Error("Focused equation information glyph is missing");
      return {
        host: host.getBoundingClientRect().toJSON(),
        glyph: glyph.getBoundingClientRect().toJSON(),
      };
    });
  expect(state.glyph.width).toBeGreaterThan(0);
  expect(state.glyph.height).toBeGreaterThan(0);
  expect(
    state.glyph.left,
    "Complete math information glyph must fit its scroll host",
  ).toBeGreaterThanOrEqual(state.host.left);
  expect(state.glyph.right).toBeLessThanOrEqual(state.host.right);
  expect(state.glyph.top).toBeGreaterThanOrEqual(state.host.top);
  expect(state.glyph.bottom).toBeLessThanOrEqual(state.host.bottom);
  return state;
}
