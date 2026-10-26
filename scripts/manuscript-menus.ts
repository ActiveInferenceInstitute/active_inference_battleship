import { expect, type Page } from "@playwright/test";

function ratio(color: string, background: string): number {
  const luminance = (value: string) => {
    const channels = value
      .match(/[\d.]+/g)
      ?.slice(0, 3)
      .map(Number);
    if (channels?.length !== 3) throw new Error(`Unsupported menu color: ${value}`);
    return channels.reduce((sum, channel, index) => {
      const s = channel / 255;
      return (
        sum +
        (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4) *
          ([0.2126, 0.7152, 0.0722][index] ?? 0)
      );
    }, 0);
  };
  const a = luminance(color),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export async function waitForReader(page: Page): Promise<void> {
  await page.waitForFunction(
    () => Boolean(Reflect.get(window, "MathJax")?.startup?.promise),
    undefined,
    { timeout: 30000 },
  );
  await page.waitForFunction(
    async () => {
      const engine = Reflect.get(window, "MathJax") as { startup: { promise: Promise<unknown> } };
      await engine.startup.promise;
      const reflow = Reflect.get(window, "templateMathJaxReflowPromise") as
        | Promise<unknown>
        | undefined;
      if (reflow) await reflow;
      const menuReady = Reflect.get(window, "battleshipMathMenuReady") as
        | Promise<unknown>
        | undefined;
      if (menuReady) await menuReady;
      await document.fonts.ready;
      return true;
    },
    undefined,
    { timeout: 30000, polling: 100 },
  );
}

export async function inspectMenuFocus(page: Page) {
  const state = await page.evaluate(() => {
    const active = document.activeElement;
    if (!active) throw new Error("No focused reader control");
    const style = getComputedStyle(active);
    let ancestor: Element | null = active,
      background = "rgba(0, 0, 0, 0)";
    while (ancestor && background === "rgba(0, 0, 0, 0)") {
      background = getComputedStyle(ancestor).backgroundColor;
      ancestor = ancestor.parentElement;
    }
    return {
      tag: active.tagName,
      role: active.getAttribute("role"),
      text: active.textContent,
      inControls: Boolean(active.closest(".CtxtMenu_ContextMenu,.CtxtMenu_Info")),
      visible: active.matches(":focus-visible"),
      width: Number.parseFloat(style.outlineWidth),
      style: style.outlineStyle,
      color: style.outlineColor,
      background,
      rect: active.getBoundingClientRect().toJSON(),
    };
  });
  return { ...state, contrast: ratio(state.color, state.background) };
}

export function assertMenuFocus(state: Awaited<ReturnType<typeof inspectMenuFocus>>): void {
  expect(state.inControls).toBe(true);
  expect(state.visible).toBe(true);
  expect(state.style).toBe("solid");
  expect(state.width).toBeGreaterThanOrEqual(3);
  expect(state.contrast).toBeGreaterThanOrEqual(3);
}

export async function inspectCloseTooltip(page: Page) {
  const tooltip = page.locator(".CtxtMenu_InfoClose .paper-math-tooltip");
  await expect(tooltip).toHaveCount(1);
  return tooltip.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      text: element.textContent,
      role: element.getAttribute("role"),
      visible: element.getClientRects().length > 0 && style.visibility !== "hidden",
      color: style.color,
      background: style.backgroundColor,
      size: Number.parseFloat(style.fontSize),
      rect: element.getBoundingClientRect().toJSON(),
      width: innerWidth,
      height: innerHeight,
    };
  });
}

export function assertCloseTooltip(state: Awaited<ReturnType<typeof inspectCloseTooltip>>): void {
  expect(state.visible).toBe(true);
  expect(state.role).toBe("tooltip");
  expect(state.text).toBe("Close");
  expect(state.size).toBeGreaterThanOrEqual(15);
  expect(ratio(state.color, state.background)).toBeGreaterThanOrEqual(4.5);
  expect(state.rect.left).toBeGreaterThanOrEqual(0);
  expect(state.rect.right).toBeLessThanOrEqual(state.width);
  expect(state.rect.top).toBeGreaterThanOrEqual(0);
  expect(state.rect.bottom).toBeLessThanOrEqual(state.height);
}

export async function inspectCloseGlyph(page: Page) {
  const state = await page
    .getByRole("button", { name: "Close Dialog Box", exact: true })
    .evaluate((button) => {
      const glyph = button.querySelector("span:not(.paper-math-tooltip)");
      if (!glyph) throw new Error("Missing visible close glyph");
      const background = (node: Element): string => {
        let current: Element | null = node;
        while (current) {
          const color = getComputedStyle(current).backgroundColor;
          if (color !== "rgba(0, 0, 0, 0)") return color;
          current = current.parentElement;
        }
        throw new Error("Close control has no opaque background");
      };
      const style = getComputedStyle(button);
      const ink = getComputedStyle(glyph);
      return {
        text: glyph.textContent,
        color: ink.color,
        background: background(glyph),
        buttonBackground: background(button),
        border: style.borderColor,
        borderStyle: style.borderStyle,
        borderWidth: Number.parseFloat(style.borderWidth),
        rect: button.getBoundingClientRect().toJSON(),
        hover: button.matches(":hover"),
        focused: button === document.activeElement,
        focusVisible: button.matches(":focus-visible"),
      };
    });
  return {
    ...state,
    contrast: ratio(state.color, state.background),
    boundaryContrast: ratio(state.border, state.buttonBackground),
  };
}

export function assertCloseGlyph(state: Awaited<ReturnType<typeof inspectCloseGlyph>>): void {
  expect(state.text?.trim()).toBe("×");
  expect(state.contrast).toBeGreaterThanOrEqual(3);
  expect(state.boundaryContrast).toBeGreaterThanOrEqual(3);
  expect(state.borderStyle).toBe("solid");
  expect(state.borderWidth).toBeGreaterThanOrEqual(1);
  expect(state.rect.width).toBeGreaterThanOrEqual(44);
  expect(state.rect.height).toBeGreaterThanOrEqual(44);
}

async function exerciseSliders(
  page: Page,
  record: (name: string) => Promise<void>,
  prefix: string,
  menuIndex: number,
) {
  const menu = page.locator('[role="menu"]').nth(menuIndex);
  const inputs = menu.locator('input[type="range"]');
  const count = await inputs.count();
  await expect(menu.getByRole("slider")).toHaveCount(count);
  const results = [];
  for (let index = 0; index < count; index++) {
    const input = inputs.nth(index);
    await expect(input).toHaveAccessibleName(/^(Background|Foreground) opacity$/);
    const row = input.locator("xpath=ancestor::*[contains(@class,'CtxtMenu_MenuSlider')][1]");
    const before = Number(await input.inputValue());
    const step = await input.evaluate((element) => Number((element as HTMLInputElement).step || 1));
    const min = Number(await input.getAttribute("min"));
    const left = before > min;
    const after = before + (left ? -step : step);
    await input.hover();
    await input.press(left ? "ArrowLeft" : "ArrowRight");
    await expect(input).toHaveValue(String(after));
    await expect(row.locator(".CtxtMenu_SliderValue")).toHaveText(`${after}%`);
    await expect(input).toHaveAttribute("aria-valuenow", String(after));
    const focus = await inspectMenuFocus(page);
    assertMenuFocus(focus);
    const tree = await menu.ariaSnapshot();
    await record(`${prefix}-slider-${index}`);
    await input.press(left ? "ArrowRight" : "ArrowLeft");
    await expect(input).toHaveValue(String(before));
    await expect(row.locator(".CtxtMenu_SliderValue")).toHaveText(`${before}%`);
    results.push({ index, before, after, restored: before, focus, tree });
  }
  return results;
}

export async function inspectMenus(page: Page) {
  return page.evaluate(() => {
    const background = (element: Element): string => {
      const layers: number[][] = [];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const channels = getComputedStyle(node)
          .backgroundColor.match(/[\d.]+/g)
          ?.map(Number);
        if (!channels || channels.length < 3) throw new Error("Unsupported menu background");
        layers.push(channels);
      }
      let result = [255, 255, 255];
      for (const channels of layers.reverse()) {
        const alpha = channels[3] ?? 1;
        result = result.map((value, i) => (channels[i] ?? 0) * alpha + value * (1 - alpha));
      }
      return `rgb(${result.join(",")})`;
    };
    const name = (element: Element) => {
      const ids = element.getAttribute("aria-labelledby")?.split(/\s+/).filter(Boolean);
      return (
        ids
          ?.map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .join(" ")
          .trim() ||
        element.getAttribute("aria-label")?.trim() ||
        (element instanceof HTMLInputElement
          ? [...(element.labels ?? [])].map((label) => label.textContent?.trim()).join(" ")
          : "") ||
        (element.matches('button,[role="button"]') ? element.textContent?.trim() : "")
      );
    };
    return {
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      menus: [...document.querySelectorAll<HTMLElement>('.CtxtMenu_ContextMenu[role="menu"]')].map(
        (menu) => ({
          rect: menu.getBoundingClientRect().toJSON(),
          scrollHeight: menu.scrollHeight,
          clientHeight: menu.clientHeight,
          controls: [
            ...menu.querySelectorAll<HTMLElement>(
              'input,button,select,textarea,[role="button"],[role="slider"],[role="checkbox"],[role="combobox"],[role="textbox"]',
            ),
          ]
            .filter((element) => element.getClientRects().length > 0)
            .map((element) => ({
              name: name(element),
              role: element.getAttribute("role"),
              tag: element.tagName,
              rect: element.getBoundingClientRect().toJSON(),
            })),
          sliders: [...menu.querySelectorAll<HTMLInputElement>('input[type="range"]')].map(
            (input) => ({
              name: name(input),
              value: input.value,
              min: input.min,
              max: input.max,
              rect: input.getBoundingClientRect().toJSON(),
            }),
          ),
          exposedSliders: [...menu.querySelectorAll('[role="slider"]')].map((element) => ({
            name: name(element),
            tag: element.tagName,
          })),
          fragments: [...menu.querySelectorAll<HTMLElement>("*")]
            .filter(
              (element) =>
                element.getClientRects().length > 0 &&
                getComputedStyle(element).visibility !== "hidden" &&
                [...element.childNodes].some(
                  (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
                ),
            )
            .map((element) => {
              const ownText = [...element.childNodes]
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent)
                .join("")
                .trim();
              const range = document.createRange();
              range.selectNodeContents(element);
              return {
                text: ownText,
                marker: /^[►◄✓×]+$/u.test(ownText),
                color: getComputedStyle(element).color,
                background: background(element),
                size: Number.parseFloat(getComputedStyle(element).fontSize),
                rects: [...range.getClientRects()].map((rect) => rect.toJSON()),
              };
            }),
          items: [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].map((item) => {
            const range = document.createRange();
            range.selectNodeContents(item);
            return {
              text: item.textContent?.trim(),
              disabled: item.getAttribute("aria-disabled"),
              submenu: item.getAttribute("aria-haspopup") === "true",
              rect: item.getBoundingClientRect().toJSON(),
              textRects: [...range.getClientRects()].map((rect) => rect.toJSON()),
              color: getComputedStyle(item).color,
              background: background(item),
              marks: [...item.querySelectorAll("span")]
                .filter(
                  (mark) =>
                    mark.textContent?.trim() &&
                    mark.getClientRects().length > 0 &&
                    getComputedStyle(mark).visibility !== "hidden",
                )
                .map((mark) => ({
                  text: mark.textContent,
                  rect: mark.getBoundingClientRect().toJSON(),
                  color: getComputedStyle(mark).color,
                  background: background(mark),
                })),
              size: Number.parseFloat(getComputedStyle(item).fontSize),
              active: item.classList.contains("CtxtMenu_MenuActive"),
            };
          }),
        }),
      ),
    };
  });
}

export function assertMenus(state: Awaited<ReturnType<typeof inspectMenus>>): void {
  expect(state.menus.length).toBeGreaterThan(0);
  expect(state.scrollWidth).toBeLessThanOrEqual(state.width);
  for (let index = 1; index < state.menus.length; index++) {
    const parent = state.menus[index - 1],
      child = state.menus[index];
    if (!parent || !child) throw new Error("Missing cascade column");
    expect(
      Math.max(child.rect.left - parent.rect.right, parent.rect.left - child.rect.right, 0),
    ).toBeLessThanOrEqual(16);
    if (state.width > 600) {
      const trigger = parent.items.find((item) => item.active && item.submenu);
      if (!trigger) throw new Error("Submenu has no active parent trigger");
      const center = (trigger.rect.top + trigger.rect.bottom) / 2;
      expect(child.rect.top, "Submenu must meet its trigger row").toBeLessThanOrEqual(center);
      expect(child.rect.bottom, "Submenu must meet its trigger row").toBeGreaterThanOrEqual(center);
    }
  }
  for (const menu of state.menus) {
    expect(menu.rect.left).toBeGreaterThanOrEqual(0);
    expect(menu.rect.right).toBeLessThanOrEqual(state.width);
    expect(menu.rect.top).toBeGreaterThanOrEqual(0);
    expect(menu.rect.bottom).toBeLessThanOrEqual(state.height);
    assertMenuControls(menu);
    for (const item of menu.items) {
      expect(item.rect.height).toBeGreaterThanOrEqual(44);
      expect(item.rect.width).toBeGreaterThanOrEqual(44);
      expect(item.size).toBeGreaterThanOrEqual(15);
      expect(
        ratio(item.color, item.background),
        JSON.stringify({ text: item.text, color: item.color, background: item.background }),
      ).toBeGreaterThanOrEqual(4.5);
      for (const mark of item.marks) {
        expect(ratio(mark.color, mark.background)).toBeGreaterThanOrEqual(3);
        expect(mark.rect.top).toBeGreaterThanOrEqual(item.rect.top);
        expect(mark.rect.bottom).toBeLessThanOrEqual(item.rect.bottom);
      }
      for (const text of item.textRects) {
        expect(text.left).toBeGreaterThanOrEqual(item.rect.left);
        expect(text.right).toBeLessThanOrEqual(item.rect.right + 0.1);
      }
    }
    for (let i = 1; i < menu.items.length; i++) {
      const previous = menu.items[i - 1],
        current = menu.items[i];
      if (!previous || !current) throw new Error("Missing menu row");
      expect(current.rect.top - previous.rect.bottom).toBeGreaterThanOrEqual(8);
    }
  }
}

export function assertMenuControls(
  menu: Awaited<ReturnType<typeof inspectMenus>>["menus"][number],
): void {
  for (const control of menu.controls) {
    expect(control.name, "Reader control needs an accessible name").toMatch(/\S/);
    expect(control.rect.height).toBeGreaterThanOrEqual(44);
    expect(control.rect.width).toBeGreaterThanOrEqual(44);
  }
  for (const input of menu.sliders) {
    expect(input.name, "Native slider needs an accessible name").toMatch(/\S/);
    expect(input.rect.height).toBeGreaterThanOrEqual(44);
    expect(input.rect.width).toBeGreaterThanOrEqual(44);
    expect(input.rect.left).toBeGreaterThanOrEqual(menu.rect.left);
    expect(input.rect.right).toBeLessThanOrEqual(menu.rect.right);
  }
  for (const slider of menu.exposedSliders)
    expect(slider.name, "Exposed slider role needs a name").toMatch(/\S/);
  for (const fragment of menu.fragments) {
    expect(
      ratio(fragment.color, fragment.background),
      JSON.stringify(fragment),
    ).toBeGreaterThanOrEqual(fragment.marker ? 3 : 4.5);
    if (!fragment.marker) expect(fragment.size, fragment.text).toBeGreaterThanOrEqual(15);
    for (const rect of fragment.rects) {
      expect(rect.left).toBeGreaterThanOrEqual(menu.rect.left - 0.1);
      expect(rect.right).toBeLessThanOrEqual(menu.rect.right + 0.1);
    }
  }
}

export async function checkRejectedMenuStyles(page: Page) {
  await page.locator("mjx-container").first().click({ button: "right" });
  await page
    .locator('[role="menu"]')
    .first()
    .locator('[role^="menuitem"]')
    .filter({ hasText: "Show Math As" })
    .hover();
  await expect(page.locator('[role="menu"]')).toHaveCount(2);
  const controls = [];
  for (const [name, content] of [
    [
      "offscreen submenu",
      ".CtxtMenu_ContextMenu ~ .CtxtMenu_ContextMenu {left:243px!important;right:auto!important}",
    ],
    [
      "faint disabled text",
      ".CtxtMenu_ContextMenu .CtxtMenu_MenuItem.CtxtMenu_MenuDisabled {color:rgb(128,128,128)!important;background:white!important}",
    ],
    [
      "small crowded targets",
      ".CtxtMenu_ContextMenu .CtxtMenu_MenuItem {min-height:20px!important;height:20px!important;padding:0!important;margin-bottom:0!important;line-height:20px!important}",
    ],
  ]) {
    if (!content) throw new Error("Missing negative menu style");
    const style = await page.addStyleTag({ content });
    const state = await inspectMenus(page);
    let rejection: string | null = null;
    try {
      assertMenus(state);
    } catch (error) {
      rejection = String(error);
    }
    expect(rejection).not.toBeNull();
    controls.push({ name, rejection, state });
    await style.evaluate((element) => element.parentNode?.removeChild(element));
    assertMenus(await inspectMenus(page));
  }
  await page.mouse.click((await page.evaluate(() => innerWidth)) - 2, 2);
  await expect(page.locator('[role="menu"]')).toHaveCount(0);
  return controls;
}

/** Real DOM mutations of the formerly omitted controls and focus states. */
export async function checkExpandedRejections(page: Page) {
  await waitForReader(page);
  const rejected: { name: string; rejection: string | null; state: unknown }[] = [];
  const reject = (name: string, check: () => void, state: unknown) => {
    let rejection: string | null = null;
    try {
      check();
    } catch (error) {
      rejection = String(error);
    }
    expect(rejection, `Negative control was accepted: ${name}`).not.toBeNull();
    rejected.push({ name, rejection, state });
  };
  const open = async (path: string[]) => {
    await page.mouse.click((await page.evaluate(() => innerWidth)) - 2, 2);
    await page.locator("mjx-container").first().click({ button: "right" });
    await page.mouse.move((await page.evaluate(() => innerWidth)) - 2, 2);
    for (let count = await page.locator('[role="menu"]').count(); count > 1; count--) {
      await page.keyboard.press("ArrowLeft");
      await expect(page.locator('[role="menu"]')).toHaveCount(count - 1);
    }
    for (let depth = 0; depth < path.length; depth++) {
      const text = path[depth];
      if (!text) throw new Error("Missing negative-control path");
      const item = page
        .locator('[role="menu"]')
        .nth(depth)
        .locator('[role^="menuitem"]')
        .filter({ hasText: text });
      await item.scrollIntoViewIfNeeded();
      const rect = await item.boundingBox();
      if (!rect) throw new Error("No negative-control trigger");
      await page.mouse.move(rect.x + 8, rect.y + 22);
      await expect(page.locator('[role="menu"]').nth(depth + 1)).toBeVisible();
    }
  };
  await open(["Explorer", "Highlight"]);
  assertMenus(await inspectMenus(page));
  const input = page.locator('[role="menu"]').nth(2).locator('input[type="range"]').first();
  const original = await input.getAttribute("aria-labelledby");
  if (!original) throw new Error("Positive slider label is missing");
  await input.evaluate((element) => element.setAttribute("aria-labelledby", "paper-missing-label"));
  await expect(input).toHaveAccessibleName("");
  let state = await inspectMenus(page);
  const badName = state.menus[2];
  if (!badName) throw new Error("Missing Highlight state");
  reject("unnamed slider", () => assertMenuControls(badName), state);
  await input.evaluate(
    (element, value) => element.setAttribute("aria-labelledby", value),
    original,
  );
  assertMenus(await inspectMenus(page));
  for (const [name, content] of [
    [
      "faint small percentage",
      ".CtxtMenu_MenuSlider .CtxtMenu_SliderValue {color:#333!important;font-size:12px!important}",
    ],
    [
      "undersized actual range",
      ".CtxtMenu_ContextMenu input.CtxtMenu_SliderBar[type=range] {height:16px!important;min-height:16px!important}",
    ],
  ]) {
    if (!name || !content) throw new Error("Missing control mutation");
    const style = await page.addStyleTag({ content });
    state = await inspectMenus(page);
    const menu = state.menus[2];
    if (!menu) throw new Error("Missing mutated Highlight menu");
    reject(name, () => assertMenuControls(menu), state);
    await style.evaluate((element) => element.parentNode?.removeChild(element));
    assertMenus(await inspectMenus(page));
  }
  await open(["Explorer"]);
  assertMenus(await inspectMenus(page));
  let style = await page.addStyleTag({
    content: ".CtxtMenu_ContextMenu ~ .CtxtMenu_ContextMenu {top:12px!important}",
  });
  state = await inspectMenus(page);
  reject("detached child menu", () => assertMenus(state), state);
  await style.evaluate((element) => element.parentNode?.removeChild(element));
  assertMenus(await inspectMenus(page));
  await page.mouse.click((await page.evaluate(() => innerWidth)) - 2, 2);
  await page.locator("mjx-container").first().focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  assertMenuFocus(await inspectMenuFocus(page));
  style = await page.addStyleTag({
    content:
      ".CtxtMenu_ContextMenu.CtxtMenu_Menu:focus-visible,.CtxtMenu_ContextMenu.CtxtMenu_Menu *:focus-visible{outline:none!important;box-shadow:none!important}",
  });
  const badFocus = await inspectMenuFocus(page);
  reject("missing keyboard ring", () => assertMenuFocus(badFocus), badFocus);
  await style.evaluate((element) => element.parentNode?.removeChild(element));
  assertMenuFocus(await inspectMenuFocus(page));
  await open([]);
  await page.getByRole("menuitem", { name: "About MathJax", exact: true }).click();
  await page.getByRole("button", { name: "Close Dialog Box", exact: true }).hover();
  assertCloseTooltip(await inspectCloseTooltip(page));
  style = await page.addStyleTag({
    content:
      ".CtxtMenu_InfoClose:hover .paper-math-tooltip,.CtxtMenu_InfoClose:focus-visible .paper-math-tooltip {display:none!important}",
  });
  const badTip = await inspectCloseTooltip(page);
  reject("missing visible tooltip", () => assertCloseTooltip(badTip), badTip);
  await style.evaluate((element) => element.parentNode?.removeChild(element));
  assertCloseTooltip(await inspectCloseTooltip(page));
  assertCloseGlyph(await inspectCloseGlyph(page));
  style = await page.addStyleTag({
    content:
      ".CtxtMenu_Info .CtxtMenu_InfoClose[role=button]:hover > span:not(.paper-math-tooltip) {color:white!important;background:#ccc!important}",
  });
  const badGlyph = await inspectCloseGlyph(page);
  reject("faint hovered close glyph", () => assertCloseGlyph(badGlyph), badGlyph);
  await style.evaluate((element) => element.parentNode?.removeChild(element));
  assertCloseGlyph(await inspectCloseGlyph(page));
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await open(["Math Settings", "Zoom Trigger"]);
  const label = page
    .locator('[role="menu"]')
    .nth(2)
    .getByRole("menuitem", { name: "Trigger Requires:", exact: true });
  await label.hover();
  assertMenus(await inspectMenus(page));
  style = await page.addStyleTag({
    content:
      ".CtxtMenu_ContextMenu .CtxtMenu_MenuItem.CtxtMenu_MenuLabel {color:#e7edf0!important;background:#e8e8e8!important}",
  });
  const badLabel = await inspectMenus(page);
  reject("faint native menu label", () => assertMenus(badLabel), badLabel);
  await style.evaluate((element) => element.parentNode?.removeChild(element));
  assertMenus(await inspectMenus(page));
  await page.mouse.move(1, 1);
  await page.locator('[role="menu"]').first().focus();
  await page.keyboard.press("Escape");
  await expect(page.locator('[role="menu"]')).toHaveCount(0);
  return rejected;
}

export async function checkMathDialog(page: Page, record: (name: string) => Promise<void>) {
  await page.locator("mjx-container").first().click({ button: "right" });
  await page.getByRole("menuitem", { name: "About MathJax", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const state = await dialog.evaluate((element) => {
    const style = getComputedStyle(element);
    const close = element.querySelector('[role="button"]');
    if (!close) throw new Error("Math information dialog has no close control");
    return {
      name: element.getAttribute("aria-label"),
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      rect: element.getBoundingClientRect().toJSON(),
      foreground: style.color,
      background: style.backgroundColor,
      close: close.getBoundingClientRect().toJSON(),
      links: [...element.querySelectorAll("a")].map((link) => ({
        color: getComputedStyle(link).color,
        rect: link.getBoundingClientRect().toJSON(),
      })),
      fragments: [...element.querySelectorAll("*")]
        .filter((node) =>
          [...node.childNodes].some(
            (child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
          ),
        )
        .map((node) => {
          let ancestor: Element | null = node;
          let background = "rgba(0, 0, 0, 0)";
          while (ancestor && background === "rgba(0, 0, 0, 0)") {
            background = getComputedStyle(ancestor).backgroundColor;
            ancestor = ancestor.parentElement;
          }
          return {
            text: node.textContent,
            color: getComputedStyle(node).color,
            background,
            size: Number.parseFloat(getComputedStyle(node).fontSize),
          };
        }),
    };
  });
  await record("menu-about");
  expect(state.name).toBeTruthy();
  expect(state.scrollWidth).toBeLessThanOrEqual(state.width);
  expect(state.rect.left).toBeGreaterThanOrEqual(0);
  expect(state.rect.right).toBeLessThanOrEqual(state.width);
  expect(state.rect.top).toBeGreaterThanOrEqual(0);
  expect(state.rect.bottom).toBeLessThanOrEqual(state.height);
  expect(state.close.height).toBeGreaterThanOrEqual(44);
  expect(state.close.width).toBeGreaterThanOrEqual(44);
  expect(ratio(state.foreground, state.background)).toBeGreaterThanOrEqual(4.5);
  for (const link of state.links) {
    expect(ratio(link.color, state.background)).toBeGreaterThanOrEqual(4.5);
    expect(link.rect.height).toBeGreaterThanOrEqual(44);
  }
  for (const fragment of state.fragments) {
    expect(ratio(fragment.color, fragment.background)).toBeGreaterThanOrEqual(4.5);
    expect(fragment.size).toBeGreaterThanOrEqual(15);
  }
  const close = dialog.getByRole("button", { name: "Close Dialog Box", exact: true });
  await page.mouse.move(1, 1);
  const restGlyph = await inspectCloseGlyph(page);
  assertCloseGlyph(restGlyph);
  const closeStates = [{ phase: "rest", state: restGlyph }];
  await close.hover();
  const hoverGlyph = await inspectCloseGlyph(page);
  expect(hoverGlyph.hover).toBe(true);
  assertCloseGlyph(hoverGlyph);
  closeStates.push({ phase: "hover", state: hoverGlyph });
  const hoverTooltip = await inspectCloseTooltip(page);
  assertCloseTooltip(hoverTooltip);
  await record("menu-about-tooltip-hover");
  await page.mouse.move(1, 1);
  await expect(page.locator(".paper-math-tooltip")).toBeHidden();
  const focusStates = [];
  for (let count = 0; count < 8; count++) {
    await page.keyboard.press("Tab");
    const focus = await inspectMenuFocus(page);
    assertMenuFocus(focus);
    focusStates.push(focus);
    if (await close.evaluate((element) => element === document.activeElement)) break;
  }
  expect(await close.evaluate((element) => element === document.activeElement)).toBe(true);
  const focusGlyph = await inspectCloseGlyph(page);
  expect(focusGlyph.focusVisible).toBe(true);
  assertCloseGlyph(focusGlyph);
  closeStates.push({ phase: "keyboard-focus", state: focusGlyph });
  const focusTooltip = await inspectCloseTooltip(page);
  assertCloseTooltip(focusTooltip);
  await record("menu-about-focus");
  await close.hover();
  const combinedGlyph = await inspectCloseGlyph(page);
  expect(combinedGlyph.hover && combinedGlyph.focused).toBe(true);
  assertCloseGlyph(combinedGlyph);
  assertMenuFocus(await inspectMenuFocus(page));
  closeStates.push({ phase: "focus-and-hover", state: combinedGlyph });
  await record("menu-about-focus-hover");
  await page.keyboard.press("Enter");
  await expect(dialog).toHaveCount(0);
  await page.locator("mjx-container").first().click({ button: "right" });
  await page.getByRole("menuitem", { name: "About MathJax", exact: true }).click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.locator("mjx-container").first().click({ button: "right" });
  await page.getByRole("menuitem", { name: "About MathJax", exact: true }).click();
  await close.hover();
  assertCloseGlyph(await inspectCloseGlyph(page));
  // The native control closes on mouse-down; its acknowledgement is dismissal.
  await page.mouse.down();
  try {
    await expect(dialog).toHaveCount(0);
  } finally {
    await page.mouse.up();
  }
  await record("menu-about-pointer-dismissed");
  return {
    ...state,
    hoverTooltip,
    focusTooltip,
    focusStates,
    closeStates,
    pointerDismissed: true,
    enterDismissed: true,
    escapeDismissed: true,
  };
}

/** Reset a probe's incidental cascade through the actual native menu lifecycle.
 * MathJax SubMenu.left() returns focus to its anchor without unposting the menu.
 * Focusing that submenu item again also reopens it. Focus its owning menu instead.
 */
export async function resetIncidentalCascade(page: Page): Promise<void> {
  const before = await page.locator('[role="menu"]').count();
  if (before < 2) throw new Error("No incidental submenu to reset");
  /* Native incidental cascade reset: begin */
  await page.evaluate(() => {
    type NativeMenu = {
      _html?: HTMLElement;
      html: HTMLElement;
      items?: { submenu?: NativeMenu }[];
      anchor?: { menu: NativeMenu };
      focus(): void;
      unpost(): void;
    };
    const engine = Reflect.get(window, "MathJax") as {
      startup: { document: { menu: { menu: NativeMenu } } };
    };
    const deepest = [...document.querySelectorAll('[role="menu"]')].at(-1);
    const seen = new Set<NativeMenu>();
    let selected: NativeMenu | undefined;
    const visit = (menu: NativeMenu) => {
      if (seen.has(menu)) return;
      seen.add(menu);
      if (menu._html === deepest) selected = menu;
      for (const item of menu.items ?? []) if (item.submenu) visit(item.submenu);
    };
    visit(engine.startup.document.menu.menu);
    if (!selected?.anchor?.menu) throw new Error("Posted submenu has no native owning menu");
    const parent = selected.anchor.menu;
    selected.unpost();
    parent.focus();
    if (document.activeElement !== parent.html)
      throw new Error("Native parent-menu focus was not restored");
  });
  /* Native incidental cascade reset: end */
  await expect(page.locator('[role="menu"]')).toHaveCount(before - 1);
}

/** Traverse every enabled submenu; restore each keyboard-adjusted opacity value. */
export async function checkMenus(page: Page, record: (name: string) => Promise<void>) {
  await waitForReader(page);
  const checks = [];
  const sliderChecks = [];
  const focusChecks = [];
  const cascadeResets = [];
  const queue: string[][] = [[]];
  for (let index = 0; index < queue.length; index++) {
    const path = queue[index];
    if (!path) throw new Error("Missing menu path");
    console.log(JSON.stringify({ menuPath: path }));
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    await page.mouse.move(1, 1);
    if (await page.locator('[role="menu"]').count()) {
      await page.locator('[role="menu"]').first().focus();
      await page.keyboard.press("Escape");
    }
    await expect(page.locator('[role="menu"]')).toHaveCount(0);
    await page.locator("mjx-container").first().click({ button: "right" });
    await page.mouse.move(viewport.width - 2, viewport.height - 2);
    // MathJax can restore the last selected submenu on a subsequent opening.
    for (let count = await page.locator('[role="menu"]').count(); count > 1; count--) {
      await resetIncidentalCascade(page);
      await expect(page.locator('[role="menu"]')).toHaveCount(count - 1);
    }
    await expect(page.locator('[role="menu"]')).toHaveCount(1);
    for (let depth = 0; depth < path.length; depth++) {
      // Entering a child can hover a row that opens an incidental grandchild.
      // Reset that native cascade before measuring the next independent transition.
      await page.mouse.move(1, 1);
      for (let count = await page.locator('[role="menu"]').count(); count > depth + 1; count--) {
        await resetIncidentalCascade(page);
        await expect(page.locator('[role="menu"]')).toHaveCount(count - 1);
        cascadeResets.push({ path, depth, before: count, after: count - 1 });
      }
      const menu = page.locator('[role="menu"]').nth(depth);
      const name = path[depth];
      if (!name) throw new Error("Missing submenu label");
      const item = menu
        .locator('[role^="menuitem"]')
        .filter({ hasText: name.replaceAll("►", "").trim() });
      await item.scrollIntoViewIfNeeded();
      const box = await item.boundingBox();
      if (!box) throw new Error("Submenu trigger has no rendered rectangle");
      const point = { x: box.x + 8, y: box.y + 22 };
      expect(
        await item.evaluate(
          (element, position) =>
            element.contains(document.elementFromPoint(position.x, position.y)),
          point,
        ),
      ).toBe(true);
      // Opening a cascade can cover its trigger. A single real pointer movement
      // avoids Playwright retrying the successful hover against the new overlay.
      await page.mouse.move(point.x, point.y);
      await expect
        .poll(() => page.locator('[role="menu"]').count())
        .toBeGreaterThanOrEqual(depth + 2);
      const child = page.locator('[role="menu"]').nth(depth + 1);
      await expect(child).toBeVisible();
      if (viewport.width > 600) {
        const childBox = await child.boundingBox();
        if (!childBox) throw new Error("No child-menu rectangle");
        expect(point.y).toBeGreaterThanOrEqual(childBox.y);
        expect(point.y).toBeLessThanOrEqual(childBox.y + childBox.height);
        const towardRight = childBox.x >= box.x + box.width - 16;
        await page.mouse.move(
          towardRight ? childBox.x + 8 : childBox.x + childBox.width - 8,
          point.y,
          { steps: 12 },
        );
        expect(
          await item.evaluate((element) => element.classList.contains("CtxtMenu_MenuActive")),
        ).toBe(true);
        await expect(child).toBeVisible();
      }
    }
    const state = await inspectMenus(page);
    checks.push({ path, state });
    await record(`menu-${index}`);
    assertMenus(state);
    const last = state.menus[path.length];
    if (!last) throw new Error("Missing current menu");
    if (last.sliders.length)
      sliderChecks.push({
        path,
        checks: await exerciseSliders(page, record, `menu-${index}`, path.length),
      });
    if (last.scrollHeight > last.clientHeight) {
      const menu = page.locator('[role="menu"]').nth(path.length);
      for (
        let y = Math.max(44, last.clientHeight - 80), segment = 1;
        y < last.scrollHeight;
        y += Math.max(44, last.clientHeight - 80), segment++
      ) {
        const reached = await menu.evaluate((element, top) => {
          element.scrollTop = top;
          return element.scrollTop + element.clientHeight >= element.scrollHeight;
        }, y);
        const scrolled = await inspectMenus(page);
        assertMenus(scrolled);
        checks.push({ path, state: scrolled });
        await record(`menu-${index}-scroll-${segment}`);
        if (reached) break;
      }
      const end = (await inspectMenus(page)).menus[path.length];
      const finalItem = end?.items.at(-1);
      if (!end || !finalItem) throw new Error("Missing final scrollable menu row");
      expect(finalItem.rect.bottom).toBeLessThanOrEqual(end.rect.bottom);
      expect(finalItem.rect.top).toBeGreaterThanOrEqual(end.rect.top);
    }
    for (const item of last.items) {
      if (!item.submenu || item.disabled === "true" || !item.text) continue;
      if (path.length >= 5) throw new Error("Unbounded MathJax submenu depth");
      queue.push([...path, item.text]);
    }
  }
  await page.mouse.move(1, 1);
  await page.locator('[role="menu"]').first().focus();
  await page.keyboard.press("Escape");
  await expect(page.locator('[role="menu"]')).toHaveCount(0);
  // Space is MathJax's keyboard entry point; arrows open/return, Escape dismisses.
  await page.locator("mjx-container").first().focus();
  await page.keyboard.press("Space");
  await expect(page.locator('[role="menu"]')).toHaveCount(1);
  let focus = await inspectMenuFocus(page);
  assertMenuFocus(focus);
  focusChecks.push({ phase: "root", focus });
  await record("menu-focus-root");
  await page.keyboard.press("ArrowDown");
  focus = await inspectMenuFocus(page);
  assertMenuFocus(focus);
  focusChecks.push({ phase: "item", focus });
  await record("menu-focus-item");
  if ((await page.locator('[role="menu"]').count()) === 1) await page.keyboard.press("ArrowRight");
  await expect(page.locator('[role="menu"]')).toHaveCount(2);
  assertMenus(await inspectMenus(page));
  await record("menu-keyboard");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('[role="menu"]')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator('[role="menu"]')).toHaveCount(0);
  return { paths: checks, sliderChecks, focusChecks, cascadeResets };
}

export async function waitForNativeMathRender(page: Page) {
  await page.waitForFunction(
    async () => {
      const engine = Reflect.get(window, "MathJax") as {
        whenReady(callback: () => void): Promise<unknown>;
        startup: {
          document: { math: Iterable<{ outputData: { speechPromise?: Promise<unknown> } }> };
        };
      };
      if (typeof engine.whenReady !== "function")
        throw new Error("Native MathJax render readiness is unavailable");
      await engine.whenReady(() => {});
      await Promise.all(
        [...engine.startup.document.math].map((item) => item.outputData.speechPromise),
      );
      return true;
    },
    undefined,
    { timeout: 30000 },
  );
}

export async function openClearSpeakMenu(page: Page) {
  await waitForNativeMathRender(page);
  for (
    let remaining = 8;
    remaining && (await page.locator(".CtxtMenu_ContextMenu:visible").count());
    remaining--
  )
    await page.keyboard.press("Escape");
  await expect(page.locator(".CtxtMenu_ContextMenu:visible")).toHaveCount(0);
  const expression = page.locator("mjx-container").nth(1);
  await expression.focus();
  await expect
    .poll(() => expression.evaluate((element) => element.contains(document.activeElement)), {
      timeout: 30000,
    })
    .toBe(true);
  await page.keyboard.press("Space");
  const speech = page.getByRole("menuitem", { name: /^\s*Speech\s*►?$/ });
  try {
    await speech.hover();
  } catch (error) {
    console.log(
      "PREFERENCES_MENU_STATE",
      JSON.stringify(
        await page
          .locator(".CtxtMenu_ContextMenu")
          .evaluateAll((elements) => elements.map((element) => element.outerHTML)),
      ),
    );
    throw error;
  }
  const trigger = page.getByRole("menuitem", { name: /^\s*Clearspeak/i });
  await trigger.scrollIntoViewIfNeeded();
  const box = await trigger.boundingBox();
  if (!box) throw new Error("ClearSpeak trigger is unavailable");
  await page.mouse.move(box.x + 8, box.y + 22);
  const preferences = page.getByRole("menuitem", { name: "Select Preferences", exact: true });
  await expect(preferences).toBeVisible();
  return preferences;
}

export async function openClearSpeakPreferences(page: Page) {
  await (await openClearSpeakMenu(page)).click();
  const dialog = page.getByRole("dialog", { name: "Clearspeak Preferences", exact: true });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function assertReadablePreferenceLabels(page: Page) {
  const labels = await page
    .getByRole("dialog", { name: "Clearspeak Preferences", exact: true })
    .evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const text: string[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode())
        if (node.textContent?.trim()) text.push(node.textContent.trim());
      return text;
    });
  expect(labels.length).toBeGreaterThan(10);
  expect(
    labels.filter((label) => /[a-z][A-Z]/.test(label)),
    "Native preference labels must be readable phrases",
  ).toEqual([]);
  return labels;
}

export async function checkClearSpeakPreferences(
  page: Page,
  record?: (name: string) => Promise<void>,
) {
  await waitForReader(page);
  const errors: string[] = [];
  const onError = (error: Error) => errors.push(error.message);
  page.on("pageerror", onError);
  const inspect = async () => {
    await assertReadablePreferenceLabels(page);
    const state = await page
      .getByRole("dialog", { name: "Clearspeak Preferences", exact: true })
      .evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const close = element.querySelector(".CtxtMenu_InfoClose");
        if (!close) throw new Error("Native preferences Close is missing");
        const closeRect = close.getBoundingClientRect();
        const checkpoints: [number, number][] = [
          [0.5, 0.5],
          [0.25, 0.25],
          [0.75, 0.25],
          [0.25, 0.75],
          [0.75, 0.75],
        ];
        const closeExposed = checkpoints.every(([x, y]) =>
          close.contains(
            document.elementFromPoint(
              closeRect.left + closeRect.width * x,
              closeRect.top + closeRect.height * y,
            ),
          ),
        );
        return {
          rect: rect.toJSON(),
          viewport: { width: innerWidth, height: innerHeight },
          horizontalOverflow: element.scrollWidth - element.clientWidth,
          close: close.getBoundingClientRect().toJSON(),
          closeExposed,
          controls: [...element.querySelectorAll('[role="menuitemradio"]')].map((control) => {
            const style = getComputedStyle(control);
            return {
              height: control.getBoundingClientRect().height,
              size: Number.parseFloat(style.fontSize),
              foreground: style.color,
              background: style.backgroundColor,
              horizontalOverflow: control.scrollWidth - control.clientWidth,
            };
          }),
        };
      });
    expect(state.rect.left).toBeGreaterThanOrEqual(11);
    expect(state.rect.right).toBeLessThanOrEqual(state.viewport.width - 11);
    expect(state.rect.top).toBeGreaterThanOrEqual(11);
    expect(state.rect.bottom).toBeLessThanOrEqual(state.viewport.height - 11);
    expect(state.horizontalOverflow).toBeLessThanOrEqual(1);
    expect(state.close.left).toBeGreaterThanOrEqual(state.rect.left);
    expect(state.close.right).toBeLessThanOrEqual(state.rect.right);
    expect(state.close.top).toBeGreaterThanOrEqual(state.rect.top);
    expect(state.close.bottom).toBeLessThanOrEqual(state.rect.bottom);
    expect(state.closeExposed).toBe(true);
    expect(state.controls.length).toBeGreaterThan(10);
    for (const control of state.controls) {
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(control.size).toBeGreaterThanOrEqual(15);
      expect(control.horizontalOverflow).toBeLessThanOrEqual(1);
      expect(ratio(control.foreground, control.background)).toBeGreaterThanOrEqual(4.5);
    }
    return state;
  };
  try {
    const dialog = await openClearSpeakPreferences(page);
    const opened = await inspect();
    if (record) await record("preferences-open");
    const choice = dialog.getByRole("menuitemradio", {
      name: /^More implied multiplication(?:\s|$)/,
    });
    const automatic = choice.locator("..").getByRole("menuitemradio", { name: /^Auto(?:\s|$)/ });
    await automatic.click();
    await expect(automatic).toHaveAttribute("aria-checked", "true");
    await expect(choice).toHaveAttribute("aria-checked", "false");
    await choice.click();
    await expect(choice).toHaveAttribute("aria-checked", "true");
    const speechRules = await page.evaluate(() => {
      const engine = Reflect.get(window, "MathJax") as {
        startup: { document: { menu: { settings: { speechRules: string } } } };
      };
      return engine.startup.document.menu.settings.speechRules;
    });
    expect(speechRules).toContain("ImpliedTimes_MoreImpliedTimes");
    const selected = await inspect();
    if (record) await record("preferences-choice");
    await dialog.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    const end = await inspect();
    if (record) await record("preferences-end");
    await dialog.getByRole("button", { name: "Close Dialog Box", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    if (record) await record("preferences-closed");
    await openClearSpeakPreferences(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.locator(".CtxtMenu_ContextMenu")).toHaveCount(0);
    expect(errors).toEqual([]);
    return {
      opened,
      selected,
      end,
      escapeKeys: 1,
      speechRules,
      nativeChoicePreserved: true,
      errors,
    };
  } finally {
    page.off("pageerror", onError);
  }
}

export async function checkPreferenceEscapeOutside(
  page: Page,
  record?: (name: string) => Promise<void>,
) {
  await waitForReader(page);
  const dialog = await openClearSpeakPreferences(page);
  let tabs = 0;
  while (
    (await dialog.evaluate((element) => element.contains(document.activeElement))) &&
    tabs < 12
  ) {
    await page.keyboard.press("Shift+Tab");
    tabs++;
  }
  await expect(dialog).toHaveCount(1);
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(false);
  const activeBefore = await page.evaluate(() => document.activeElement?.outerHTML);
  if (record) await record("preferences-focus-outside");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".CtxtMenu_ContextMenu")).toHaveCount(0);
  const activeAfter = await page.evaluate(() => document.activeElement?.outerHTML);
  if (record) await record("preferences-escape-closed");
  return { tabs, activeBefore, activeAfter, escapeKeys: 1 };
}
