# e2e/

Playwright end-to-end specs that drive the real built dashboard in installed Chrome.
They exercise gameplay, replay import/export, self-play, the decision lab, institute
views, pointer input, and readability on desktop and mobile viewports. Reports,
screenshots, and failed traces are written to `test-results/`.

## Running

```sh
bun run build
bun run test:e2e
```

`test:e2e` serves the existing production `dist/` on port 5187, so build first. The
browser matrix (`bun run test:browser-matrix`) re-runs 70 source-bound cases with a
fresh browser process per case.

## What is here

| File | Purpose |
| --- | --- |
| `game.spec.ts` | Core gameplay, replay, and autoplay flows. |
| `lab.spec.ts` | Decision-lab interactions and exports. |
| `institute.spec.ts` | Institute update surfaces. |
| `organization-release.spec.ts` | Organization/version presentation. |
| `pointer.spec.ts` | Pointer-state and accessibility checks. |
| `readability.spec.ts` | Computed-size and contrast checks. |
| `capture.ts` | Shared screenshot/capture helpers. |

These tests require Chrome; they are separate from the Bun unit suite in
[`../tests/`](../tests/README.md). See [`../docs/VERIFICATION.md`](../docs/VERIFICATION.md).
