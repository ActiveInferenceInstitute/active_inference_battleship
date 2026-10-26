import { createHash } from "node:crypto";
import { z } from "zod";

export interface BrowserCase {
  readonly project: string;
  readonly file: string;
  readonly title: string;
}
const nodeSchema = z.object({
  specs: z.array(z.unknown()).optional(),
  suites: z.array(z.unknown()).optional(),
});
const specSchema = z.object({
  file: z.string().min(1),
  title: z.string().min(1),
  tests: z.array(z.unknown()).min(1),
});
const projectSchema = z.object({ projectName: z.string().min(1) });
const passedTestSchema = z.object({
  expectedStatus: z.literal("passed"),
  status: z.literal("expected"),
  results: z
    .array(
      z.object({
        status: z.literal("passed"),
        errors: z.array(z.unknown()).max(0),
        retry: z.literal(0),
      }),
    )
    .length(1),
});
const rootSchema = z.object({ suites: z.array(z.unknown()) });
const passedReportSchema = z.object({
  errors: z.array(z.unknown()).max(0),
  stats: z.object({
    expected: z.number().int().positive(),
    unexpected: z.literal(0),
    skipped: z.literal(0),
    flaky: z.literal(0),
  }),
});
export function browserCaseKey(item: BrowserCase): string {
  return JSON.stringify([item.project, item.file, item.title]);
}

export function requireReportDigest(bytes: Uint8Array, expected: string): void {
  if (createHash("sha256").update(bytes).digest("hex") !== expected)
    throw new Error("Browser report digest mismatch");
}

/** Read real Playwright inventory/results; a listed test is never itself a passing test. */
export function collectBrowserCases(value: unknown, requirePass = false): BrowserCase[] {
  const cases: BrowserCase[] = [];
  const seen = new Set<string>();
  const visit = (value: unknown) => {
    const node = nodeSchema.parse(value);
    for (const raw of node.specs ?? []) {
      const spec = specSchema.parse(raw);
      for (const test of spec.tests) {
        const project = projectSchema.parse(test);
        if (requirePass) passedTestSchema.parse(test);
        const item = { project: project.projectName, file: spec.file, title: spec.title };
        const key = browserCaseKey(item);
        if (seen.has(key)) throw new Error(`Duplicate browser case: ${key}`);
        seen.add(key);
        cases.push(item);
      }
    }
    for (const child of node.suites ?? []) visit(child);
  };
  for (const suite of rootSchema.parse(value).suites) visit(suite);
  if (requirePass) {
    const report = passedReportSchema.parse(value);
    if (report.stats.expected !== cases.length) throw new Error("Browser report count mismatch");
  }
  return cases;
}

export function requireExactBrowserCases(value: unknown, expected: readonly BrowserCase[]): void {
  const actual = collectBrowserCases(value, true).map(browserCaseKey).sort();
  const keys = expected.map(browserCaseKey).sort();
  if (new Set(keys).size !== keys.length || JSON.stringify(actual) !== JSON.stringify(keys))
    throw new Error("Browser report selected different cases");
}
