import generated from "../generated/model.json";
import { type CompiledModel, compiledModelSchema } from "./schema";

/** Return an independent, validated copy of the model compiled from the real GNN parser. */
export function loadDefaultModel(): CompiledModel {
  return compiledModelSchema.parse(generated);
}
