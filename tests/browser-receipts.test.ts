import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  collectBrowserCases,
  requireExactBrowserCases,
  requireReportDigest,
} from "../scripts/browser-receipts";
import { externalEnvironment } from "../scripts/paths";
import empty from "./fixtures/browser-empty.json";
import positive from "./fixtures/browser-pass.json";

const expectedCase = {
  project: "mobile",
  file: "game.spec.ts",
  title: "preserves a resident game through offline guide navigation and pauses outside Play",
};
const expected = [expectedCase];
describe("real browser evidence receipts", () => {
  test("accepts the exact case from a real standalone Playwright run", () => {
    expect(collectBrowserCases(positive, true)).toEqual(expected);
    expect(() => requireExactBrowserCases(positive, expected)).not.toThrow();
  });
  test("rejects a real no-tests-found report instead of counting its listing", () => {
    expect(() => collectBrowserCases(empty, true)).toThrow();
  });
  test("rejects the wrong project even when its report is green", () => {
    expect(() =>
      requireExactBrowserCases(positive, [{ ...expectedCase, project: "desktop" }]),
    ).toThrow("different cases");
  });
  test("rejects duplicate passing rows and incorrect summary totals", () => {
    const duplicate = structuredClone(positive);
    const first = duplicate.suites[0];
    if (!first) throw new Error("Missing real fixture suite");
    duplicate.suites.push(first);
    duplicate.stats.expected = 2;
    expect(() => collectBrowserCases(duplicate, true)).toThrow("Duplicate browser case");
    const wrong = structuredClone(positive);
    wrong.stats.expected = 2;
    expect(() => collectBrowserCases(wrong, true)).toThrow("count mismatch");
  });
  test("rejects a real file whose bytes change after a recorded digest", async () => {
    const dir = await mkdtemp(join(externalEnvironment()["TMPDIR"] ?? "", "browser-receipt-"));
    try {
      const path = join(dir, "report.json");
      const bytes = Buffer.from(JSON.stringify(positive));
      const digest = createHash("sha256").update(bytes).digest("hex");
      await writeFile(path, bytes);
      expect(() => requireReportDigest(bytes, digest)).not.toThrow();
      await writeFile(path, Buffer.concat([bytes, Buffer.from("\n")]));
      expect(() => requireReportDigest(new Uint8Array(bytes), "wrong-digest")).toThrow("digest");
      const changed = await readFile(path);
      expect(() => requireReportDigest(changed, digest)).toThrow("digest");
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});
