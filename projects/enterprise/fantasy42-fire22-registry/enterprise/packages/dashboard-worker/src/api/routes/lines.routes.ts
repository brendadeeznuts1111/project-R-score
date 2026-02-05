/**
 * Lines Routes
 * Handles betting lines and sports data endpoints
 */

import { Router } from 'itty-router';
import { validate } from '../middleware/validate.middleware';
import { authorize } from '../middleware/authorize.middleware';
import * as controller from '../controllers/other.controller';
import * as schemas from '../schemas/index';
import { GetLinesQuerySchema } from '../schemas/index';

const router = Router({ base: '/lines' });

// Get betting lines for ticketwriter
router.get(
  '/place-bets',
  authorize(['lines.read', 'betting.view', 'agent.*']),
  validate(GetLinesQuerySchema),
  controller.getLines
);

// Get sportsbook lines
router.get(
  '/sportsbook',
  authorize(['lines.read', 'sportsbook.view']),
  validate(GetLinesQuerySchema),
  controller.getLines
);

// Get lines by sport
router.get(
  '/:sport',
  authorize(['lines.read']),
  validate(GetLinesQuerySchema),
  controller.getLines
);

export const linesRoutes = router;
