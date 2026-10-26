import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  // Complete capture/accessibility workflows include tool analysis and browser cleanup.
  timeout: 120000,
  expect: { timeout: 10000 },
  outputDir: "test-results",
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:5187",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1080 } } },
    { name: "wide", grep: /renders every view/, use: { viewport: { width: 1920, height: 1080 } } },
    {
      name: "mobile",
      testIgnore: "**/pointer.spec.ts",
      use: { ...devices["iPhone 14"], defaultBrowserType: "chromium", channel: "chrome" },
    },
  ],
  webServer: {
    command: "bun x --no-install vite preview --host 127.0.0.1 --port 5187 --strictPort",
    url: "http://127.0.0.1:5187",
    reuseExistingServer: false,
  },
});
