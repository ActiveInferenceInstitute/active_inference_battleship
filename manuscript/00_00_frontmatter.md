```{=html}
<aside class="paper-math-loading" aria-label="Mathematical notation" aria-busy="true" data-state="loading">
  <p id="paper-math-status" role="status" aria-live="polite">Loading mathematical notation.</p>
  <div class="paper-math-actions">
    <button type="button" id="paper-math-retry" disabled aria-describedby="paper-math-retry-help">Retry notation</button>
    <a href="editions/active_inference_battleship_combined.pdf">Open PDF</a>
    <a href="editions/active_inference_battleship.docx">Open Word</a>
  </div>
  <p id="paper-math-retry-help">Retry reloads this manuscript. The PDF and Word editions already contain rendered equations.</p>
  <noscript><p>JavaScript is required to typeset equations in this reader. Open the PDF or Word edition for rendered equations.</p></noscript>
</aside>
```

::: {.front-cover #graphical-overview}

[ORCID 0000-0001-6232-9096](https://orcid.org/0000-0001-6232-9096) · [daniel@activeinference.institute](mailto:daniel@activeinference.institute)

[DOI 10.5281/zenodo.23676081](https://doi.org/10.5281/zenodo.23676081) · [GitHub v0.5.0](https://github.com/ActiveInferenceInstitute/active_inference_battleship/releases/tag/v0.5.0)

![Graphical abstract of one observation and decision cycle. Public hit/miss feedback updates a joint belief over 256 fleet labels; the occupancy map uses a fixed 0–1 probability scale. Bars partition the policy over all unvisited cells into the three leading actions and their remainder. Values come from seed 1943 after six manual shots, with hit preference 2.5, information weight 1, precision 8, assumed noise 0.02, and uniform habits. Displayed probabilities illustrate the browser policy, not the follow-up study's greedy selections. The return arrow denotes repeated one-shot inference, not multi-step planning.](figures/graphical-abstract.png){width=6.25in}

**Version 0.5.0 from the Active Inference Institute.** The graphical overview introduces the model and interface. It does not claim unrestricted Battleship inference, multi-step planning, parameter learning, or measured educational benefit.

:::

::: {.visual-plate #visual-model}

# From GNN to a decision {.unnumbered .unlisted}

![The GNN model and its information boundary. A catalog label specifies a complete fleet. A is the hit/miss likelihood, B the static transition, C outcome preferences, D the label prior, and E the action prior. Only the environment accesses the selected label. Public coordinates and outcomes update the assistant; one chosen coordinate returns for execution. Assumed noise changes inference, while environment feedback remains truthful. This schematic defines information access, not measured strategy performance.](figures/model-atlas.png){width=6.25in}

:::

::: {.visual-plate #visual-play}

# Play and inspect beliefs {.unnumbered .unlisted}

![Playing and inspecting the recorded six-shot example. The Play view pairs player and opponent observations with posterior belief overlays and numerical diagnostics. Hit/miss symbols encode actual outcomes; overlay intensity represents the assistant's belief rather than access to hidden occupancy. Whole DOM regions were captured from one Chrome session with seed 1943 and 256 labels. Cropped panels are parts of that single illustrative state, not independent observations or evidence of human performance.](figures/dashboard-play.png){width=6.25in}

:::

::: {.visual-plate #visual-decisions}

# Explain the next action {.unnumbered .unlisted}

![Explaining an action in the same recorded session. The map locates legal cells; the scatterplot relates predicted hit probability to expected information gain in nats for every unvisited action. Distinct selected and leading-action marks identify choices even when points overlap. The numerical receipt comes from the exported six-shot snapshot. Under fixed symmetric binary noise, information is determined by the hit forecast; these axes are not independent measurements. Sandbox inspection changes hypothetical scores without firing a shot.](figures/dashboard-decisions.png){width=6.25in}

:::
