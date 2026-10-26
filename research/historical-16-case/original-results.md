# Results of the fixed search demonstration

Each row summarizes all 16 fixed cases. Negative paired differences would mean fewer shots than greedy hit. All searches completed without exclusions.

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

Table: Complete descriptive results; differences are paired within each seed and catalog size. {#tbl:search}

::: {.pdf-only}

```{=latex}
\clearpage
```

:::

![Every fixed-case shot count, with horizontal marks at group means. The same 16 seeds appear in each strategy group; horizontal jitter only separates points and has no inferential meaning.](figures/search-comparison.png){#fig:search width=95%}
