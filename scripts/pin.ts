import { z } from "zod";

/** Canonical importer pin: `gnn-importer-pin/v1`, as read by the GNN importer checker. */
export const pinSchema = z.strictObject({
  schema: z.literal("gnn-importer-pin/v1"),
  recorded: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`))),
  repository: z.literal("ActiveInferenceInstitute/Generalized_Notation_Notation"),
  tag: z.string().min(1),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
});

export type GnnPin = z.infer<typeof pinSchema>;
