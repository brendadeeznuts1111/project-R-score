/**
 * 🔥 Fire22 Dynamic Configuration Routes
 * API routes for managing configurable fees, limits, and settings
 */

import { Router } from 'express';
import configController from '../controllers/config.controller';

const router = Router();

// Fee Configuration Routes
router.get('/fees', configController.getFeeConfigurations);
router.post('/fees', configController.createFeeConfiguration);
router.put('/fees/:id', configController.updateFeeConfiguration);

// Fee Calculation Routes
router.post('/fees/calculate', configController.calculateTransactionFee);
router.post('/fees/bulk-calculate', configController.bulkCalculateTransactionFees);
router.get('/fees/preview/:amount', configController.previewFeesForAmount);
router.post('/fees/test-scenario', configController.testFeeScenario);

// System Configuration Routes
router.get('/system', configController.getSystemConfigs);
router.put('/system/:key', configController.updateSystemConfig);

export default router;
