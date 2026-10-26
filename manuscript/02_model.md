# Finite fleet beliefs and one step action selection

Definitions fix the assumed distributions and objective; propositions state identities under those assumptions. The posterior update appears in @eq:posterior, the action policy in @eq:policy, and the realized surprise identity in @eq:conditional-surprise. These labels and formalism numbers are generated consistently across editions.

## Hidden fleet labels and public observations

::: {.definition #def:fleet title="Finite fleet model"}

Let $S=\{1,\ldots,M\}$ index a catalog of complete legal fleets on an $N\times N$ board. Let $x(s,a)\in\{0,1\}$ indicate occupancy of cell $a$ in entry $s$. Ships are straight, do not overlap, and may touch. The default model has $N=10$, ship lengths $(5,4,3,3,2)$, and $M=4096$. A seeded bounded randomized placement procedure constructs the catalog; it is not a uniform sampler over the space of all legal fleets. The environment draws a label uniformly from that same catalog. Duplicate entries retain their multiplicity and prior mass.

The state is static. A shot queries one previously unvisited cell and returns $o\in\{0,1\}$, denoting miss or hit. The assistant's subjective likelihood and prior are

$$
A(1\mid s,a)=\epsilon+(1-2\epsilon)x(s,a),\qquad
A(0\mid s,a)=1-A(1\mid s,a),
$$ {#eq:likelihood}

$$
B(s'\mid s)=\mathbf{1}[s'=s],\qquad D(s)=M^{-1}.
$$ {#eq:static-prior}

:::

The permitted likelihood parameter is $0\leq\epsilon\leq0.25$. Actual game feedback always equals selected-fleet occupancy. Thus positive $\epsilon$ is a subjective model mismatch, not a physical corruption process. It does not make the environment stochastic, and the program does not learn its value. Sunk-ship announcements are interface metadata excluded from the observation adapter.

::: {.definition #def:belief title="Belief conditional on public observations"}

For public history $h_t=((a_1,o_1),\ldots,(a_t,o_t))$, the posterior is

$$
q_t(s)=\frac{D(s)\prod_{i=1}^{t} A(o_i\mid s,a_i)}
 {\sum_{j=1}^{M}D(j)\prod_{i=1}^{t}A(o_i\mid j,a_i)}.
$$ {#eq:posterior}

:::

The belief in [@def:belief] is exact categorical Bayes for the declared catalog, evaluated numerically with log weights and log-sum-exp normalization. It is not exact inference over every legal physical fleet. If the denominator is zero, inference returns a specific unsupported-observation error instead of substituting a uniform posterior. Ordinary truthful play at $\epsilon=0$ preserves the selected label in support. Turn order, fired cells, and terminal conditions are game bookkeeping; a full game-state POMDP would also include those variables or equivalent history-dependent action availability.

## Expected information and outcome preferences

For an available action define occupancy $p_a=\sum_s q_t(s)x(s,a)$ and the subjective hit forecast $r_a=\epsilon+(1-2\epsilon)p_a$. Occupancy and forecast coincide only at zero noise or particular probabilities. With natural logarithms, binary entropy is $h(p)=-p\log p-(1-p)\log(1-p)$, with $0\log0=0$. Conditional likelihood entropy is the same for every state, so

$$
I_a=I_q(S;O\mid a,h_t)=h(r_a)-h(\epsilon).
$$ {#eq:information}

This is expected information about a fleet label from one observation. The identity is a specialization of the active-learning entropy decomposition [@houlsby2011bald], with direct Battleship-related precedent [@grand2026shoot]. Its tighter bound is $0\leq I_a\leq\log2-h(\epsilon)$. It is measured in nats, not bits, and is not a measure of a reader's understanding.

Preferred outcome probabilities are $P_C=\operatorname{softmax}([0,c])$, in miss/hit order. Their expected negative log preference is

$$
L_a=-\sum_o q(o\mid a)\log P_C(o)=\log(1+e^c)-c r_a.
$$ {#eq:preference-cost}

The normalization term is constant across actions at fixed $c$, but must remain in displayed absolute costs and expected log-preference rewards. The GNN source names $L_a$ “risk.” To avoid a common ambiguity, we reserve *outcome Kullback–Leibler (KL) risk* for $D_{\mathrm{KL}}(q(o\mid a)\Vert P_C)$, which equals $L_a-h(r_a)$.

::: {.definition #def:policy title="Weighted one-step objective and policy"}

The weighted objective and policy are

$$
G_\beta(a)=L_a-\beta I_a,\qquad
q(a)=\frac{E(a)e^{-\gamma G_\beta(a)}}
 {\sum_{b\text{ available}}E(b)e^{-\gamma G_\beta(b)}}.
$$ {#eq:policy}

:::

Here $0\leq\beta\leq4$ weights information and $0\leq\gamma\leq32$ controls policy concentration. The hit preference ranges from zero to eight. A nonnegative hand-set spatial parameter $k\leq4$ defines $E(a)\propto e^{kz_a}$, where

$$
z_a=1-\frac{|\operatorname{row}(a)-(N-1)/2|+
 |\operatorname{col}(a)-(N-1)/2|}{N-1}.
$$ {#eq:habit}

This “habit” is a specified policy prior, not a learned behavior. Fired cells are excluded before normalizing $E$ and $q$. At $\gamma=0$, $q=E$; at $k=0$, $E$ is uniform. Changing $\gamma$ does not change beliefs about fleets. Greedy action selection and seeded sampling from $q$ are separate execution modes.

::: {.proposition #prop:efe title="Preference and information identity"}

At $\beta=1$ the implemented score has the exact finite-model identity

$$
G_1(a)=D_{\mathrm{KL}}(q(o\mid a)\Vert P_C)+h(\epsilon).
$$ {#eq:risk-ambiguity}

:::

The identity in [@prop:efe] follows by adding and subtracting predictive entropy. At other weights, the same risk–ambiguity identity does not hold. Stating these distributions directly avoids importing approximation assumptions from a broader active-inference derivation without justification [@dacosta2020synthesis; @millidge2021whence].

## Observed updates and hypothetical outcomes

::: {.definition #def:diagnostics title="Realized update diagnostics"}

Before observing a shot, $I_a$ averages over possible outcomes. After outcome $o_t$, the realized diagnostic is $K_t=D_{\mathrm{KL}}(q_t\Vert q_{t-1})$. Define accuracy $U_t=\mathbb{E}_{q_t}\log A(o_t\mid s,a_t)$ and conditional variational free energy $F_t=K_t-U_t$.

:::

::: {.proposition #prop:surprise title="Conditional surprise identity"}

Exact Bayes gives

$$
F_t=-\log\sum_s q_{t-1}(s)A(o_t\mid s,a_t).
$$ {#eq:conditional-surprise}

:::

Using [@def:diagnostics] and [@prop:surprise], the dashboard displays the residual between the two sides, cumulative conditional surprise, entropy, effective sample size $1/\sum_s q_t(s)^2$, and the one-shot Brier loss $(r_{a_t}-o_t)^2$. Retained log probabilities prevent an underflowed prior weight from becoming an artificial infinite KL when later evidence favors it. These are finite-precision diagnostics, not proof that the model describes an external sensor.

The decision explorer also computes $q(s\mid o,a)$ for each possible outcome. A zero-evidence branch has no normalized posterior and is labeled impossible. A very rare finite log-evidence branch is kept distinct from impossibility. Expected posterior entropy reduction and expected branch KL both equal $I_a$, while an individual branch can increase entropy. Realized entropy reduction and posterior/prior divergence are different quantities; their equality holds after averaging over the predictive outcomes, not for each observation [@mackay1992selection]. Counterfactual branches and fixed-belief parameter sweeps remain one-shot calculations; they are not contingent multi-step planning.

Label entropy and effective sample size depend on representation. If every catalog label is duplicated equally, forecasts and information gain are unchanged, but entropy increases by the logarithm of the duplication factor and effective sample size scales with it. Uniform labels do not imply uniform distinct layouts. Identical occupancy maps can remain observationally indistinguishable even when their ship partitions differ. The diagnostics therefore describe the stated catalog, not the number of all physically possible fleets.
