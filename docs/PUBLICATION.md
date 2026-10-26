# Public release v0.4.0

- [GitHub source and versioned release](https://github.com/ActInfInstitute/active_inference_battleship/releases/tag/v0.4.0).
- [Zenodo manuscript and companion archive](https://doi.org/10.5281/zenodo.23670188).
- [Play the dashboard](https://actinfinstitute.github.io/active_inference_battleship/) and [read the manuscript](https://actinfinstitute.github.io/active_inference_battleship/paper/).

The DOI is printed on the PDF cover and appears in the abstract and citation metadata. The archive and repository cross-link. The `gh-pages` branch contains the built static dashboard and the complete paper reader under `paper/`; `main` and tag `v0.4.0` identify source. The repository release supplies checksummed PDF, Word, reader, dashboard, core tarball, and source/research archives. GitHub's automatically generated tag archives also identify the released source.

Software is MIT licensed. The manuscript, original figures, and research data are CC BY 4.0. Third-party dependencies and cited works retain their own rights. There is no package-registry publication and no separate software DOI. The manuscript DOI identifies this deposited paper with its companions.

Historical acceptance/update documents and scholarship notes describe dated local work. Their draft-status sentences and limited verdicts are retained as historical records, not current release metadata. Use `project.json`, `CITATION.cff`, and the release landing pages for current identifiers. A public release does not enlarge the finite-catalog, one-shot model or establish scientific or educational efficacy.

To rebuild the Pages application from the checked-in compiled model, run `bun install --frozen-lockfile`, then `bun x --no-install vite build --base ./ --outDir .cache/pages-site`. Copy the complete rendered `output/web/` directory to `.cache/pages-site/paper/`. This convenience build does not reparse GNN. The full actual-parser and manuscript workflows are documented separately and require their stated pinned dependencies.
