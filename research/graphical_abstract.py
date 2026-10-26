"""Data-bound graphical explanations of the Battleship inference cycle."""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

INK, MUTED, GREEN, PALE, RULE = "#182F3B", "#425C68", "#176D59", "#EAF2F2", "#9EB5BE"
RED = "#A61B1B"


def coordinate(cell):
    return f"{chr(65 + cell // 10)}{cell % 10 + 1}"


def graphical_opening(data, save):
    def canvas(height):
        figure = plt.figure(figsize=(6.4, height), facecolor="white")
        axis = figure.add_axes((0, 0, 1, 1))
        axis.set(xlim=(0, 6.4), ylim=(0, height)); axis.axis("off")
        return figure, axis

    def text(axis, x, y, value, size=10, **kwargs):
        return axis.text(x, y, value, fontsize=size, va="top", linespacing=1.4, **kwargs)

    def arrow(axis, start, end, color=GREEN):
        axis.add_patch(FancyArrowPatch(start, end, arrowstyle="-|>",
                                      mutation_scale=13, linewidth=1.2, color=color))

    def panel(axis, x, y, width, height, title, detail):
        axis.add_patch(FancyBboxPatch((x, y), width, height, boxstyle="round,pad=0.025",
                                     facecolor=PALE, edgecolor=RULE, linewidth=.7))
        text(axis, x + .14, y + height - .13, title, 11, weight="bold")
        text(axis, x + .14, y + height - .49, detail, 10, color=MUTED)

    selected = next(a for a in data["actions"] if a["cell"] == data["selectedCell"])
    figure, axis = canvas(4.5)
    text(axis, .12, 4.39, "From public observations to an inspectable decision", 12.8, weight="bold")
    text(axis, .12, 4.02, "Generalized Notation Notation → parser → checked finite-state backend", 10, color=GREEN)
    labels = ((.15, "01  OBSERVE"), (2.27, "02  UPDATE"), (4.39, "03  SELECT"))
    for x, label in labels:
        text(axis, x, 3.64, label, 10.8, weight="bold")

    board = figure.add_axes((.24 / 6.4, 1.76 / 4.5, 1.64 / 6.4, 1.64 / 4.5))
    board.set(xlim=(-.5, 9.5), ylim=(9.5, -.5), aspect="equal")
    for tick in np.arange(-.5, 10, 1):
        board.axhline(tick, color=RULE, linewidth=.4)
        board.axvline(tick, color=RULE, linewidth=.4)
    for observation in data["observations"]:
        row, column = divmod(observation["cell"], 10)
        board.text(column, row, "+" if observation["hit"] else "×", ha="center", va="center",
                   fontsize=12, color=RED if observation["hit"] else MUTED, weight="bold")
    board.set_xticks([0, 4, 9], ["1", "5", "10"])
    board.set_yticks([0, 4, 9], ["A", "E", "J"])
    board.tick_params(length=0, labelsize=8, pad=2)
    for spine in board.spines.values(): spine.set_visible(False)
    text(axis, .15, 1.48, "+ hit    × miss", 9.7, color=MUTED)
    text(axis, .15, 1.15, "Six observed cells\nNo selected-fleet access", 10, color=MUTED)

    heat = figure.add_axes((2.36 / 6.4, 1.76 / 4.5, 1.64 / 6.4, 1.64 / 4.5))
    occupancy = np.asarray(data["belief"]["occupancy"]).reshape(10, 10)
    heat.imshow(occupancy, vmin=0, vmax=1, cmap="Greens", interpolation="nearest")
    heat.set_xticks([]); heat.set_yticks([])
    row, column = divmod(selected["cell"], 10)
    heat.text(column, row, "+", color="white", ha="center", va="center", fontsize=10,
              bbox={"facecolor":INK,"edgecolor":"white","boxstyle":"square,pad=.02"})
    for spine in heat.spines.values(): spine.set_visible(False)
    legend = figure.add_axes((2.36 / 6.4, 1.50 / 4.5, 1.64 / 6.4, .08 / 4.5))
    legend.imshow(np.linspace(0, 1, 100)[None, :], aspect="auto", cmap="Greens", vmin=0, vmax=1)
    legend.set_xticks([0, 99], ["0", "1"]); legend.set_yticks([])
    legend.tick_params(length=0, labelsize=8, pad=1)
    for spine in legend.spines.values(): spine.set_visible(False)
    text(axis, 2.27, 1.15, "Posterior occupancy\nJoint belief over fleet labels", 10, color=MUTED)

    ranked = sorted(data["actions"], key=lambda a: a["probability"], reverse=True)[:3]
    probabilities = [a["probability"] for a in ranked]
    choices = [coordinate(a["cell"]) for a in ranked]
    probabilities.append(max(0., 1 - sum(probabilities))); choices.append("Other")
    policy = figure.add_axes((4.86 / 6.4, 1.86 / 4.5, 1.22 / 6.4, 1.37 / 4.5))
    policy.barh(range(4), probabilities, color=[GREEN, MUTED, MUTED, "#BACBD1"], height=.5)
    policy.set(xlim=(0, 1), yticks=range(4), yticklabels=choices, xticks=[0, 1])
    policy.invert_yaxis(); policy.tick_params(length=0, labelsize=8)
    for spine in policy.spines.values(): spine.set_visible(False)
    text(axis, 4.39, 1.48, "Action probability [0, 1]", 9.7, color=MUTED)
    text(axis, 4.39, 1.15, f'{coordinate(selected["cell"])}: {100 * selected["predictedHit"]:.1f}% hit forecast\n{selected["informationGain"]:.3f} nats information', 10, color=MUTED)
    arrow(axis, (1.94, 2.57), (2.23, 2.57)); arrow(axis, (4.06, 2.57), (4.34, 2.57))
    axis.plot([5.2, 5.2, .8, .8], [.77, .61, .61, .77], color=GREEN, linewidth=1)
    arrow(axis, (.8, .77), (.8, .85))
    text(axis, 1.3, .53, "Select one unvisited cell, observe its outcome, and update", 9.5, color=GREEN)
    text(axis, .12, .22, "256 catalog labels · 94 legal actions · one-shot planning · no parameter learning", 9.3, weight="bold")
    save(figure, "graphical-abstract")

    figure, axis = canvas(8.2)
    text(axis, .12, 8.08, "The model, the environment, and the decision", 14, weight="bold")
    text(axis, .12, 7.65, "A checked notation contract and a strict public-information boundary", 10.5, color=GREEN)
    panel(axis, .12, 6.14, 6.16, 1.10, "Specify and compile", "GNN declares fleet labels, observations, priors, preferences, and time.\nThe upstream parser and strict adapter bind the supported backend.")
    arrow(axis, (3.2, 6.08), (3.2, 5.78))
    axis.plot([3.2, 3.2], [2.10, 5.62], color=RULE, linestyle=(0, (3, 3)), linewidth=1.2)
    text(axis, .26, 5.62, "ENVIRONMENT", 11, weight="bold")
    text(axis, 3.50, 5.62, "ASSISTANT", 11, weight="bold")
    panel(axis, .12, 3.85, 2.82, 1.35, "Hidden selected fleet", "Generates deterministic\nhit or miss at the chosen cell.\nIts layout stays private.")
    panel(axis, 3.48, 3.85, 2.80, 1.35, "Joint posterior", "Given public cell and hit/miss,\nupdate joint fleet log weights.\nCells remain correlated.")
    arrow(axis, (2.98, 4.53), (3.43, 4.53))
    panel(axis, 3.48, 2.05, 2.80, 1.18, "Compare legal actions", "Preference cost − β × information\nSoftmax with precision and habits")
    arrow(axis, (4.88, 3.79), (4.88, 3.31))
    panel(axis, .12, 2.05, 2.82, 1.18, "Execute one shot", "An unvisited coordinate is chosen.\nThe next observation starts\nanother update.")
    arrow(axis, (3.42, 2.65), (2.99, 2.65))
    arrow(axis, (1.53, 3.30), (1.53, 3.79))
    panel(axis, .12, .51, 6.16, 1.10, "Scope of this implementation", "Exact Bayesian updates within a sampled, biased catalog; one-step action scoring.\nAssumed sensor noise changes beliefs, not the truthful game environment.\nNo arbitrary GNN execution, unrestricted fleet-space inference, or learning.")
    text(axis, .12, .22, "Generalized Notation Notation is a model specification, not a graph neural network.", 9.7, color=MUTED)
    save(figure, "model-atlas")
