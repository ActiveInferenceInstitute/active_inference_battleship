# Paired Battleship strategy study

The Active Inference Institute follow-up separates completing a fleet, finding hits early, and discriminating among catalog labels. It compares five fixed one-shot strategies on 128 fresh paired catalog/truth cases at each of 256 and 4096 labels. All 1,280 searches completed in 47,975 shots. It is not a competitive win-rate study, unrestricted solver comparison, or human-learning experiment.

The protocol was privately fixed before final searches, after the original descriptive results were known. This is a prospectively specified follow-up, not public preregistration. The information-weighted profile and five-shot endpoints are deliberate follow-up choices. Every case and comparison is retained.

Here M denotes catalog-label count and n denotes paired units. The frozen machine-readable protocol uses N as a local catalog-size placeholder; its bytes and seed derivation are preserved. In the generative-model notation N remains board width.

## Inspect the evidence

- [Exact protocol](strategy-protocol.json), including endpoints, ties, comparisons, and bootstrap specification.
- [Explicit case manifest](strategy-cases.json): master seed 20261025, separate catalog/truth/random seeds and collision counters.
- [Dated pre-execution source and runtime binding](generated/strategy-study/preexecution.json).
- [Complete traces and catalog/truth identities](generated/strategy-study/results.json).
- [Full-precision summaries, effects, intervals, counts, and adjusted p values](generated/strategy-study/analysis.json).
- [All 24 planned comparisons as CSV](generated/strategy-study/comparisons.csv).

Each unit constructs a fresh catalog and selects one label. Profiles share that catalog and truth, receiving only their own public outcomes. Separately derived pseudorandom streams do not prove independence; inference assumes independently sampled units from this frozen generator/label-selection/random-policy mechanism. Sampling is biased and truths are in support. Sizes define separate distributions, not a clean size-scaling intervention. Duplicate physical layouts retain label multiplicity.

## What each strategy optimizes

| Profile | Selection among unvisited cells | Meaning |
|---|---|---|
| Random | Uniform seeded index in ascending legal list | Ignores posterior for selection |
| Pragmatic | Highest predicted hit probability | Immediate expected hit reward |
| Epistemic | Highest expected information gain | Label discrimination |
| Combined β=1 | Lowest one-step EFE | Standard finite-model specialization |
| Weighted β=4 | Lowest information-weighted score | Generalized objective, not standard EFE |

All profiles use truthful outcomes, assumed noise zero, hit log-preference two, and uniform habits. Displayed precision four does not affect greedy choice. Information equals binary entropy of the hit forecast here, not an independent measurement. Nonrandom selection uses a global absolute 1e-12 score band, then a global 1e-12 hit-probability band, then lowest cell. This prospectively declared rule differs from the historical exact-sort selector.

At these controls, the weighted score is a constant minus 2p minus β times binary entropy h(p). For positive β its continuous optimum is p=1/(1+exp(−2/β)): about .8808 for combined and .6225 for weighted. Pure epistemic selection targets .5; pragmatic selection targets one. Available cell forecasts need not attain these values. These are immediate objective preferences, not a prediction of completion ranking.

## Read the statistics

Primary T is completion shots at hit 17. Secondary K5 is cumulative hits after five shots; E5 is label entropy after five shots divided by ln(M). Differences are profile minus pragmatic. Negative favors a profile for T/E5; positive favors it for K5. Favorable counts concern endpoint differences, not winning a competitive game.

The [exact binomial sign test](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.binomtest.html) tests equal positive/negative probability conditional on a non-tied difference. It does not test equal means or general equivalence. Integer ties are exact; E5 ties use 1e-10. All-tie rows receive p=1. The [Holm procedure](https://www.statsmodels.org/stable/generated/statsmodels.stats.multitest.multipletests.html) controls one family of 24 planned comparisons: four profiles versus pragmatic × two sizes × three endpoints. Stars use unrounded adjusted p: * ≤.05, ** ≤.01, *** ≤.001. `ns` means not rejected, not equivalent. Stars alone do not indicate which profile is favorable.

Mean-effect intervals use 10,000 paired-unit bootstrap percentile resamples, retaining ties and tiny raw entropy differences. These descriptive approximate 95% intervals are not simultaneous or inversions of the sign tests, and have no guaranteed finite-sample coverage. A zero-excluding mean interval and a non-rejected Holm sign test can coexist. The [bootstrap documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html) describes the method.

Trajectory means retain all 128 units at every shot 0–30. Completed cases carry 17 hits and actual terminal entropy; duplicate labels can leave positive entropy. No curve-wise tests or uncertainty ribbons are presented. Shots and bootstrap draws are not extra independent samples.

## Bounded findings

Pragmatic and combined completion counts tie in all 256 pairs. Epistemic has less favorable completion sign balance in both strata (Holm p=.00325 and .0000580), with descriptive mean excesses .398 and .719 shots. At M=4096, weighted selection has favorable E5 sign balance (25 favorable, 99 tied, four unfavorable; p=.00176), while its completion comparison is not rejected (p=.149). At M=256, weighted completion is less favorable (p=.0232). Random completion is less favorable in every pair. No profile dominates every endpoint and stratum; no result proves optimality or general equivalence.

## Reproduction and retained failures

Use declared Bun and the external docxology/template Python environment. The shipped manifest fixes the exact cases; reproducing the study must preserve those bytes. In an independent source copy, preserve the existing `research/generated/strategy-study` directory under a separate archival name, create an empty directory at that original path, then run `bun run research:strategies pilot` and `bun run research:strategies run`. Preparation is a first-time manifest materializer and refuses to replace bundled protocol or case files; production refuses to overwrite receipts. `bun run research:analyze` verifies inputs and regenerates derived analysis without replacing raw traces. `bun run manuscript:figures` regenerates figures and tables; the normal render/verify workflow builds three editions. Analysis uses existing NumPy and SciPy; no installation is part of this workflow.

The zero-noise uniform-label specialization filters public-consistent original labels and reuses the unchanged scorer. Excluded pilots at both target sizes passed 114,216 comparisons against full-history inference, maximum absolute error 4.45e-15, with exactly matching selected cells. A 2e-12 occupancy perturbation fails the same gate. The specialization rejects positive noise or nonuniform habits and does not replace browser inference. The runner checks the compiled GNN specification binding; it does not claim a fresh import of an independently edited live upstream parser.

The source distribution retains the first complete attempt under `generated/strategy-study/attempt-01-presentation-overlap/`. Two visual label overlaps prompted a presentation amendment and complete rerun on the same frozen cases. A second presentation amendment enlarged labels for their actual PDF/Word sizes; it is retained under `attempt-02-small-publication-labels/`. Every complete rerun must match all 1,280 original case rows exactly. No endpoints, comparisons, seed allocations, or exclusions changed. Earlier pilot receipts before formatting and finite-value guards are retained separately.

The historical 16-case study remains in `protocol.json` and `generated/results.json`, with exact source bindings and original section/figure formats in `historical-16-case/`. No retrospective significance is assigned. Source/runtime verification, rendering, empirical efficacy, and publication remain distinct gates. The current public release is maintained by the ActiveInferenceInstitute organization; see [publication details](../docs/PUBLICATION.md) for the versioned source and Zenodo manuscript archive. This protocol and its scientific traces are unchanged by the ownership and visualization update.


## Publication presentation and scholarly context

The revised publication layout uses 18-point source labels with a 9-point minimum after placement in PDF and the LibreOffice DOCX projection. A separate analytic objective figure explains continuous forecast preferences without adding empirical observations. The [statistical and search supplement](STRATEGY_SCHOLARSHIP_20261025.md) documents primary sources and their reading limits. The sign statistic uses directions, the Holm procedure adjusts the declared test family, and the descriptive bootstrap intervals estimate paired mean differences; none of these procedures is substituted for another.

The user requested larger and denser visuals after the first independently frozen strategy render. The preceding complete execution is retained under `generated/strategy-study/attempt-06-before-larger-figures/`. All 1,280 case rows and all 47,975 shots must remain exactly equal after this presentation amendment. Re-execution does not add independent cases.
