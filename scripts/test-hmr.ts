import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { externalEnvironment, projectRoot } from "./paths";

const server = await createServer({
  root: projectRoot,
  server: { host: "127.0.0.1", port: 5192, strictPort: true },
});
const browser = await chromium.launch({ channel: "chrome", env: externalEnvironment() });
try {
  await server.listen();
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("http://127.0.0.1:5192");
  await page.getByRole("button", { name: "Launch game", exact: true }).waitFor();
  const worker = page.waitForEvent("worker", { timeout: 10000 });
  server.ws.send({
    type: "update",
    updates: [
      {
        type: "js-update",
        path: "/src/main.tsx",
        acceptedPath: "/src/main.tsx",
        timestamp: Date.now(),
      },
    ],
  });
  await worker;
  await page.getByRole("button", { name: "Launch game", exact: true }).waitFor();
  if (errors.length) throw new Error(`Hot reload failed: ${errors.join("\n")}`);
  console.log("Actual Chrome hot update reinitialized the fleet worker without React root errors");
} finally {
  await browser.close();
  await server.close();
}
