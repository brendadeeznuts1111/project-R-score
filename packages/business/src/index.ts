// Pure functions and types
export {
  type HabitsTier,
  type HabitsData,
  type Transaction,
  classifyHabits,
  calculateBonus,
  getRecommendation,
  applyVipRiskOverride,
} from './habits-pure';

// Redis-backed storage (re-exports pure functions as *Pure aliases too)
export {
  classifyHabitsPure,
  calculateBonusPure,
  getRecommendationPure,
  applyVipRiskOverridePure,
  storeHabits,
  getHabits,
  deleteHabits,
  listAllHabits,
} from './habits-classifier';

export { refs, ReferenceManager } from './reference-manager';
