import { makeFleet } from "../src/core/fleet";
import type { Controls } from "../src/core/inference";
import generated from "../src/generated/model.json";
import { compiledModelSchema } from "../src/model/schema";

export const model = compiledModelSchema.parse(generated);
export const rules = { boardSize: 6, shipLengths: [2] };
export const left = makeFleet([[0, 1]], rules);
export const right = makeFleet([[4, 5]], rules);
export const twoFleets = [left, right];
export const controls: Controls = {
  epistemicWeight: 1,
  hitPreference: 2,
  policyPrecision: 4,
  sensorNoise: 0,
  habitStrength: 0,
};
