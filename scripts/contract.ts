import { parametersSchema, parserResultSchema } from "../src/model/schema";

const equations = [
  "A(o=hit|s,u) = sensor_noise + (1-2*sensor_noise)*occupied(s,u)",
  "B(s_next|s) = identity(s_next,s)",
  "D(s) = 1/catalogue_size",
  "C = log_softmax([0,hit_preference])",
  "E(u) = softmax(habit_strength*centre_score(u))",
  "q(s|h) = normalize(D(s)*product_t A(o_t|s,u_t))",
  "information_gain(u) = H[q(o|u)] - H_binary(sensor_noise)",
  "risk(u) = -sum_o q(o|u)*C(o)",
  "G(u) = risk(u) - epistemic_weight*information_gain(u)",
  "q_pi(u) = softmax(log(E(u))-policy_precision*G(u))",
  "F_t = KL(q_t||q_previous)-E_q_t[log A(o_t|s,u_t)]",
];

export function validateContract(raw: unknown) {
  const parsed = parserResultSchema.parse(raw);
  const names = parsed.parameters.map((p) => p.name);
  if (new Set(names).size !== names.length) throw new Error("Duplicate GNN parameter");
  const variableNames = parsed.variables.map((v) => v.name);
  if (new Set(variableNames).size !== variableNames.length)
    throw new Error("Duplicate GNN variable");
  const parameters = parametersSchema.parse(
    Object.fromEntries(parsed.parameters.map((p) => [p.name, p.value])),
  );
  const normalize = (s: string) => s.replace(/\s+/g, "");
  if (normalize(parsed.equations) !== normalize(equations.join("\n")))
    throw new Error("Unsupported GNN equations: update the runtime contract explicitly");
  const expectedVariables: Record<string, number[]> = {
    s: [parameters.catalogue_size],
    o: [2],
    u: [parameters.board_size ** 2],
    A: [2, parameters.catalogue_size, parameters.board_size ** 2],
    B: [parameters.catalogue_size, parameters.catalogue_size],
    C: [2],
    D: [parameters.catalogue_size],
    E: [parameters.board_size ** 2],
    G: [parameters.board_size ** 2],
    q_pi: [parameters.board_size ** 2],
  };
  if (
    JSON.stringify(Object.fromEntries(parsed.variables.map((v) => [v.name, v.dimensions]))) !==
    JSON.stringify(expectedVariables)
  ) {
    throw new Error("GNN state dimensions do not match executable parameters");
  }
  const actual = parsed.connections
    .flatMap((c) => c.source.flatMap((s) => c.target.map((t) => `${s}>${t}`)))
    .sort();
  const expected = ["s>A", "u>A", "A>o", "D>s", "s>B", "C>G", "E>q_pi", "G>q_pi", "q_pi>u"].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error("Unsupported GNN dependency graph");
  return { parsed, parameters };
}
