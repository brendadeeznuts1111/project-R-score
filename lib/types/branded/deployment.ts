/**
 * @domain deployment
 * @module lib/types/branded/deployment.ts
 *
 * Deployment identity brands.
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

export type DeploymentId = BrandedString<'DeploymentId'>;

const deployment = defineBrandConstructors('DeploymentId');

export const asDeploymentId = deployment.as;
export const tryDeploymentId = deployment.try;
export const parseDeploymentId = deployment.parse;

export const DEPLOYMENT_BRAND_SPECS: readonly BrandSpec[] = [
  {
    name: 'DeploymentId',
    domain: 'deployment',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Release / deployment instance identity',
  },
] as const;
