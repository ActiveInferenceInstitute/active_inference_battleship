import { expect, test } from "@playwright/test";

test("keeps map markers legible across layers and themes", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Decision explorer", exact: true }).click();
  await page.getByLabel("Inspect coordinate", { exact: true }).selectOption("1");
  const measurements = [];
  for (const theme of ["dark", "light"]) {
    await page.getByLabel("Color theme").selectOption(theme);
    for (const layer of [
      "probability",
      "occupancy",
      "predictedHit",
      "informationGain",
      "risk",
      "expectedFreeEnergy",
    ]) {
      await page.getByLabel("Map layer", { exact: true }).selectOption(layer);
      const ratio = await page
        .locator(".lab-map-panel .cell.recommended:not(.selected) span")
        .evaluate((node) => {
          const canvas = document.createElement("canvas");
          canvas.width = 1;
          canvas.height = 1;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Missing canvas context");
          const rgba = (color: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return context.getImageData(0, 0, 1, 1).data;
          };
          const style = getComputedStyle(node);
          const background = rgba(style.backgroundColor);
          const surface =
            background[3] === 255
              ? background
              : rgba(getComputedStyle(node.parentElement ?? node).backgroundColor);
          const luminance = (channels: Uint8ClampedArray) =>
            [0, 1, 2].reduce((sum, index) => {
              const value = (channels[index] ?? 0) / 255;
              return (
                sum +
                (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) *
                  ([0.2126, 0.7152, 0.0722][index] ?? 0)
              );
            }, 0);
          const a = luminance(rgba(style.color)),
            b = luminance(surface);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        });
      measurements.push({ theme, layer, ratio });
      expect.soft(ratio).toBeGreaterThanOrEqual(3);
    }
  }
  await page.screenshot({ path: info.outputPath("legible-leading-marker.png") });
  await info.attach("contrast-values", {
    body: JSON.stringify(measurements),
    contentType: "application/json",
  });
});

test("keeps effective chart and inspector text at readable sizes", async ({ page }, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  await page.getByRole("button", { name: "Fire suggested shot", exact: true }).click();
  await page.getByRole("button", { name: "Decision explorer", exact: true }).click();
  const labelSize = await page
    .locator(".inspect-agent")
    .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
  expect.soft(labelSize).toBeGreaterThanOrEqual(15);
  const measure = () =>
    page
      .locator(".sensitivity-chart text, .history-chart text, .chart-label")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const font = Number.parseFloat(getComputedStyle(node).fontSize);
          return node instanceof SVGGraphicsElement ? font * (node.getScreenCTM()?.d ?? 1) : font;
        }),
      );
  const sensitivity = await measure();
  expect(sensitivity.length).toBeGreaterThan(0);
  expect.soft(Math.min(...sensitivity)).toBeGreaterThanOrEqual(15);
  await page
    .getByRole("heading", { name: "Policy sensitivity", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("readable-sensitivity-axes.png") });
  await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
  const history = await measure();
  expect(history.length).toBeGreaterThan(0);
  expect.soft(Math.min(...history)).toBeGreaterThanOrEqual(15);
  await info.attach("effective-font-sizes", {
    body: JSON.stringify({ labelSize, sensitivity, history }),
    contentType: "application/json",
  });
  const alignments = [];
  let shots = 1;
  for (const count of [1, 3, 4, 10]) {
    if (shots < count) {
      await page.getByRole("button", { name: "Play", exact: true }).click();
      while (shots < count) {
        await page.getByRole("button", { name: "Fire suggested shot", exact: true }).click();
        shots++;
      }
      await page.getByRole("button", { name: "Diagnostics", exact: true }).click();
    }
    const charts = page.locator(".history-chart");
    await expect(charts).toHaveCount(3);
    for (let index = 0; index < 3; index++) {
      const chart = charts.nth(index);
      await expect(chart.locator("circle")).toHaveCount(count);
      const measurement = await chart.evaluate((figure) => {
        const box = figure.getBoundingClientRect();
        const circles = [...figure.querySelectorAll("circle")];
        const offsets = [...figure.querySelectorAll(".chart-x-labels .chart-label")].map(
          (label) => {
            const point = circles[Number(label.textContent) - 1];
            if (!point) throw new Error("History label has no corresponding observation");
            const tick = label.getBoundingClientRect();
            const marker = point.getBoundingClientRect();
            return Math.abs(tick.x + tick.width / 2 - marker.x - marker.width / 2);
          },
        );
        const overflows = [...figure.querySelectorAll(".chart-label")].map((label) => {
          const bounds = label.getBoundingClientRect();
          return Math.max(
            box.left - bounds.left,
            bounds.right - box.right,
            box.top - bounds.top,
            bounds.bottom - box.bottom,
          );
        });
        return { offsets, maximumOverflow: Math.max(...overflows) };
      });
      alignments.push({ count, chart: index, ...measurement });
      expect.soft(Math.max(...measurement.offsets)).toBeLessThan(1);
      expect.soft(measurement.maximumOverflow).toBeLessThanOrEqual(0.5);
      await chart.screenshot({ path: info.outputPath(`history-${count}-chart-${index}.png`) });
    }
  }
  await info.attach("history-axis-alignment", {
    body: JSON.stringify(alignments),
    contentType: "application/json",
  });
});

test("follows the system theme during startup failure and respects manual overrides", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.route("**/assets/session.worker-*.js", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".startup .overline")).toHaveText(
    "BATTLESHIP / ACTIVE INFERENCE INSTITUTE",
  );
  await expect.soft(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({ path: info.outputPath("light-startup-failure.png") });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".startup .overline")).not.toContainText("LAB");
  await expect.soft(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.unroute("**/assets/session.worker-*.js");
  await page.getByRole("button", { name: "Retry startup", exact: true }).click();
  await page.getByRole("button", { name: "Launch game", exact: true }).waitFor();
  await page.getByLabel("Color theme").selectOption("light");
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Color theme").selectOption("system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
