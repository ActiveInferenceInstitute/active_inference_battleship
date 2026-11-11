# TODO — Active Inference Battleship

Owner-facing forward backlog. Only real, verified items are listed; completed work
belongs in [CHANGELOG.md](CHANGELOG.md) and git history. See the
[documentation index](docs/README.md) for the current evidence and claim boundaries.

## Documentation gaps

- [ ] `research/SCHOLARSHIP_UPDATE_20261023.md` still says the verified R20
      (`smekal2023gnn`) replacement is "not yet applied to the main bibliography",
      but `manuscript/references.bib` already contains that exact entry. Update the
      dossier note to record that it is applied.
- [ ] The scholarship dossiers are dated snapshots (`SCHOLARSHIP_UPDATE_20261023.md`,
      `SCHOLARSHIP_BATTLESHIP_20261025.md`, `STRATEGY_SCHOLARSHIP_20261025.md`).
      Re-read and refresh them only when a citation or reading limit changes; do not
      rewrite history in place.

## Known defects and evidence limits

- [ ] The manuscript reader's earlier image-capture failure produced an
      uninstrumented `NaN`; the guarded readiness checks prevent recurrence but the
      original asset/transient cause is still unidentified (`docs/MANUSCRIPT.md`).
- [ ] Two real pending font requests once caused a bounded readiness rejection after
      ~31,412 ms; the recovery path is tested, but no universal font-lifecycle cure is
      claimed (`docs/MANUSCRIPT_ACCEPTANCE.md`).
- [ ] Bun coverage covers the imported core, model schema, and contract helpers — not
      the rendered UI, the Python GNN bridge, or the upstream parser pipeline. Do not
      quote one coverage number as a whole-repository gate (`docs/VERIFICATION.md`).

## Environment prerequisites

- [ ] Source development needs Bun 1.4.4 or later (verified 1.4.4), `uv`, a mounted
      GitVault checkout, and a local `Generalized_Notation_Notation` checkout with a
      working Python environment whose `sys.prefix` and `sys.base_prefix` resolve on
      GitVault. The GNN parser and pin check are unavailable without them.
- [ ] Browser acceptance (`bun run test:e2e`) and the optional Lighthouse audit need
      real installed Chrome and a production `dist/` build. The dev server and preview
      use strict ports 5186 and 5187; a port conflict fails instead of falling back.

## Owner decisions

- [ ] Software is distributed as a GitHub release tarball; no npm registry publication
      and no separate software DOI are claimed. Revisit only as an explicit release
      decision, not as a documentation correction.
- [ ] The hosted `gnn conformance (pinned)` workflow is optional; the required local
      gate is `bun run model:check` against the pinned revision. Decide whether the
      hosted job should become mandatory for release PRs.
- [ ] The Lighthouse performance audit is separate from functional acceptance. Decide
      whether a failing/missing performance report should block a release.
