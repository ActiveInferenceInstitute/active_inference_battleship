import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { capture } from "./capture";

// Desktop pointer cases are selected by project configuration, not skipped at runtime.
for (const theme of ["light", "dark"])
  for (const reduced of [false, true]) {
    test(`acknowledges pointer actions in ${theme}, reduced motion ${reduced}`, async ({
      page,
    }, info) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Launch game", exact: true }).click();
      await page.getByLabel("Color theme").selectOption(theme);
      await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
      const states = [];
      for (const name of ["text", "navigation", "candidate"]) {
        await page.getByRole("button", { name: "Play", exact: true }).click();
        await page.mouse.move(0, 0);
        const target =
          name === "text"
            ? page.getByRole("button", { name: /^Full diagnostics/ })
            : name === "navigation"
              ? page.getByRole("button", { name: "Diagnostics", exact: true })
              : page.locator(".table-action").first();
        await target.scrollIntoViewIfNeeded();
        const appearance = () =>
          target.evaluate((node) => {
            const s = getComputedStyle(node);
            return {
              background: s.backgroundColor,
              decoration: s.textDecorationLine,
              transform: s.transform,
              active: node.matches(":active"),
            };
          });
        const prefix = `${theme}-${reduced ? "reduced" : "normal"}-${name}`;
        const rest = await appearance();
        await capture(page, info.outputPath(`${prefix}-rest.png`), false);
        await target.hover();
        await page.waitForTimeout(150);
        const hover = await appearance();
        await capture(page, info.outputPath(`${prefix}-hover.png`), false);
        await page.mouse.down();
        await page.waitForTimeout(150);
        const pressed = await appearance();
        await capture(page, info.outputPath(`${prefix}-pressed.png`), false);
        states.push({ theme, reduced, name, rest, hover, pressed });
        await writeFile(info.outputPath("pointer-states.json"), JSON.stringify(states, null, 2));
        expect(pressed.active).toBe(true);
        expect(hover.background !== rest.background || hover.decoration !== rest.decoration).toBe(
          true,
        );
        expect(
          pressed.background !== hover.background || pressed.transform !== hover.transform,
        ).toBe(true);
        if (reduced) expect(pressed.transform).toBe("none");
        await page.mouse.up();
      }
    });
  }
