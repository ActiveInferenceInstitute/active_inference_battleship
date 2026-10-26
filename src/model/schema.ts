import { z } from "zod";
import { controlsSchema } from "../core/inference";

export const parametersSchema = z
  .strictObject({
    board_size: z.number().int().min(6).max(12),
    ship_lengths: z.array(z.number().int().min(2).max(6)).min(1).max(6),
    catalogue_size: z.number().int().min(16).max(16384),
    epistemic_weight: z.number(),
    hit_preference: z.number(),
    policy_precision: z.number(),
    sensor_noise: z.number(),
    habit_strength: z.number(),
    seed: z.number().int().min(0).max(4294967295),
  })

  .superRefine((p, ctx) => {
    if (
      p.ship_lengths.some((n) => n > p.board_size) ||
      p.ship_lengths.reduce((a, b) => a + b, 0) > p.board_size ** 2 * 0.4
    ) {
      ctx.addIssue({ code: "custom", message: "Fleet exceeds supported board density" });
    }
    const controls = controlsSchema.safeParse({
      epistemicWeight: p.epistemic_weight,
      hitPreference: p.hit_preference,
      policyPrecision: p.policy_precision,
      sensorNoise: p.sensor_noise,
      habitStrength: p.habit_strength,
    });
    if (!controls.success) ctx.addIssue({ code: "custom", message: controls.error.message });
  });

export const parserResultSchema = z.strictObject({
  success: z.literal(true),
  errors: z.array(z.string()).length(0),
  warnings: z.array(z.string()).length(0),
  modelName: z.literal("BattleshipFiniteCatalogue"),
  parameters: z.array(z.strictObject({ name: z.string(), value: z.unknown() })),
  variables: z.array(z.strictObject({ name: z.string(), dimensions: z.array(z.number().int()) })),
  connections: z.array(
    z.strictObject({ source: z.array(z.string()), target: z.array(z.string()) }),
  ),
  equations: z.string(),
  time: z.strictObject({
    timeType: z.literal("Dynamic"),
    discretization: z.literal("DiscreteTime"),
    horizon: z.literal(1),
    stepSize: z.null(),
  }),
  pythonPrefix: z.string(),
  pythonBasePrefix: z.string(),
});

export const compiledModelSchema = z.strictObject({
  schemaVersion: z.literal(1),
  contract: z.literal("binary-static-fleet-v1"),
  modelName: z.literal("BattleshipFiniteCatalogue"),
  parameters: parametersSchema,
  source: z.strictObject({
    specificationSha256: z.string().regex(/^[a-f0-9]{64}$/),
    upstreamCommit: z.string().regex(/^[a-f0-9]{40}$/),
    parserClosureSha256: z.string().regex(/^[a-f0-9]{64}$/),
    parserFiles: z.array(z.strictObject({ path: z.string(), sha256: z.string() })),
  }),
});
export type CompiledModel = z.infer<typeof compiledModelSchema>;

export function modelDefaults(model: CompiledModel) {
  const p = model.parameters;
  return {
    rules: { boardSize: p.board_size, shipLengths: p.ship_lengths },
    controls: controlsSchema.parse({
      epistemicWeight: p.epistemic_weight,
      hitPreference: p.hit_preference,
      policyPrecision: p.policy_precision,
      sensorNoise: p.sensor_noise,
      habitStrength: p.habit_strength,
    }),
    seed: p.seed,
    catalogueSize: p.catalogue_size,
  };
}
