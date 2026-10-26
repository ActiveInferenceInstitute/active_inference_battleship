import { expect, test } from "@playwright/test";

test("organization release explains GNN stages and exposes every action without firing", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Launch game", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Model & guide", exact: true }).click();
  await expect(page.locator(".release-plan")).toContainText("ActiveInferenceInstitute/");
  await expect(page.locator(".gnn-source-sample")).toContainText("GNN");
  for (const stage of ["Parse", "Validate", "Compile", "Infer & act", "Declare"]) {
    await page.getByRole("button", { name: "Next stage", exact: true }).click();
    await expect(page.locator(".gnn-walkthrough h3")).toContainText(stage);
  }
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Launch game", exact: true }).click();
  await page.getByRole("button", { name: "Decision explorer", exact: true }).click();
  const table = page.getByRole("region", { name: "Action candidate table" });
  await expect(table.locator("tbody tr")).toHaveCount(8);
  await table.getByRole("button", { name: "Show all 100 actions", exact: true }).click();
  await expect(table.locator("tbody tr")).toHaveCount(100);
  await expect(table.getByRole("button", { name: "Show leading eight" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await table.getByRole("button", { name: "Show leading eight" }).click();
  await expect(table.locator("tbody tr")).toHaveCount(8);
  await expect(page.getByLabel("Selected action plot values")).toContainText("nats");
  await expect(page.locator(".tradeoff-crosshair")).toHaveCount(2);
  await expect(page.locator(".decision-lab")).toContainText("0 observed shots");
  expect(errors).toEqual([]);
});
