import type { OutcomeForecast } from "../core/analysis";
import { actionLogOdds } from "../core/analysis";
import { coordinate } from "../core/fleet";
import type { ActionScore, Belief, Controls } from "../core/inference";

export function DecisionReceipt({
  action,
  leader,
  belief,
  controls,
  branches,
  size,
}: {
  readonly action: ActionScore;
  readonly leader: ActionScore;
  readonly belief: Belief;
  readonly controls: Controls;
  readonly branches: readonly OutcomeForecast[];
  readonly size: number;
}) {
  const expectedEntropy = branches.reduce(
    (sum, branch) => (branch.kind === "possible" ? sum + branch.probability * branch.entropy : sum),
    0,
  );
  return (
    <section className="panel decision-receipt" aria-labelledby="receipt-title">
      <div className="panel-heading">
        <h2 id="receipt-title">Why this action?</h2>
        <span className="tag mono">{coordinate(action.cell, size)}</span>
      </div>
      <ol className="reasoning-steps">
        <li>
          <h3>
            Predict the observation <span className="muted mono">A</span>
          </h3>
          <p>
            The fleet posterior puts a ship here with {(action.occupancy * 100).toFixed(2)}%
            probability. With assumed noise ε = {controls.sensorNoise.toPrecision(3)}, the hit
            forecast is {(action.predictedHit * 100).toFixed(2)}%.
          </p>
          <code>r = ε + (1 − 2ε) · P(ship) = {action.predictedHit.toFixed(6)}</code>
        </li>
        <li>
          <h3>
            Balance preference and information <span className="muted mono">C / G</span>
          </h3>
          <p>
            Preference cost {action.risk.toFixed(4)} nats minus β-weighted information{" "}
            {(controls.epistemicWeight * action.informationGain).toFixed(4)} nats.
          </p>
          <code>
            G = {action.risk.toFixed(4)} − {controls.epistemicWeight.toFixed(2)} ×{" "}
            {action.informationGain.toFixed(4)} = {action.expectedFreeEnergy.toFixed(4)} nats
          </code>
        </li>
        <li>
          <h3>
            Normalize choices <span className="muted mono">E / q_pi</span>
          </h3>
          <p>
            Habit prior {(action.habit * 100).toFixed(3)}%; posterior choice probability{" "}
            {(action.probability * 100).toFixed(3)}%. The leading action is{" "}
            {coordinate(leader.cell, size)}. Sampling can choose any action with positive mass.
          </p>
          <code>
            log[q({coordinate(action.cell, size)}) / q({coordinate(leader.cell, size)})] = log E
            ratio − γ · ΔG = {actionLogOdds(action, leader, controls.policyPrecision).toFixed(4)}
          </code>
        </li>
      </ol>
      <details className="lab-disclosure" open>
        <summary>If the next observation were…</summary>
        <p className="small muted">
          Hypothetical updates, not revealed outcomes. No shot is fired. A surprising outcome can
          increase entropy; the average reduction equals expected information gain.
        </p>
        <div className="outcome-grid">
          {branches.map((branch) => (
            <div className="outcome-branch" key={String(branch.hit)}>
              <h3>{branch.hit ? "Hit" : "Miss"}</h3>
              {branch.kind === "possible" ? (
                <>
                  <strong className="mono">
                    {(branch.probability * 100).toFixed(2)}%{" "}
                    <span className="small muted">forecast</span>
                  </strong>
                  <dl>
                    <div>
                      <dt>Posterior entropy</dt>
                      <dd>{branch.entropy.toFixed(4)} nats</dd>
                    </div>
                    <div>
                      <dt>Realized KL update</dt>
                      <dd>{branch.informationGain.toFixed(4)} nats</dd>
                    </div>
                    <div>
                      <dt>Effective hypotheses</dt>
                      <dd>{branch.effectiveStates.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt>Log probability</dt>
                      <dd>{branch.logProbability.toFixed(4)}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p>
                  Impossible under this catalog and likelihood (probability 0). No posterior is
                  defined.
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="small muted">
          H before = {belief.entropy.toFixed(4)}. Expected H after = {expectedEntropy.toFixed(4)}.
          expected reduction = {(belief.entropy - expectedEntropy).toFixed(4)} nats.
        </p>
      </details>
    </section>
  );
}
