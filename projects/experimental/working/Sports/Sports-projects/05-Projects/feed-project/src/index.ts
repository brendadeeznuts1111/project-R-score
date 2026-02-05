// Feed Project - Entry Point

export {
  transform,
  getFieldMapping,
  applyTransformation,
  generateCssVariables,
  validateConfig,
} from "./field-mapping";

export {
  substituteEnvVars,
  substituteInObject,
  extractEnvVars,
  validateEnvVars,
} from "./env-substitutor";

export {
  createServer,
  getDashboardInfo,
  registerDashboard,
} from "./server";

export type {
  MetaTag,
  FieldMapping,
  DashboardConfig,
  EnhancedDashboardConfig,
} from "./types";

export { FIELD_MAPPINGS, HSL_COLORS } from "./types";
