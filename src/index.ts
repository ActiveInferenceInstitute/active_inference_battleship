/** Browser-safe public interface. No UI, worker, file-system, Bun, or server imports. */

export {
  actionLogOdds,
  forecastOutcomes,
  type OutcomeForecast,
  type PolicySweepPoint,
  type SweepParameter,
  strategyPresets,
  sweepPolicy,
} from "./core/analysis";
export {
  coordinate,
  drawFleet,
  type Fleet,
  type FleetRules,
  generateFleet,
  makeCatalogue,
  makeFleet,
} from "./core/fleet";
export {
  begin,
  createGame,
  fire,
  type Game,
  type Observation,
  observations,
  type Shot,
} from "./core/game";
export {
  type ActionScore,
  type Belief,
  type Controls,
  chooseAction,
  controlsSchema,
  infer,
  scoreActions,
  UnsupportedObservationError,
  type UpdateDiagnostic,
} from "./core/inference";
export { type RandomSource, SeededRandom } from "./core/random";
export {
  type AnalysisOptions,
  analyzeReplay,
  encodeAnalysis,
  type ReplayAnalysis,
} from "./core/report";
export {
  applyEvent,
  assistant,
  createSession,
  exportSession,
  importSession,
  type Session,
  type SessionEvent,
  suggestedCell,
} from "./core/session";
export { loadDefaultModel } from "./model/default";
export { type CompiledModel, compiledModelSchema, modelDefaults } from "./model/schema";
export {
  policies,
  type SearchPolicy,
  type SearchStep,
  searchFleet,
  selectSearchAction,
} from "./research/search";
