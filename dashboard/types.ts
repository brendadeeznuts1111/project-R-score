export type ComponentLifecycleStatus = "stable" | "beta";

export type SecurityReview = {
  reviewed: boolean;
  quarter: string;
};

export type ProductionStatus = {
  deployed: boolean;
  regions: number;
  label: string;
};

export type ComponentStatus = {
  id: string;
  file: string;
  status: ComponentLifecycleStatus;
  owner: string;
  lastCommit: string;
  coverage: number;
  performance: number;
  dependencies: string[];
  security: SecurityReview;
  documentation: string;
  production: ProductionStatus;
};

export type HealthScore = {
  overall: number;
  stable: number;
  beta: number;
  productionReady: number;
  averageCoverage: number;
};

