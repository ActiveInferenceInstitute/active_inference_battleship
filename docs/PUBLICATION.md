# Public release v0.5.0

- [GitHub source and versioned release](https://github.com/ActiveInferenceInstitute/active_inference_battleship/releases/tag/v0.5.0).
- [Zenodo manuscript and companion archive](https://doi.org/10.5281/zenodo.23676081).
- [Play the dashboard](https://activeinferenceinstitute.github.io/active_inference_battleship/) and [read the manuscript](https://activeinferenceinstitute.github.io/active_inference_battleship/paper/).

The DOI is printed on the PDF cover and appears in the abstract and citation metadata. The archive and repository cross-link. The `gh-pages` branch contains the built static dashboard and the complete paper reader under `paper/`; `main` and tag `v0.5.0` identify source. The repository release supplies checksummed PDF, Word, reader, dashboard, core tarball, and source/research archives. GitHub's automatically generated tag archives also identify the released source.

Software is MIT licensed. The manuscript, original figures, and research data are CC BY 4.0. Third-party dependencies and cited works retain their own rights. There is no package-registry publication and no separate software DOI. The manuscript DOI identifies this deposited paper with its companions.

Historical acceptance/update documents and scholarship notes describe dated local work. Their draft-status sentences and limited verdicts are retained as historical records, not current release metadata. Use `project.json`, `CITATION.cff`, and the release landing pages for current identifiers. A public release does not enlarge the finite-catalog, one-shot model or establish scientific or educational efficacy.

To rebuild the Pages application from the checked-in compiled model, run `bun install --frozen-lockfile`, then `bun x --no-install vite build --base ./ --outDir .cache/pages-site`. Copy the complete rendered `output/web/` directory to `.cache/pages-site/paper/`. This convenience build does not reparse GNN. The full actual-parser and manuscript workflows are documented separately and require their stated pinned dependencies.

## Organization edition and lecture

Version 0.5.0 moves the existing repository to the ActiveInferenceInstitute organization and rebuilds the site at its organization Pages address. See [migration details](ORGANIZATION_MIGRATION.md). The initial Zenodo record remains unchanged; this version has its own DOI-bearing cover and archive record.

The release includes a narrated 20-minute lecture, 40-slide PDF, complete transcript, caption tracks, and a source ledger. Animated fleet beliefs, GNN dependencies, paired effects, and descriptive trajectories use retained source values. Interpolated motion adds no observations. The voice is synthetic local Aiden. Producer checks, prior independent scientific reviews, and publication availability remain separate claims; the lecture is not a new scientific experiment.
