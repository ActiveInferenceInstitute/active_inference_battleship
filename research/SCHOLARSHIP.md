# Scholarship dossier: GNN Active Inference Battleship laboratory

Access and verification date: **2026-10-23**. Research notes only. Canonical project, upstream GNN, template, and staging copies were not modified. No project tests, builds, installations, Git operations, or publication were performed.

## Result and evidence standard

**21 content-checked references: 20 scholarly works and one source-pinned software reference.** With the [October 23 primary-source supplement](SCHOLARSHIP_UPDATE_20261023.md), 19 scholarly works have selected substantive reading; Sevenster retains abstract-level publisher evidence plus qualified reading of a university-hosted manuscript whose final-version equivalence is unverified. The supplement upgrades R02, R04, R08, and R20 without adding citations merely to increase the count. Prior readings are carried evidence, not fresh rereadings of every source. “Read” means the passages identified below, not an assertion that every page, proof, experiment, or cited reference was reviewed. Lindley (1956) is a separately identified metadata-only candidate and is excluded from the count and ready-to-use bibliography.

Bibliography: [references.bib](../manuscript/references.bib). Each R-number below gives its BibTeX key. All included DOI identities were matched to the actual work through publisher/author-repository records, arXiv identifier records, or DataCite registration. A repository's self-citation was not treated as independent verification of another publication.

**Strongest framing:** a methods/software contribution that makes a deliberately bounded active-sensing model inspectable and reproducible from a Generalized Notation Notation (GNN) specification through browser decisions and exported analysis. The defensible contribution is integration, explicit semantics, and executable inspection. This search establishes neither priority for that combination nor a new inference/planning principle.

**Critical prior art:** Grand et al. (2026), Section 3, Equation 4, already give the same binary symmetric-channel information-gain expression used here. Silver and Veness (2010) already evaluate a planner on a Battleship search environment. Neither the formula nor Bayesian Battleship search should be described as newly introduced by this dashboard.

## Project facts inspected read-only

Project root: /Volumes/GitVault/Username/docxology/Private/active_inference_battleship.

Read README.md, docs/MODEL.md, docs/DECISION_LAB.md, models/battleship.gnn.md, src/core/inference.ts, src/core/fleet.ts, src/core/game.ts, and the counterfactual/sweep portions of src/core/analysis.ts. Inspected source metadata in src/generated/model.json. The following are observations from those sources, rather than claims established by the external literature:

- Hidden state is a labeled entry in a finite, seeded, biased catalog of legal complete fleets; the environment draws from that same support. Entries are not deduplicated.
- Fleet occupancy is static. Game progress, turns, visited cells, and terminal conditions are separate bookkeeping. A full game-state POMDP representation would also need those variables, or equivalent history-dependent action availability.
- Inference uses each actor's own binary public shot history. The observation adapter removes sunk-ship metadata. The inference function receives the catalog and observations, not the selected hidden truth.
- Actual hit/miss feedback is deterministic. The symmetric error parameter belongs to the subjective likelihood. No parameter learning, Dirichlet updating, learned habit, neural perception, opponent modeling, or multi-step policy search is implemented by these core functions.
- The Decision explorer computes hypothetical posterior branches, fixed-belief beta/gamma sweeps, and illustrative presets; it exports analysis records separately from resumable replay.

Source identity observed:

| File | SHA-256 |
| --- | --- |
| README.md | 0a373b2c7fe60517fa62f2a097efb53fff620729ffc9e47c2b1628e7327b2893 |
| docs/MODEL.md | 2583677d45c9f2d63369925eb69718b2360c0401b632053986b13b2c6b8ab51a |
| docs/DECISION_LAB.md | b9e9198229152f95c922bbbb07043ad7e15775178598eb4b9b575d818ab1c1c6 |
| models/battleship.gnn.md | a425a3f6b0bdc8cb28a165f92c27c6ea329d3e48d2ea3f16136a93fbb447c91c |
| src/core/inference.ts | 5629ec630b8396b308e38bb039efe61a9d41909e3c13e8ce98c599e4fa85baff |
| src/core/fleet.ts | 8c00a3a4d55b343c0d9285b7cdbd801844aa31b3175140424a86d045e500dd2c |
| src/core/game.ts | e80798d0886f2480c8b30037aed0f1c6c5f563b66bf4c5675106e647d471607f |
| src/core/analysis.ts | 377e2f65e0c4c804a6e77c32023396c4e740f87429c715a341a7ca689716125a |
| src/generated/model.json | f4148ef9ae3b330cd6dcacbf5997c13fd2a3b912b3e56113531c7139084323c5 |

Generated metadata records upstream GNN commit 073f21d5b25c403d1ef0c965dd945bb2287d4de4 and parser-closure SHA-256 1dea8f4f8fad2351fed768177d48512ef91a177d38e51ff1e95fb942f2c1ffdf. This research did not rerun the parser or independently recompute its full closure digest.

## Claim-to-source ledger

These are proposed bounded manuscript statements; implementation claims also require the project's own current verification evidence.

| ID | Claim suitable for the manuscript | Sources and exact support | Boundary |
| --- | --- | --- | --- |
| C01 | Discrete active inference supplies a vocabulary for hidden states, likelihoods, preferences, and policy inference. | R02 selected pp. 5–7; R03 Sections 3, 6–7; R04 selected p. 9; supplement U01–U02. | The implementation implements a small specialization, not the neuronal process theory. |
| C02 | Epistemic and pragmatic terms can be exposed separately in a one-shot decision objective. | R01 introduction pp. 187–189; R03 Section 7; R05 Sections 3–4. | Specify the chosen distributions and approximation assumptions. |
| C03 | Expected information gain can be evaluated as predictive entropy minus expected conditional entropy. | R09 Section 2, Equations 1–2; R07 Section 6. | In this dashboard it concerns a latent fleet label, not learned model parameters. |
| C04 | The binary symmetric-channel expression has direct Battleship-related precedent. | R13 Section 3, Equations 1–4, especially Equation 4. | Different collaborative question/shot task; no priority claim for the expression. |
| C05 | Bayesian query design depends on what is to be learned and on the hypothesis space. | R08 Sections 1–2; R09 Section 2; supplement U03. | Exact calculation within a catalog is not correctness of that catalog as a world model. |
| C06 | Discovering targets and reducing uncertainty are distinct objectives. | R11 Sections 2, 4; R13 Section 3.1. | A positive information term is not a theorem about minimum shots or win rate. |
| C07 | Partial-observation planning can account for information-gathering consequences. | R10 introduction pp. 100–101; R12 Sections 2–3. | Do not claim reward-based POMDPs intrinsically lack exploration. |
| C08 | Played-game-inspired Battleship search has prior planning literature. | R12 Section 5, p. 7, Figure 2. | Its nonadjacency rules, objective, and planner differ from this dashboard. |
| C09 | Generalized free energy is a named alternative formulation, distinct from a beta-weighted score. | R06 Sections 1, 4; R05 Sections 4.1, 4.3. | Do not identify the dashboard with that alternative formulation. |
| C10 | Solitaire Battleships complexity results concern a different formal problem. | R14 publisher abstract and qualified manuscript conditions/definition; supplement U05. | No transfer of its NP-completeness claim to a fixed-size played game. |
| C11 | Accessible implementation resources predate this tool. | R04 selected introduction and pp. 7–9; R15 Statement of Need and Summary. | Complementary inspectability is plausible; educational benefit is unmeasured. |
| C12 | Executable workflows should retain versions, seeds, inputs, and figure data. | R17 Rules 1, 3–7; R16 Box 1. | Seeds and hashes alone are insufficient evidence of complete reproducibility. |
| C13 | Reproducing a computation does not establish validity of the scientific conclusion. | R18 body, paragraph beginning “The fact that an analysis is reproducible…”. | Software, numerical, rendering, and empirical validity remain separate. |
| C14 | Provenance and machine-readable metadata support reuse. | R19 Box 2, F1–F3 and R1.1–R1.3. | Describe specific practices; do not announce “FAIR certified”. |
| C15 | GNN has prior model-notation scholarship and a source-identifiable implementation. | R20 Sections 2.1 and 4.1–4.4; R21 pinned README and CITATION.cff; supplement U04. | Generalized Notation Notation is not a graph neural network. |

## Mathematical and interpretive cautions

The following algebra is a specialization of the inspected project model, not a claim of new scholarship or a report of a new numerical experiment.

For catalog posterior q(s), occupancy x(s,a), and p_a = sum_s q(s)x(s,a), define r_a = epsilon + (1−2epsilon)p_a. With natural logarithms, h(p) = −p log p − (1−p)log(1−p). Then:

$$
I_q(S;O\mid a)=H_q(O\mid a)-\sum_s q(s)H[A(\cdot\mid s,a)]
=h(r_a)-h(\epsilon).
$$

This follows because both likelihood columns have entropy h(epsilon). R09 supplies the general entropy identity; R13 explicitly gives this binary-channel specialization. The bound is 0 <= I <= log(2), and the tighter bound is log(2)−h(epsilon). This is one future observation's information about the catalog state, conditional on current history and assumptions.

For normalized preferences P_C = softmax([0,c]):

$$
\operatorname{cost}(a)=-E_{q(o\mid a)}\log P_C(o)
=\log(1+\exp c)-c r_a.
$$

The normalization term is constant across actions at fixed c, but is required when displaying expected normalized log preference or comparing absolute scores under different c. A hit preference is neither a learned reward model nor the actual game's terminal utility.

$$
G_\beta(a)=\operatorname{cost}(a)-\beta I_q(S;O\mid a),\qquad
q(a)=\operatorname{softmax}(\log E(a)-\gamma G_\beta(a)).
$$

At beta=1, elementary algebra gives the implementation’s exact identity:

$$
G_1(a)=D_{\mathrm{KL}}(q(o\mid a)\Vert P_C(o))+h(\epsilon).
$$

Call the first term **outcome KL risk**. The project's GNN equation calls expected preference cost “risk”; do not silently equate that label with outcome KL risk. At beta different from one, describe a **weighted one-step preference-and-information objective** or define “generalized EFE score” as the tool's terminology. That weighting is not Parr and Friston's generalized free energy (R06). R03's broader decompositions include evidence-bound/approximation terms; do not copy an approximate identity from the general theory and present it as universally exact. R05 motivates avoiding the statement that EFE is simply VFE averaged into the future.

**Expected versus realized information.** Pre-shot information is the outcome expectation of KL(q(s|o,a) || q(s)). The observed update's KL is one realization. It is not generally equal to pre-shot information or the realized entropy decrease. A particular observation may increase posterior entropy. The counterfactual branches should report impossibility separately from an extremely small probability. An impossible outcome has no normalized posterior. No source grants permission to replace a zero-evidence error with a uniform distribution.

**Catalog bias and duplicate mass.** Uniform labels imply probability n_l/M for a physical layout occurring n_l times. Uniform labels therefore do not mean uniform unique layouts, and the bounded randomized placement algorithm does not sample the unrestricted legal fleet space uniformly. Entropy and effective sample size refer to labels. Identical occupancy maps are observationally indistinguishable under the binary adapter, even if their ship partitions differ. Aggregating equivalent labels must sum their probability mass; deduplicating and assigning a new uniform prior changes the model. Duplicating every label equally would preserve forecasts and information gain while changing label entropy and effective sample size; these diagnostics are representation-dependent. This is a consequence of the project's state definition, not an empirical discovery.

**Subjective noise versus physical noise.** At epsilon>0, forecasts concern what the subjective sensor model predicts; actual game outcomes still equal occupancy. Probability calibration and Brier scores against truthful feedback must be interpreted under that mismatch. Changing epsilon reconstructs the public history under another likelihood; it does not estimate epsilon or inject stochastic observations. This differs from R13's potentially erroneous Spotter.

**Search, bandits, and planning.** The clearest description is finite-state Bayesian active sensing with a static latent fleet and history-dependent available cells. “POMDP-inspired” or a specified static-state POMDP specialization is appropriate. Independent-arm stochastic bandit theory does not transfer directly: queries are not repeated, and whole-fleet hypotheses correlate cells. One-shot replanning after every observation is still not multi-step contingent planning. A static beta/gamma sweep is not a rollout. A spatial E prior is hand-set, rather than a learned habit. Gamma controls policy concentration; it does not change the posterior over fleets. Greedy and sampled execution modes are distinct.

**Validity.** A software/teaching laboratory can demonstrate equations, diagnostics, sensitivity, and reproducibility without establishing biological realism, unrestricted Battleship optimality, comparative strategy superiority, calibrated physical sensing, or learning gains in students. The four presets are demonstrations, not experimental treatment groups. Existing test/render receipts must be tied to the manuscript's final source; this dossier confers no rendering or release acceptance.

## Reference dossier

### R01 — friston2015epistemic

Karl Friston; Francesco Rigoli; Dimitri Ognibene; Christoph Mathys; Thomas Fitzgerald; Giovanni Pezzulo (2015). **Active inference and epistemic value.** Cognitive Neuroscience 6(4), 187–214. DOI: [10.1080/17588928.2015.1020053](https://doi.org/10.1080/17588928.2015.1020053).

- **Read:** author-hosted [PDF](https://www.fil.ion.ucl.ac.uk/~karl/Active%20inference%20and%20epistemic%20value.pdf), abstract and introduction pp. 187–189, particularly the two decompositions on p. 189. Publisher and [PubMed](https://pubmed.ncbi.nlm.nih.gov/25689102/) match the DOI and article pages. The author's 38-page file includes commentaries through p. 224; those are not all this article.
- **Supports:** epistemic/pragmatic action valuation as the conceptual lineage of the displayed score.
- **Limit:** not evidence of this dashboard's performance, biological correspondence, or optimality. A linked 2016 corrigendum exists; its contents were unavailable, so do not transplant unchecked original equation details.

### R02 — friston2017process

Karl Friston; Thomas FitzGerald; Francesco Rigoli; Philipp Schwartenbeck; Giovanni Pezzulo (2017). **Active Inference: A Process Theory.** Neural Computation 29(1), 1–49. DOI: [10.1162/NECO_a_00912](https://doi.org/10.1162/NECO_a_00912).

- **Read (updated):** [UCL published PDF](https://discovery.ucl.ac.uk/id/eprint/1530701/1/Friston_Active_Inference_Process_Theory.pdf), selected introductory/Section 2 passages pp. 2–5, Table 1 p. 6, Section 2.1 Equations 2.1–2.2 p. 7. See supplement U01 for process/model and parameter-meaning limits.
- **Supports:** discrete generative-model and belief-propagation lineage.
- **Limit:** the paper develops neuronal dynamics and simulated phenomena; this TypeScript categorical enumerator does not implement or validate those dynamics. Its neuronal dynamics and learned parameters remain unimplemented; the detailed discrete derivation also uses the read portions of R03.

### R03 — dacosta2020synthesis

Lancelot Da Costa; Thomas Parr; Noor Sajid; Sebastijan Veselic; Victorita Neacsu; Karl Friston (2020). **Active inference on discrete state-spaces: A synthesis.** Journal of Mathematical Psychology 99, 102447. DOI: [10.1016/j.jmp.2020.102447](https://doi.org/10.1016/j.jmp.2020.102447).

- **Read:** [author preprint PDF](https://arxiv.org/pdf/2001.07203v2), Section 3's opening and factor glossary; Section 6.1, Equation 10; Section 7, Equations 13–16, pp. 15–16; Appendix C, especially Equations 42–50. The retrieved unversioned PDF identified itself as v2, dated March 31, 2020; these locators refer to that preprint, not final journal numbering. Identity verified at [UCL](https://discovery.ucl.ac.uk/id/eprint/10115398/) and [publisher](https://www.sciencedirect.com/science/article/pii/S0022249620300857).
- **Supports:** discrete factor vocabulary; state/parameter epistemic distinction; risk, ambiguity, and preference decompositions.
- **Limit:** broader approximate inference and parameter-learning machinery are absent here. Its evidence-bound terms and approximations must not be discarded without stating the implementation’s specialization.

### R04 — smith2022tutorial

Ryan Smith; Karl J. Friston; Christopher J. Whyte (2022). **A step-by-step tutorial on active inference and its application to empirical data.** Journal of Mathematical Psychology 107, 102632. DOI: [10.1016/j.jmp.2021.102632](https://doi.org/10.1016/j.jmp.2021.102632).

- **Read (updated):** [UCL published PDF](https://discovery.ucl.ac.uk/id/eprint/10143770/1/1-s2.0-S0022249621000973-main.pdf), introductory material pp. 1–2 and selected passages pp. 7–9, especially perception versus learning and Equations 10–11 p. 9. See supplement U02. Empirical fitting remains outside this implementation.
- **Supports:** motivation for practical, explicitly explained model construction and simulation resources.
- **Limit:** an existing tutorial, not evidence of an unmet literature-wide educational need or this dashboard's teaching effectiveness. Its empirical fitting methods are outside this dashboard's implemented scope.

### R05 — millidge2021whence

Beren Millidge; Alexander Tschantz; Christopher L. Buckley (2021). **Whence the Expected Free Energy?** Neural Computation 33(2), 447–482. DOI: [10.1162/neco_a_01354](https://doi.org/10.1162/neco_a_01354).

- **Read:** [author preprint v5 HTML](https://arxiv.org/html/2004.08128v5), Sections 3, 4.1 and 4.3; [publisher record](https://doi.org/10.1162/neco_a_01354) verifies final journal metadata. Final journal year differs from the 2020 preprint year.
- **Supports:** caution about deriving exploratory value merely by projecting VFE into the future; distinguishes EFE, FEF, and FEEF.
- **Limit:** a technical analysis of particular formulations, not a blanket refutation or proof of all active inference. The implementation's chosen finite objective can be stated directly without claiming a unique derivation from the free-energy principle.

### R06 — parr2019generalised

Thomas Parr; Karl J. Friston (2019). **Generalised free energy and active inference.** Biological Cybernetics 113, 495–513. DOI: [10.1007/s00422-019-00805-w](https://doi.org/10.1007/s00422-019-00805-w).

- **Read:** [publisher full text](https://link.springer.com/article/10.1007/s00422-019-00805-w), abstract, Section 1 and Section 4, “Comparison of active inference under expected and generalized free energy.”
- **Supports:** the named distinction between expected and generalized free-energy formulations.
- **Limit:** treating future outcomes as latent variables and the associated belief trajectories is not equivalent to multiplying mutual information by beta. Use this source to clarify terminology, not to retroactively identify the dashboard with that formulation.

### R07 — shannon1948communication

Claude E. Shannon (1948). **A Mathematical Theory of Communication.** Bell System Technical Journal 27(3), 379–423 (first installment; continuation 27(4), 623–656). First-installment DOI: [10.1002/j.1538-7305.1948.tb01338.x](https://doi.org/10.1002/j.1538-7305.1948.tb01338.x).

- **Read:** [corrected reprint hosted at Harvard](https://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf), introduction on logarithm bases and Section 6, “Choice, Uncertainty and Entropy,” Theorem 2 and binary-entropy discussion, reprint pp. 10–11. [Publisher metadata](https://onlinelibrary.wiley.com/doi/10.1002/j.1538-7305.1948.tb01338.x) confirms first-installment DOI/pages.
- **Supports:** discrete entropy and information units.
- **Limit:** entropy is not semantic knowledge, biological mechanism, or educational value. The companion DOI ending tb00917.x is the October installment; do not attach it to July pages.

### R08 — mackay1992selection

David J. C. MacKay (1992). **Information-Based Objective Functions for Active Data Selection.** Neural Computation 4(4), 590–604. DOI: [10.1162/neco.1992.4.4.590](https://doi.org/10.1162/neco.1992.4.4.590).

- **Read (updated):** [Caltech published PDF](https://authors.library.caltech.edu/records/efefp-2j353/files/MACnc92c.pdf), Sections 1–1.1 pp. 590–592, selected Section 2 pp. 593–594, and Section 7 p. 603. See supplement U03 for expected-information, realized-divergence, and model-dependence limits.
- **Supports:** different information targets imply different query criteria; information-based selection depends on the hypothesis-space assumption.
- **Limit:** No numerical performance guarantee is transferred from the selected passages. In the dashboard, knowing occupancy and knowing a labeled fleet are related but distinct descriptions.

### R09 — houlsby2011bald

Neil Houlsby; Ferenc Huszár; Zoubin Ghahramani; Máté Lengyel (2011). **Bayesian Active Learning for Classification and Preference Learning.** arXiv:1112.5745v1. DOI: [10.48550/arXiv.1112.5745](https://doi.org/10.48550/arXiv.1112.5745).

- **Read:** [author preprint](https://arxiv.org/pdf/1112.5745), Section 2, Equations 1–2, p. 3; [identifier record](https://arxiv.org/abs/1112.5745) verifies authors, submission year and DOI.
- **Supports:** expected posterior-entropy reduction equals conditional mutual information, expressible as predictive entropy minus mean conditional entropy.
- **Limit:** their application learns Gaussian-process parameters; the dashboard updates a finite hidden-state distribution with fixed parameters. Do not call its state inference parameter learning. The retrieved PDF's generated date says November 27, 2024, while its arXiv stamp and record identify the 2011 v1 submission; use the archive year.

### R10 — kaelbling1998pomdp

Leslie Pack Kaelbling; Michael L. Littman; Anthony R. Cassandra (1998). **Planning and acting in partially observable stochastic domains.** Artificial Intelligence 101(1–2), 99–134. DOI: [10.1016/S0004-3702(98)00023-X](https://doi.org/10.1016/S0004-3702(98)00023-X).

- **Read:** [author-hosted published PDF](https://people.csail.mit.edu/lpk/papers/aij98-pomdp.pdf), introduction pp. 100–101, particularly the paragraphs on information-gathering actions and simultaneous information/reward effects. Crossref work metadata independently matched the DOI/title/authors/venue/pages.
- **Supports:** partial observation can require information-gathering actions; full policies and long-run objectives differ from immediate scores.
- **Limit:** exact Bayesian filtering alone is not exact optimal planning. This source prevents a false contrast in which conventional POMDPs are said to exclude information gathering.

### R11 — garnett2012search

Roman Garnett; Yamuna Krishnamurthy; Xuehan Xiong; Jeff Schneider; Richard Mann (2012). **Bayesian Optimal Active Search and Surveying.** Proceedings of the 29th International Conference on Machine Learning, 843–850. Archive DOI: [10.48550/arXiv.1206.6406](https://doi.org/10.48550/arXiv.1206.6406); no proceedings DOI verified.

- **Read:** [author-hosted paper](https://www.cse.wustl.edu/~garnett/files/papers/garnett_et_al_icml_2012.pdf), Sections 2 and 4, especially the final-query target-probability argument on PDF p. 3. [CMU record](https://publications.ri.cmu.edu/bayesian-optimal-active-search-and-surveying) verifies proceedings and pages; [arXiv](https://arxiv.org/abs/1206.6406) verifies archive DOI.
- **Supports:** target discovery has a different utility from generic model learning; horizon matters.
- **Limit:** the paper's optimality results apply to its specified utility/model. They neither prove failure nor superiority of this dashboard's weighted information objective.

### R12 — silver2010pomcp

David Silver; Joel Veness (2010). **Monte-Carlo Planning in Large POMDPs.** Advances in Neural Information Processing Systems 23, 2164–2172. No DOI is listed on the inspected [official proceedings record](https://papers.nips.cc/paper/2010/hash/edfbe1afcf9246bb0d40eb4d8027d90f-Abstract.html); use that URL.

- **Read:** [official proceedings PDF](https://papers.nips.cc/paper/4031-monte-carlo-planning-in-large-pomdps.pdf), Sections 2–3 and Section 5's Battleship description on p. 7; Figure 2.
- **Supports:** direct prior art for planning in a Battleship search task with binary feedback.
- **Limit:** this is a single-agent search POMDP with nonadjacent ships, per-shot cost and a terminal reward, rather than the present alternating game or finite-catalog information score. The implementation permits ships to touch. Its reported state counts/performance are not transferable benchmarks for this implementation.

### R13 — grand2026shoot

Gabriel Grand; Valerio Pepe; Joshua B. Tenenbaum; Jacob Andreas (2026). **Shoot First, Ask Questions Later? Building Rational Agents that Explore and Act Like People.** International Conference on Learning Representations (ICLR 2026), manuscript arXiv:2510.20886v2. Archive DOI: [10.48550/arXiv.2510.20886](https://doi.org/10.48550/arXiv.2510.20886).

- **Read:** [v2 PDF](https://arxiv.org/pdf/2510.20886v2), title page; Sections 2–3, Equations 1–6, pp. 3–4; corresponding [HTML](https://arxiv.org/html/2510.20886v2). Equation 4 is the implementation’s binary-channel information formula.
- **Supports:** close mathematical prior art and a distinct Battleship-based information-seeking paradigm.
- **Limit:** natural-language questions, Spotter noise, particle inference, and a collaborative task differ from this dashboard. No human/LM outcome transfers here. The PDF says ICLR 2026 and lists Tenenbaum before Andreas; arXiv landing metadata reverses those last two. The BibTeX follows the inspected v2 title page and pins the version; first submission was 2025.

### R14 — sevenster2004battleships

Merlijn Sevenster (2004). **Battleships as a Decision Problem.** ICGA Journal 27(3), 142–149. DOI: [10.3233/ICG-2004-27303](https://doi.org/10.3233/ICG-2004-27303).

- **Read (qualified update):** publisher-indexed abstract and identity remain as originally checked. Selected substantive passages were read in a [university-hosted manuscript copy](https://ic.unicamp.br/~santiago/assets/mc558/2024%20-%202%20-%20projects/battleship%20as%20decision%20problem.pdf), conditions C1–C4 p. 142, definition pp. 143–144, theorem statement p. 145. The copy has a variant title and unresolved-reference markers. Its final-version equivalence, author-controlled custody, and reduction proof remain unverified; see supplement U05.
- **Supports:** an explicitly puzzle-specific complexity result exists.
- **Limit:** solitaire Battleships is not the two-person hidden-fleet game. Do not claim this proves complexity or optimal strategy for the dashboard. A tempting DOI ending 27304 would be wrong for this title; the verified identifier ends 27303.

### R15 — heins2022pymdp

Conor Heins; Beren Millidge; Daphne Demekas; Brennan Klein; Karl Friston; Iain D. Couzin; Alexander Tschantz (2022). **pymdp: A Python library for active inference in discrete state spaces.** Journal of Open Source Software 7(73), 4098. DOI: [10.21105/joss.04098](https://doi.org/10.21105/joss.04098).

- **Read:** [publisher paper](https://joss.theoj.org/papers/10.21105/joss.04098.pdf), Statement of Need and Summary, pp. 1–2; [publisher metadata/BibTeX](https://joss.theoj.org/papers/10.21105/joss.04098) verifies all authors and identity.
- **Supports:** existing modular open-source tooling and accessibility motivation for discrete active inference.
- **Limit:** cite as a related package, not as this dashboard's browser backend or a compatibility certification. This project uses its own procedural categorical implementation, not an observed pymdp execution.

### R16 — wilson2014practices

Greg Wilson; D. A. Aruliah; C. Titus Brown; Neil P. Chue Hong; Matt Davis; Richard T. Guy; Steven H. D. Haddock; Kathryn D. Huff; Ian M. Mitchell; Mark D. Plumbley; Ben Waugh; Ethan P. White; Paul Wilson (2014). **Best Practices for Scientific Computing.** PLOS Biology 12(1), e1001745. DOI: [10.1371/journal.pbio.1001745](https://doi.org/10.1371/journal.pbio.1001745).

- **Read:** [publisher text](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1001745), Introduction and Box 1, especially automation, authoritative data representation, assertions/testing, and design documentation.
- **Supports:** software engineering choices appropriate to inspectable computational apparatus.
- **Limit:** practice recommendations are not a certification of the present repository or proof that its tests cover the claimed behavior.

### R17 — sandve2013reproducible

Geir Kjetil Sandve; Anton Nekrutenko; James Taylor; Eivind Hovig (2013). **Ten Simple Rules for Reproducible Computational Research.** PLOS Computational Biology 9(10), e1003285. DOI: [10.1371/journal.pcbi.1003285](https://doi.org/10.1371/journal.pcbi.1003285).

- **Read:** [publisher text](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1003285), Rules 1 and 3–7, particularly underlying random seeds and raw data behind plots.
- **Supports:** provenance-rich replay/analysis exports and regenerable manuscript figures.
- **Limit:** preserve the algorithm/runtime/version and ordered controls as well as the seed. Merely exporting a JSON file or recording a hash does not establish reproducibility of all processing steps.

### R18 — peng2011reproducible

Roger D. Peng (2011). **Reproducible Research in Computational Science.** Science 334(6060), 1226–1227. DOI: [10.1126/science.1213847](https://doi.org/10.1126/science.1213847).

- **Read:** primary indexed [author manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC3383002/), abstract and body paragraphs distinguishing replication/reproducibility, plus the paragraph beginning “The fact that an analysis is reproducible…”. Direct PMC opening encountered a browser check; a focused search returned the original manuscript body, not a secondary summary. Crossref metadata independently matched identity.
- **Supports:** reproducibility as a bounded evidential property, distinct from validity.
- **Limit:** an exactly replayed demonstration is not an independent empirical replication or proof of its model's external adequacy.

### R19 — wilkinson2016fair

Mark D. Wilkinson and 52 coauthors (full verified author list in manuscript/references.bib) (2016). **The FAIR Guiding Principles for scientific data management and stewardship.** Scientific Data 3, 160018. DOI: [10.1038/sdata.2016.18](https://doi.org/10.1038/sdata.2016.18).

- **Read:** [publisher text](https://www.nature.com/articles/sdata201618), abstract, “Supporting discovery through good data management,” Box 2, and “The Principles precede implementation.” A cookie-redirect variant of the publisher page supplied the readable text.
- **Supports:** persistent identifiers, metadata, provenance, licenses, and machine-readable research objects.
- **Limit:** FAIR means Findable, Accessible, Interoperable and Reusable; it is not a software correctness or educational evaluation standard. Do not claim full FAIR compliance for a private unpublished project.

### R20 — smekal2023gnn

Jakub Smékal; Daniel Ari Friedman (2023). **Generalized Notation Notation for Active Inference Models.** Active Inference Journal, v1; deposited on Zenodo, 5 April 2023. DOI: [10.5281/zenodo.7803328](https://doi.org/10.5281/zenodo.7803328).

- **Read (updated):** [deposited v1 PDF](https://zenodo.org/records/7803328/files/GNN_v1_April5_2023_Smekal_Friedman.pdf?download=1), title p. 1, Sections 1–2.1 pp. 1–3, Section 3.1 opening p. 4, Sections 4.1–4.4 pp. 6–7, and Section 5.3 p. 8. See supplement U04. Textual/graphical/executable forms are proposed; rendering/integration improvements remain future work in that paper. Image-only example tables were not reconstructed from missing extracted text.
- **Supports:** prior GNN notation scholarship and its proposed linguistic/visual/executable “Triple Play.”
- **Limit:** aspirations for clarity, interoperability and education are not demonstrated effects in this dashboard. No journal volume/pages or peer-review status were independently established; none are invented. This publication DOI is distinct from the software concept DOI.

### R21 — friedman2026gnnsoftware

Daniel Ari Friedman (2026). **Generalized_Notation_Notation (GNN)**, software 4.3.0, source revision 073f21d5b25c403d1ef0c965dd945bb2287d4de4. Concept DOI: [10.5281/zenodo.7803313](https://doi.org/10.5281/zenodo.7803313).

- **Read:** public [pinned CITATION.cff](https://github.com/ActiveInferenceInstitute/Generalized_Notation_Notation/blob/073f21d5b25c403d1ef0c965dd945bb2287d4de4/CITATION.cff), authors/title/version/date/DOI; [pinned README](https://github.com/ActiveInferenceInstitute/Generalized_Notation_Notation/blob/073f21d5b25c403d1ef0c965dd945bb2287d4de4/README.md), Overview and Core Design Principles. [DataCite](https://api.datacite.org/dois/10.5281/zenodo.7803313) independently returns the software title, creator and concept-version relations.
- **Supports:** actual upstream notation/software provenance, distinct from graph neural networks.
- **Limit:** a concept DOI does not identify these exact parser bytes. Retain the commit and local parser-closure digest. Importing this parser does not certify every upstream backend or make this browser adapter a universal GNN interpreter.

## Manuscript contribution and gap framing

Current manuscript title: **GNN-based active inference for Battleship**. Its subtitle identifies the finite-catalog and reproducible-software scope.

Suggested positioning paragraph:

> We present a browser-based methods laboratory that connects an explicit generative-model specification to inspectable Bayesian updates and one-shot action valuations. The implementation makes a finite fleet catalog, subjective observation likelihood, normalized outcome preferences, and policy prior explicit, and exposes counterfactual posteriors and policy sensitivity alongside reproducible analysis exports. Its purpose is to support transparent examination of a bounded model; it does not estimate model parameters or establish optimal play, biological realism, or educational efficacy.

Literature positioning should cover three connections: discrete active-inference models and practical implementation resources (R01–R06, R15); information-based query design versus target discovery and partial-observation planning (R07–R13); and software/provenance practice plus GNN lineage (R16–R21). R14 belongs in a short disambiguation, not as a difficulty theorem motivating the played game.

The searched literature leaves room for a carefully described **software design contribution**: exposing the chain from a checked notation source to a particular decision and its hypothetical updates. This dossier does not establish that no prior tool has that feature combination. Avoid “first,” “novel Bayesian Battleship algorithm,” “new EFE derivation,” and “solves exploration–exploitation.” The model's finite support is an inspectability choice with prior bias, not a claim that catalog size controls a proven approximation error.

Useful manuscript additions, contingent on evidence from the implementation owner:

1. Define the environment model and subjective model separately, with a box stating what epsilon changes.
2. Include an equation/implementation table separating expected information, realized KL, preference cross-entropy, outcome KL risk, and beta-weighted G.
3. Present a decision receipt with both possible outcomes and its weighted-information identity, plus exported numbers behind the figure.
4. Report a reproducibility recipe bound to source/model hashes, runtime, seed, full controls history, catalog-generation rule, and export schema.
5. Describe software verification and rendered manuscript checks as separate procedures. Numerical examples and source inspection do not establish docxology/template rendering.

Potential verification examples are recommendations, **not checks run by this researcher**: beta=0; gamma=0; uniform E; epsilon=0; impossible evidence; independent direct-probability Bayes calculation; equality of expected branch KL and action information; deliberate duplicate-label replication; and evidence that an actor cannot condition on the selected hidden truth. A check should be shown to reject a deliberately wrong result before it supports a manuscript claim.

## Unresolved and excluded material

- **Lindley (1956): metadata-only, omitted from the ready-to-use bibliography and claim support.** D. V. Lindley, “On a Measure of the Information Provided by an Experiment,” The Annals of Mathematical Statistics 27(4), 986–1005, DOI [10.1214/aoms/1177728069](https://doi.org/10.1214/aoms/1177728069). Crossref matched author/title/venue/pages; [JSTOR issue contents](https://www.jstor.org/stable/i312788) matched the article. Project Euclid returned an iframe/availability failure and JSTOR article retrieval yielded no substantive content. Secondary copies of an abstract were not accepted as primary reading. It is appropriate to retrieve the original before adding a historical derivation claim.
- **Friston et al. corrigendum:** [10.1080/17588928.2016.1164961](https://doi.org/10.1080/17588928.2016.1164961), identified by PubMed as a correction to R01; direct publisher PDF returned HTTP 403. Contents unresolved. Use the independently stated finite-model algebra and read later sources for detailed formula claims.
- **Grand author order:** archive metadata and v2 title page disagree. Bibliography follows the actual v2 PDF. An authoritative conference metadata export should be checked before final submission if author-order uniformity is required.
- **GNN 2023 reading gap closed in this update:** selected substantive passages were retrieved from the deposited v1 PDF; see supplement U04 for exact locations and limits. This does not establish every image-only table, empirical efficacy, or universal backend interoperability. The software concept DOI remains distinct from the article DOI.
- **Further Battleship leads:** author-hosted CIG 2014 “Converging to a Player Model In Monte-Carlo Tree Search” and earlier human question-asking works referenced by Grand et al. surfaced, but were not independently content/metadata verified here and are excluded. This bounded search is not a systematic review of all Battleship literature.
- Crossref's concurrent metadata requests produced explicit HTTP 429 responses for several works; publisher/author repository records provided the identities used above. Errors were not treated as successful metadata checks.
- No claim that this dossier clears the manuscript's PDF/DOCX/HTML rendering, repository acceptance, release, publication, strategy comparison, or educational evaluation. Those are outside this research ownership.

## File validation

Observed local checks on 2026-10-23:

- Dossier sequence R01–R21 matches exactly 21 distinct bibliography keys; every entry has author, title, year, URL, access date and the venue/type fields required by its entry type.
- All access dates are 2026-10-23. The 18 DOI fields are unique; the Garnett and Grand entries explicitly identify their arXiv DOIs in notes, and Silver has no invented DOI.
- The local structural checker rejected three in-memory negative controls: missing final brace, duplicated bibliography, and a changed access date.
- Pandoc 3.12.1 parsed the actual bibliography from BibLaTeX to CSL JSON with exit code 0 and no stderr: 21 entries, no missing author lists, 53 authors for Wilkinson et al., and correctly decoded software title.
- Both output files are regular files within the assigned physical directory. No symbolic-link output was used.
- TeXLab is not installed and was not installed for this assignment; no LSP diagnostic claim is made.

These structural/parser checks do not substitute for the source-reading distinctions above or for downstream citation/render verification.
