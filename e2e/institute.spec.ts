import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { coordinate } from "../src/core/fleet";
import { capture } from "./capture";

test("explains and downloads the actual GNN contract with published release metadata", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator(".brand small")).toHaveText("ACTIVE INFERENCE INSTITUTE");
  await page.getByRole("button", { name: "Model & guide", exact: true }).click();
  await expect(page.locator(".gnn-stages li")).toHaveCount(5);
  await expect(page.locator(".gnn-pipeline")).toContainText("not a graph neural network");
  await expect(page.locator(".release-plan")).toContainText("v0.4.0");
  await expect(
    page.getByRole("link", { name: "ActInfInstitute/active_inference_battleship", exact: true }),
  ).toHaveAttribute("href", "https://github.com/ActInfInstitute/active_inference_battleship");
  await expect(
    page.getByRole("link", { name: "Zenodo (DOI 10.5281/zenodo.23670188)", exact: true }),
  ).toHaveAttribute("href", "https://doi.org/10.5281/zenodo.23670188");
  const files: Record<string, string> = {};
  for (const [label, kind] of [
    ["Download GNN source", "source"],
    ["Download compiled model", "model"],
  ]) {
    if (!label || !kind) throw new Error("Incomplete download fixture");
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: label, exact: true }).click();
    const download = await pending;
    const path = info.outputPath(download.suggestedFilename());
    await download.saveAs(path);
    files[kind] = await readFile(path, "utf8");
  }
  expect(files["source"]).toEqual(await readFile("models/battleship.gnn.md", "utf8"));
  const model = JSON.parse(files["model"] ?? "");
  expect(
    createHash("sha256")
      .update(files["source"] ?? "")
      .digest("hex"),
  ).toBe(model.source.specificationSha256);
  expect(model).toEqual(JSON.parse(await readFile("src/generated/model.json", "utf8")));
  await expect(
    page.getByRole("status").filter({ hasText: "Compiled model with provenance downloaded" }),
  ).toBeVisible();
  await capture(page, info.outputPath("gnn-and-release-guide.png"));
});

for (const actor of ["player", "opponent"])
  for (const theme of ["dark", "light"]) {
    test(`plots public action trade-offs for ${actor} in ${theme} without changing a replay`, async ({
      page,
    }, info) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Launch game", exact: true }).click();
      await page.getByRole("button", { name: "Fire suggested shot", exact: true }).click();
      const replay = async (name: string) => {
        const pending = page.waitForEvent("download");
        await page.getByRole("button", { name: "Export replay", exact: true }).click();
        const path = info.outputPath(name);
        await (await pending).saveAs(path);
        return readFile(path, "utf8");
      };
      const before = await replay("before.json");
      await page.getByRole("button", { name: "Decision explorer", exact: true }).click();
      const noise = page.getByRole("slider", { name: /Assumed sensor noise/ });
      await noise.focus();
      await noise.press("Home");
      await page.getByLabel("Inspect agent").selectOption(actor);
      await page.getByLabel("Color theme").selectOption(theme);
      const pending = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export analysis JSON", exact: true }).click();
      const path = info.outputPath(`${actor}-${theme}.json`);
      await (await pending).saveAs(path);
      const snapshot = JSON.parse(await readFile(path, "utf8"));
      expect(snapshot.actions.length).toBeGreaterThan(8);
      await expect(
        page.locator('section[aria-label="Action candidate table"] tbody tr'),
      ).toHaveCount(8);
      await expect(page.getByLabel("Inspect coordinate").locator("option")).toHaveCount(
        snapshot.actions.length,
      );
      await expect(page.locator(".action-tradeoff")).toContainText("up to eight leading actions");
      const outside = snapshot.actions[8];
      if (!outside) throw new Error("Missing outside-top-eight action");
      await page.getByLabel("Inspect coordinate").selectOption(String(outside.cell));
      await expect(page.locator(".decision-receipt .tag")).toHaveText(coordinate(outside.cell, 10));
      const inspect = () =>
        page.locator(".tradeoff-plot").evaluate(
          (plot, actions) => {
            const svg = plot.querySelector("svg");
            if (!svg) throw new Error("Missing score plot");
            const bounds = svg.getBoundingClientRect();
            return [...plot.querySelectorAll("circle[data-cell]")].map((dot) => {
              const score = actions.find((a) => a.cell === Number(dot.getAttribute("data-cell")));
              if (!score) throw new Error("Unknown plotted action");
              const box = dot.getBoundingClientRect();
              return Math.max(
                Math.abs((box.x + box.width / 2 - bounds.x) / bounds.width - score.predictedHit),
                Math.abs(
                  (box.y + box.height / 2 - bounds.y) / bounds.height -
                    (1 - score.informationGain / Math.LN2),
                ),
              );
            });
          },
          snapshot.actions as { cell: number; predictedHit: number; informationGain: number }[],
        );
      const errors = await inspect();
      expect(errors).toHaveLength(snapshot.actions.length);
      expect(Math.max(...errors)).toBeLessThan(0.001);
      // Real DOM negative control must fail the very same coordinate measurement.
      const first = page.locator("circle[data-cell]").first();
      const old = await first.getAttribute("cx");
      await first.evaluate((dot) => dot.setAttribute("cx", "200%"));
      expect(Math.max(...(await inspect()))).toBeGreaterThan(1);
      await first.evaluate((dot, value) => dot.setAttribute("cx", value ?? ""), old);
      expect(Math.max(...(await inspect()))).toBeLessThan(0.001);
      const sizes = await page
        .locator(".action-tradeoff figcaption, .tradeoff-x-ticks, .tradeoff-y-title")
        .evaluateAll((nodes) =>
          nodes.map((node) => Number.parseFloat(getComputedStyle(node).fontSize)),
        );
      expect(sizes.every((size) => size >= 15)).toBe(true);
      const labels = await page.locator(".action-tradeoff figure").evaluate((figure) => {
        const plot = figure.querySelector("svg");
        if (!plot) throw new Error("Missing plot geometry");
        const outer = figure.getBoundingClientRect(),
          inner = plot.getBoundingClientRect();
        return [...figure.querySelectorAll(".tradeoff-x-ticks span")].map((label, index) => {
          const box = label.getBoundingClientRect();
          return {
            error: Math.abs(box.x + box.width / 2 - (inner.x + (index * inner.width) / 2)),
            inset: Math.min(box.left - outer.left, outer.right - box.right),
          };
        });
      });
      expect(labels).toHaveLength(3);
      expect(labels.every((label) => label.error < 0.1 && label.inset >= 0)).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.locator(".action-tradeoff").scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath(`${actor}-${theme}-tradeoff.png`) });
      expect(await replay("after.json")).toEqual(before);
    });
  }
