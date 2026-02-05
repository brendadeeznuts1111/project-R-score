/**
 * Validation Routes
 *
 * API routes for L-Key to Telegram validation system
 */

import { Router } from 'itty-router';
import {
  validateLKeyTelegramConsistency,
  autoFixValidationIssues,
  getValidationStats,
  exportValidationReport,
  validateSpecificCustomer,
  getValidationHealth,
} from '../controllers/validation.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validateRequestBody } from '../middleware/validate.middleware';

const validationRouter = Router({ base: '/api/validation' });

// Apply authentication middleware to all validation routes
validationRouter.all('*', authenticateJWT);

/**
 * POST /api/validation/run
 * Run complete L-Key to Telegram validation
 */
validationRouter.post(
  '/run',
  validateRequestBody({
    agentID: { type: 'string', required: false },
  }),
  validateLKeyTelegramConsistency
);

/**
 * POST /api/validation/autofix
 * Auto-fix validation issues
 */
validationRouter.post(
  '/autofix',
  validateRequestBody({
    report: { type: 'object', required: true },
  }),
  autoFixValidationIssues
);

/**
 * GET /api/validation/stats
 * Get validation statistics
 */
validationRouter.post(
  '/stats',
  validateRequestBody({
    agentID: { type: 'string', required: false },
  }),
  getValidationStats
);

/**
 * POST /api/validation/export
 * Export validation report
 */
validationRouter.post(
  '/export',
  validateRequestBody({
    agentID: { type: 'string', required: false },
    format: { type: 'string', required: false },
  }),
  exportValidationReport
);

/**
 * POST /api/validation/customer
 * Validate specific customer
 */
validationRouter.post(
  '/customer',
  validateRequestBody({
    customerID: { type: 'string', required: true },
    agentID: { type: 'string', required: false },
  }),
  validateSpecificCustomer
);

/**
 * GET /api/validation/health
 * Get validation system health
 */
validationRouter.get('/health', getValidationHealth);

export default validationRouter;
