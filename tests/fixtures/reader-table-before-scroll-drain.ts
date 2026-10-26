import { expect, type Page } from "@playwright/test";

export async function tableReadingOrigin(page: Page, index = 0) {
  return page
    .locator(".table-scroll")
    .nth(index)
    .evaluate((element) => {
      const caption = element.querySelector("caption");
      if (!caption) throw new Error("Missing results table caption");
      const walker = document.createTreeWalker(caption, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node && !node.textContent?.trim()) node = walker.nextNode();
      if (!node?.textContent) throw new Error("Missing caption-leading text");
      const start = node.textContent.search(/\S/);
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, start + 1);
      const ink = range.getBoundingClientRect();
      const owner = element.getBoundingClientRect();
      return {
        scrollLeft: element.scrollLeft,
        ownerLeft: owner.left + element.clientLeft,
        ownerRight: owner.left + element.clientLeft + element.clientWidth,
        captionLeft: ink.left,
        captionRight: ink.right,
        glyph: node.textContent[start],
      };
    });
}

export async function assertTableReadingOrigin(page: Page, index = 0) {
  const state = await tableReadingOrigin(page, index);
  expect(state.scrollLeft, "Table must start at horizontal offset zero").toBe(0);
  expect(state.glyph).toBe("T");
  expect(state.captionLeft).toBeGreaterThanOrEqual(state.ownerLeft - 0.01);
  expect(state.captionRight).toBeLessThanOrEqual(state.ownerRight + 0.01);
  return state;
}

export async function assertAllTableReadingOrigins(page: Page) {
  const count = await page.locator(".table-scroll").count();
  expect(count).toBeGreaterThan(0);
  const states = [];
  for (let index = 0; index < count; index++)
    states.push(await assertTableReadingOrigin(page, index));
  return states;
}

export async function checkAndResetTableScroll(page: Page, index = 0) {
  const table = page.locator(".table-scroll").nth(index);
  await table.focus();
  await table.evaluate((element) => {
    element.setAttribute("data-reader-scroll-ended", "false");
    element.addEventListener(
      "scrollend",
      () => element.setAttribute("data-reader-scroll-ended", "true"),
      { once: true },
    );
  });
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => table.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect(table).toHaveAttribute("data-reader-scroll-ended", "true");
  const moved = await table.evaluate((element) => ({
    scrollLeft: element.scrollLeft,
    focus: element === document.activeElement,
    outline: getComputedStyle(element).outlineWidth,
  }));
  expect(moved.focus).toBe(true);
  expect(Number.parseFloat(moved.outline)).toBeGreaterThanOrEqual(3);
  await table.evaluate((element) => {
    element.scrollTo({ left: 0, top: element.scrollTop, behavior: "instant" });
    element.removeAttribute("data-reader-scroll-ended");
    if (!(element instanceof HTMLElement)) throw new Error("Unexpected table scroll owner");
    element.blur();
  });
  const settled = [];
  for (let frame = 0; frame < 5; frame++) {
    await page.evaluate(() => new Promise(requestAnimationFrame));
    settled.push(await assertTableReadingOrigin(page, index));
  }
  return { moved, settled };
}
