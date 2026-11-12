# TODO — Active Inference Battleship

Owner-facing forward backlog. Only real, verified items are listed; completed work
belongs in [CHANGELOG.md](CHANGELOG.md) and git history. See the
[documentation hub](docs/README.md), [flat index](docs/documentation-index.md), and
[run guide](docs/RUN_GUIDE.md) for the current commands and claim boundaries.
Current gate measurements belong in the
[generated timing document](docs/_generated/gate-timings.md), not this backlog.

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
- [ ] Full-suite Bun coverage covers imported modules, not the rendered UI, the
      Python GNN bridge, or the upstream parser pipeline. The default fast gate
      produces no coverage. Do not quote one coverage number as a whole-repository
      gate (`docs/VERIFICATION.md`).

## Environment prerequisites

- [ ] Fast development checks need Bun 1.4.4 or later and a mounted GitVault
      checkout. Full parser/package/build workflows additionally need `uv` and a
      local `Generalized_Notation_Notation` checkout with a working Python
      environment whose `sys.prefix` and `sys.base_prefix` resolve on GitVault.
      `bun run check` aliases fast and does not renew parser verification; use
      `bun run gate all` for the full release check.
- [ ] Browser acceptance (`bun run test:e2e`) and the optional Lighthouse audit need
      real installed Chrome and a production `dist/` build. The dev server and preview
      use strict ports 5186 and 5187; a port conflict fails instead of falling back.

## Owner decisions

- [ ] Software is distributed as a GitHub release tarball; no npm registry publication
      and no separate software DOI are claimed. Revisit only as an explicit release
      decision, not as a documentation correction.
- [ ] Decide whether hosted job `model-check` (displayed as
      `gnn conformance (pinned)`) should be required by release-PR branch protection.
      It runs `bun run gate all`; the local GNN-only command remains
      `bun run model:check`. No branch-protection setting is asserted here.
- [ ] The Lighthouse performance audit is separate from functional acceptance. Decide
      whether a failing/missing performance report should block a release.
