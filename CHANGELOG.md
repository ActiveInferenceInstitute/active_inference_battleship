# Changelog

## Unreleased

- Adopt the shared GNN–FEP reader: advance `models/gnn.pin.json` from `v5.0.3` (`8f293d9b`) to `v5.1.0` (`75c834bd`), the first revision of the estate pin containing `src/gnn/importers.py`. `scripts/parse_gnn.py` now runs `python -m gnn.importers check --repo . --require-pointer --workflow .github/workflows/ci.yml --job model-check` from the materialized pinned revision, and the compiled model is reimported at that revision. Delete this repository's own pin reader (`scripts/pin.ts`) and its pin-shape test; `scripts/gnn-source.ts` keeps only the git objects a fetch needs. Manuscript variables come from `gnn.importers.importer_variables` instead of an inline pin read, and `.github/GNN.md` records the adopted state. The interim "migration blocked" record is superseded.
- Validate InstituteOS sidecar `docs[]` declarations relative to `.aii/` in the offline docs gate, preserving the original valid paths. Add a dated correction recording that the verified GNN bibliography replacement is already applied.
- Declare the canonical `gnn-importer-pin/v1` schema and a record date in `models/gnn.pin.json`. The importer now requires that schema instead of accepting an unlabeled pin, so the GNN reader's `pin-schema-legacy` warning is resolved.
- Assert the pinned tag and commit against the compiled artifact in the model suite, so a pin that drifts from `src/generated/model.json` fails a local gate rather than only the hosted GNN conformance job.
- Centralize gate selection in `scripts/run.ts`: default `fast` and legacy `check` cover lint, types, docs, and fast tests without builds, parser/package integration, or coverage. `all` retains full tests with coverage and the production build, deduplicating the pinned GNN check.
- Run the full gate in hosted job `model-check`, retaining the `gnn conformance (pinned)` display name and commit-pinned Bun/uv setup actions.
- Refresh the documentation hub, add a flat long-lived-document index, and link the run guide and generated gate timings. Document the unchanged GNN revision, gate aliases, historical-receipt boundaries, and separate browser/manuscript acceptance without hand-maintained current counts.
- Keep installed-package acceptance offline after locked setup; cached real dependencies and all consumer assertions remain mandatory.
- Resolve declared manuscript variables from the canonical pin into render-only copies, hash their inputs, and enforce the complete figure registry before rendering. Allow an explicit vault-local `TEMPLATE_PYTHON` without modifying the template checkout.
- Regenerate capture-bound manuscript opening assets from a real production dashboard capture; preserve local-only historical evidence paths as labels rather than broken public links.

## 0.5.0 — Organization and visual explanation edition

- Transfer the existing repository, history, and releases to the `ActiveInferenceInstitute` organization.
- Update current repository, Pages, release, package, citation, manuscript, and archive links. Retain the original Zenodo deposit and qualify dated acceptance records as historical.
- Add a five-stage interactive GNN walkthrough using the actual source and compiled specification digest. It explains the real build boundary without pretending to run Python in the browser.
- Add selected-action crosshairs and numeric readouts to the hit–information plot; make the complete legal-action table available on demand.
- Improve diagnostic chart hierarchy, highlight current observations, and provide bounded chart-entry motion with a reduced-motion alternative.
- Add a 20-minute narrated lecture with semantic model diagrams, actual posterior-weight changes, paired-effect intervals, dashboard footage, captions, transcript, and slides.
- Preserve the published scientific traces, 1,280 searches, and 24-comparison design. This is not a new scientific replication or efficacy claim.

## 0.4.0 — Initial public release

The original manuscript and companions remain archived at [DOI 10.5281/zenodo.23670188](https://doi.org/10.5281/zenodo.23670188). The earlier GitHub release remains in the transferred repository's history.
