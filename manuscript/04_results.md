# Strategy performance across three search objectives

The prospectively specified follow-up completed all 1,280 searches (256 paired catalog/truth units, five profiles) in 47,975 shots, with no exclusions. Every summary below uses all 128 units within its catalog-size stratum. The original descriptive study is retained separately below.

| M | Profile | Mean completion shots | Mean hits at 5 | Mean label entropy at 5 |
|---:|:---|---:|---:|---:|
| 256 | Random | 95.492 | 0.914 | 0.5965 |
| 256 | Pragmatic | 21.555 | 1.945 | 0.4407 |
| 256 | Epistemic | 21.953 | 1.688 | 0.4348 |
| 256 | Combined β=1 | 21.555 | 1.945 | 0.4403 |
| 256 | Weighted β=4 | 21.734 | 1.883 | 0.4407 |
| 4,096 | Random | 95.352 | 0.797 | 0.7455 |
| 4,096 | Pragmatic | 24.078 | 1.773 | 0.6547 |
| 4,096 | Epistemic | 24.797 | 1.664 | 0.6460 |
| 4,096 | Combined β=1 | 24.078 | 1.773 | 0.6547 |
| 4,096 | Weighted β=4 | 24.211 | 1.711 | 0.6475 |

Table: Follow-up endpoints from 128 fresh paired units per stratum. Completion is shots to hit all 17 occupied cells; early hits are cumulative after five shots; label entropy is divided by ln(M). Lower is preferable for completion and uncertainty, higher for hits. Profiles share catalog and truth within each unit; sizes define different sampling distributions. {#tbl:followup}

Pragmatic and combined profiles have equal completion counts in all 256 pairs. Epistemic completion is less favorable than pragmatic in 55 versus 22 non-tied cases at M = 256 and 59 versus 18 at M = 4096 (51 ties each); Holm-adjusted sign-test p values are 0.00325 and 0.0000580. Their paired mean excesses are 0.398 and 0.719 shots. Random requires more completion shots in every pair. These are conditional sign-balance rejections for this generator, not tests of equal means or unrestricted optimal play.

The information-weighted profile illustrates the distinction between identifying labels and completing a fleet. At M = 4096 its five-shot normalized entropy is lower than pragmatic in 25 cases, tied in 99, and higher in four (adjusted p = 0.00176); the mean difference is −0.00713. Its completion comparison is not rejected (adjusted p = 0.149). At M = 256 it instead has less favorable completion sign balance (adjusted p = 0.0232). No profile dominates every endpoint and stratum. Default EFE completion equality and non-rejection must not be described as proof of general equivalence.


::: {.pdf-only}

```{=latex}
\clearpage
```

:::


![Completion under five declared strategies in fresh finite-catalog cases. Each dot is one of 128 catalog/truth units per size, with the same units paired across profiles; display-only jitter separates cases. Black vertical marks are means and open diamonds are medians. The shared axis includes every random completion through shot 100; lower is better. Right hand annotations compare completion with pragmatic selection using exact two-sided tests of non-tied sign balance, adjusted together with the secondary endpoints in one 24-test Holm family. Stars indicate imbalance, not necessarily improvement: * p ≤ .05, ** p ≤ .01, *** p ≤ .001. All ties means 128 equal counts and adjusted p = 1; ns means not rejected, not equivalent. Controls are c = 2, zero noise, uniform habits; combined β = 1 and weighted β = 4. Favorable/tied/unfavorable completion counts are random 0/0/128 at both sizes; epistemic 22/51/55 and 18/51/59; combined 0/128/0 at both sizes; weighted 9/90/29 and 9/95/24, in increasing size order. Every rejected comparison has more unfavorable than favorable outcomes. Truth is sampled inside each biased generated catalog, not held out. Full adjusted p values appear in the planned-comparison tables.](figures/strategy-completion.png){#fig:search width=95%}

::: {.pdf-only}

```{=latex}
\clearpage
```

:::


![Paired effects distinguish task completion, immediate reward, and belief discrimination. Each point is the mean profile-minus-pragmatic difference across 128 paired units; whiskers are descriptive 95% percentile intervals from 10,000 case-bootstrap resamples. The three informed profiles use different shapes and colors. Negative differences favor a profile for completion and normalized label entropy; positive differences favor it for five-shot hits. Panel scales vary explicitly by endpoint and stratum. Right-hand F/T/U counts give favorable/tied/unfavorable out of 128; stars and ns refer to the separate 24-test Holm sign-balance procedure, not to interval exclusion of zero. Integer ties are exact and entropy ties use 10⁻¹⁰. Mean intervals retain raw differences and are neither simultaneous nor equivalence bounds. Random is shown on the full completion and trajectory plots and in all numerical tables; it is excluded from this magnified informed-profile view. All profiles use c = 2, zero noise and uniform habits; combined β = 1 and weighted β = 4. Truth is sampled inside each biased generated catalog, not held out.](figures/strategy-effects.png){#fig:effects width=95%}

::: {.pdf-only}

```{=latex}
\clearpage
```

:::


![The strategies pursue different goals during search. Upper panels show mean cumulative hits (0–17); lower panels show mean catalog-label entropy divided by ln(M), initially one. Each mean includes the same 128 fresh paired units at every shot in its size stratum. Line patterns and markers distinguish all five profiles, including coincident curves; the vertical dashed line marks the prospectively fixed five-shot endpoint. After completion, a case retains 17 hits and its actual terminal entropy, including uncertainty between duplicate labels. Curves through shot 30 are descriptive means without confidence bands or curve-wise tests; random completion beyond this window remains fully represented in the completion plot. Lower entropy means better label discrimination, not necessarily fewer completion shots. Sizes change support and truth pools and are not an isolated scaling comparison. All profiles use c = 2, zero noise and uniform habits; combined β = 1 and weighted β = 4. Truth is sampled inside each biased generated catalog, not held out.](figures/strategy-trajectories.png){#fig:trajectories width=95%}

## All planned comparisons and their uncertainty

All differences are profile minus pragmatic. Favorable/tied/unfavorable counts have denominator 128, not the number of non-tied cases. Significance tests condition on non-ties; intervals estimate mean raw differences descriptively. Decimal rounding is for display only; decisions use full-precision adjusted p values. The [complete protocol, seeds, traces, and analysis](../research/STRATEGY_STUDY.md) retain exact values.

### Completion shots

| M | Profile | Mean Δ (95% interval) | F / T / U | Holm p |
|------:|:-----------------|---------------------------:|:-------------|------------:|
| 256 | Random | +73.938 (+73.039, +74.773) | 0/0/128 | 1.41e-37 |
| 256 | Epistemic | +0.398 (+0.203, +0.602) | 22/51/55 | 0.00325 |
| 256 | Combined β=1 | +0.000 (+0.000, +0.000) | 0/128/0 | 1 |
| 256 | Weighted β=4 | +0.180 (+0.086, +0.281) | 9/90/29 | 0.0232 |
| 4,096 | Random | +71.273 (+70.352, +72.148) | 0/0/128 | 1.41e-37 |
| 4,096 | Epistemic | +0.719 (+0.477, +0.969) | 18/51/59 | 5.8e-05 |
| 4,096 | Combined β=1 | +0.000 (+0.000, +0.000) | 0/128/0 | 1 |
| 4,096 | Weighted β=4 | +0.133 (+0.000, +0.258) | 9/95/24 | 0.149 |

Table: Completion shots, all eight planned profile-by-size comparisons. Lower favors a profile. Parentheses give the lower and upper descriptive 95% percentile limits from 10,000 paired-case resamples; these intervals are not simultaneous. F/T/U means favorable/tied/unfavorable out of 128. Holm p values belong to the single 24-comparison family across all three endpoints. {#tbl:shots}

### Hits after five shots

| M | Profile | Mean Δ (95% interval) | F / T / U | Holm p |
|------:|:-----------------|---------------------------:|:-------------|------------:|
| 256 | Random | -1.031 (-1.297, -0.766) | 21/30/77 | 2.4e-07 |
| 256 | Epistemic | -0.258 (-0.383, -0.141) | 12/76/40 | 0.00204 |
| 256 | Combined β=1 | +0.000 (+0.000, +0.000) | 0/128/0 | 1 |
| 256 | Weighted β=4 | -0.062 (-0.148, +0.016) | 9/103/16 | 1 |
| 4,096 | Random | -0.977 (-1.273, -0.695) | 31/19/78 | 0.000139 |
| 4,096 | Epistemic | -0.109 (-0.211, -0.008) | 11/95/22 | 0.721 |
| 4,096 | Combined β=1 | +0.000 (+0.000, +0.000) | 0/128/0 | 1 |
| 4,096 | Weighted β=4 | -0.062 (-0.117, -0.016) | 2/116/10 | 0.386 |

Table: Hits after five shots, all eight planned profile-by-size comparisons. Higher favors a profile. Parentheses give the lower and upper descriptive 95% percentile limits from 10,000 paired-case resamples; these intervals are not simultaneous. F/T/U means favorable/tied/unfavorable out of 128. Holm p values belong to the single 24-comparison family across all three endpoints. {#tbl:hits5}

### Normalized label entropy after five shots

| M | Profile | Mean Δ (95% interval) | F / T / U | Holm p |
|------:|:-----------------|---------------------------:|:-------------|------------:|
| 256 | Random | +0.1557 (+0.1096, +0.2001) | 33/0/95 | 8e-07 |
| 256 | Epistemic | -0.0059 (-0.0196, +0.0084) | 51/51/26 | 0.0763 |
| 256 | Combined β=1 | -0.0004 (-0.0012, +0.0000) | 1/127/0 | 1 |
| 256 | Weighted β=4 | -0.0001 (-0.0111, +0.0114) | 27/83/18 | 1 |
| 4,096 | Random | +0.0908 (+0.0558, +0.1244) | 34/0/94 | 2.17e-06 |
| 4,096 | Epistemic | -0.0086 (-0.0142, -0.0030) | 45/61/22 | 0.0809 |
| 4,096 | Combined β=1 | +0.0000 (+0.0000, +0.0000) | 0/128/0 | 1 |
| 4,096 | Weighted β=4 | -0.0071 (-0.0108, -0.0038) | 25/99/4 | 0.00176 |

Table: Normalized label entropy after five shots, all eight planned profile-by-size comparisons. Lower favors a profile. Parentheses give the lower and upper descriptive 95% percentile limits from 10,000 paired-case resamples; these intervals are not simultaneous. F/T/U means favorable/tied/unfavorable out of 128. Holm p values belong to the single 24-comparison family across all three endpoints. {#tbl:entropy5}

## The original exploratory comparison

The original 16 fixed cases per size used four profiles and exact floating-point tie ordering. Their 128 searches, source bindings, protocol, and unaltered figure formats remain in the source distribution. The table below is preserved; no retrospective p values or inferential intervals are assigned to those exploratory cases.

| Catalog | Policy | Mean shots | Median | Range | Mean Δ vs hit |
|---:|:---|---:|---:|:---|---:|
| 256 | Uniform random | 94.94 | 98.5 | 74–100 | +73.44 |
| 256 | Greedy hit | 21.50 | 21.5 | 18–25 | +0.00 |
| 256 | Greedy information | 21.56 | 21 | 18–26 | +0.06 |
| 256 | One-step EFE | 21.50 | 21.5 | 18–25 | +0.00 |
| 4,096 | Uniform random | 94.62 | 96 | 83–100 | +70.31 |
| 4,096 | Greedy hit | 24.31 | 24 | 20–30 | +0.00 |
| 4,096 | Greedy information | 25.12 | 25 | 22–32 | +0.81 |
| 4,096 | One-step EFE | 24.31 | 24 | 20–30 | +0.00 |

Table: Original descriptive demonstration, n = 16 paired units per size and 128 searches total. Mean Δ is profile minus greedy hit in completion shots, with negative values indicating fewer shots. EFE and hit completion counts tie in all 32 pairs, with ordered traces identical in 27. These exploratory results use the historical selector and are separate from the fresh follow-up. {#tbl:search}
