# Executable model

## State, action, and observation

Let s be one of M labeled catalog fleet entries. Let a be an unvisited board cell, and x(s,a) ∈ {0,1} indicate fleet occupancy there. Observations o ∈ {0,1} mean miss/hit. Catalog generation is seeded randomized legal placement, not uniform sampling of every legal fleet. The environment chooses a catalog entry uniformly; duplicated layouts therefore have the prior mass of all their labels.

The GNN declarations define a procedural action-conditioned likelihood A[2,M,N²], static transition B[M,M], preferences C[2], prior D[M], and policy prior E[N²]. Dense tensors are a notation for this factorization; the runtime never materializes them.

```text
A(1 | s,a) = ε + (1−2ε) x(s,a)
A(0 | s,a) = 1−A(1 | s,a)
B(s′ | s) = 1[s′=s]
D(s) = 1/M
q_t(s) ∝ D(s) Π_{i=1}^t A(o_i | s,a_i)
```

Updates use log weights and log-sum-exp normalization. Zero likelihood remains exactly zero when ε=0. If every hypothesis has zero likelihood, inference raises `UnsupportedObservationError`; it never resets to a uniform prior or fabricates a belief. In an ordinary game, the true fleet remains in support because it was drawn from the same catalog and observations are truthful. Replay files cannot inject observations; they supply actions and the environment recomputes outcomes.

The agent observation adapter strips sunk metadata. The game UI can announce a sunk ship, but inference intentionally uses only the binary likelihood above. Fleet layouts do not move when cells are hit. Each actor may query a cell at most once.

## Policy

Let p_a = Σ_s q(s)x(s,a), r_a = ε+(1−2ε)p_a, and h(p) = −p log p−(1−p) log(1−p).

```text
P_preferred = softmax([0,c])            # miss, hit order
cost(a) = −E_q(o|a)[log P_preferred(o)] = log(1+exp(c))−c r_a
ambiguity(a) = E_q(s)[H(A(·|s,a))] = h(ε)
IG(a) = h(r_a)−h(ε)
outcome_KL_risk(a) = cost(a)−h(r_a)
G_β(a) = cost(a)−β IG(a)
```

At β=1, `G = outcome_KL_risk + ambiguity`. The information gain is mutual information between the fleet label and one future observation, bounded by log 2 nats. It is computed exactly for the catalog. At β≠1 the interface explicitly calls this generalized EFE, rather than claiming the risk/ambiguity identity still holds.

The center score is `1−(|row−centre|+|column−centre|)/(N−1)` with `centre=(N−1)/2`. The habit prior is `E(a)=softmax(k*centre_score(a))` over available cells. The policy posterior is:

```text
q(a) = softmax(log E(a)−γ G_β(a))
```

At γ=0, q(a)=E(a). At k=0, E is uniform. At β=0, action valuation uses preferences alone; neutral preferences and a uniform habit then give a uniform policy. Sampling uses the policy distribution and an explicit seeded stream. Greedy selection chooses the largest policy probability, with ascending cell index breaking ties. Greedy ties do not consume random numbers. Excluded cells are removed before normalization.

## Observation diagnostics

```text
surprise_t = −log Σ_s q_{t−1}(s) A(o_t | s,a_t)
realized_KL_t = KL(q_t || q_{t−1})
accuracy_t = E_q_t[log A(o_t | s,a_t)]
F_t = realized_KL_t − accuracy_t
F_t = surprise_t                       # exact Bayes identity, up to floating point
ESS = 1/Σ_s q_t(s)²
Brier_t = (r_{a_t,before update}−o_t)²
```

The UI displays `abs(F_t−surprise_t)` as a diagnostic residual. Cumulative surprise is minus the summed conditional log evidence. H[q(s)] and ESS describe catalog labels, including duplicate layouts. They are not estimates of the number of all possible physical fleets. Realized KL differs from pre-observation expected information gain; the charts label them separately.

All logs are natural and all entropy, KL and energy values use nats. Occupancy and observation probabilities are distinct whenever ε>0. The target heatmap shows occupancy; policy and forecasting calculations use the noisy likelihood r. VFE is a per-observation conditional quantity; this tool is not optimizing a neural variational approximation or estimating model parameters.

## What changes when a control moves

Changing ε recomputes the entire posterior from the original catalog and observation history. Other controls change action scores and policy probabilities without altering past hit/miss data. Both agents share the chosen controls but retain separate observation histories. Historical diagnostic rows are reconstructed under current settings. The replay retains the ordered settings events, so past action choices are reproducible even when later controls changed.

The catalog and environment seed are fixed during a game. Changing the setup fields has no effect until New game. A replay has version 1 and binds the GNN specification SHA-256. Future algorithm changes that alter deterministic reconstruction must bump the replay version. The source-bound generated model separately records the upstream revision and parser directory hashes.

## GNN adapter limits

Replay recording coalesces controls and action-mode events between shot/begin boundaries. Shuffles carry an absolute pre-launch count; multiple shuffles can therefore become one checkpoint. The deployed fleet and every action-relevant setting remain exactly reproducible. At most one controls event and one mode event are retained between actions, keeping a supported board's canonical trace below the import limit. Shuffle counts are limited to one million; exceeding that bound is an explicit error. Version-1 files without an absolute shuffle count retain their original increment-by-one meaning.

The adapter requires the upstream parsed time specification to be Dynamic, DiscreteTime, horizon 1, with no continuous step size. Duplicate variables are rejected before constructing the dimension lookup. Expected log-preference reward is `−cost`, including the normalization constant; the separate unnormalized reward `r*c` is not displayed under that label.

The upstream parser is permissive; this project's strict post-parse adapter supplies the executable contract. Supported parameters, dimensions, graph, model name, and equation text must agree. Unsupported equations fail rather than being evaluated with arbitrary code or silently ignored. Changing board/fleet parameters requires matching GNN dimensions and passing the adapter's size/density bounds. The browser supports square boards 6–12, up to 6 ships of length 2–6, and at most 40% occupancy. The default UI exposes only catalog-size changes; other model edits require compilation.

`A`, `B`, and the equations are implemented by typed runtime functions for contract `binary-static-fleet-v1`; this is an explicit backend adapter, not a universal GNN interpreter. The parser-directory digest binds the local parser Python sources plus `src/gnn/__init__.py`. It does not prove the behavior of every transitive dependency or certify the entire upstream pipeline.

## Counterfactuals and sensitivity

For an available cell a and each possible binary outcome o, the Decision explorer evaluates `log Z_o = logsumexp(log q(s) + log A(o|s,a))`, then `log q_o(s) = log q(s) + log A(o|s,a) − log Z_o`. It reports `P(o)=exp(log Z_o)`, `H[q_o]`, ESS and `KL(q_o || q)`. An outcome with `log Z_o = −Infinity` is explicitly impossible and has no defined posterior. Retained log weights preserve hypotheses whose exponentiated weights underflow; the displayed log probability distinguishes extremely rare outcomes from impossible ones.

Expected posterior entropy is `Σ_o P(o) H[q_o]`; the average reduction `H[q] − Σ_o P(o)H[q_o]` equals expected information gain up to floating point. Individual outcomes can increase entropy. These are subjective predictions, not access to the hidden board and not two-step planning. The actual game still returns deterministic feedback.

The β/γ sweeps hold the current posterior and all other controls fixed, evaluating nine separate one-shot policies. Changing sandbox ε instead reconstructs the complete public history under that new likelihood. The sandbox starts from current live controls each time the view opens, and applies settings only through the ordinary validated controls event. Analysis snapshots include the model hash, seed, catalog size, actor, public observations, controls, posterior weights, every available action score, counterfactuals, and the chosen sweep. They are distinct from resumable version-1 replay files.

## Limits

- Finite, sampled, biased fleet prior; no exhaustive unrestricted Battleship inference.
- One-step active sensing; no multi-shot policy tree, opponent-model reasoning, or strategic placement optimization.
- Shared settings and symmetric sensors; no parameter learning, Dirichlet updates, or neural perception.
- Deterministic game feedback with optional subjective sensor mismatch.
- Seeded local reproducibility, not cryptographic secrecy or secure multiplayer.
- Automated tests and browser evidence establish bounded implementation behavior, not empirical scientific superiority.

The formulation specializes [Da Costa et al. (2020)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7732703/) and [Friston et al. (2017)](https://discovery.ucl.ac.uk/id/eprint/1530701/); the finite catalog, game rules, and bounded backend are project-specific choices.
