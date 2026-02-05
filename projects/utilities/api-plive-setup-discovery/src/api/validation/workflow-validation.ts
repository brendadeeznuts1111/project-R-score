import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

// Workflow creation validation
export const validateWorkflowCreation = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    workflowType: Joi.string().required().valid(
      'content_publishing',
      'line_change_approval',
      'odds_update_approval',
      'promotion_approval',
      'partner_preference_approval',
      'standard_approval',
      'incident_response'
    ),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    data: Joi.object().required().keys({
      // Common fields
      title: Joi.string().required().max(200),
      description: Joi.string().max(1000),

      // Betting platform specific
      contentType: Joi.string().when('...workflowType', {
        is: Joi.valid('content_publishing'),
        then: Joi.valid('lines', 'featured_bets', 'free_bets', 'promotions', 'live_events').required(),
        otherwise: Joi.optional()
      }),
      jurisdiction: Joi.string().when('...workflowType', {
        is: Joi.valid('content_publishing', 'line_change_approval'),
        then: Joi.valid('UK', 'DE', 'ES', 'IT', 'FR', 'US', 'global').required(),
        otherwise: Joi.optional()
      }),
      financialImpact: Joi.number().when('...workflowType', {
        is: Joi.valid('line_change_approval', 'odds_update_approval'),
        then: Joi.number().min(0).required(),
        otherwise: Joi.number().min(0).optional()
      }),

      // Line change specific
      lineId: Joi.string().when('...workflowType', {
        is: 'line_change_approval',
        then: Joi.string().required(),
        otherwise: Joi.optional()
      }),
      oldOdds: Joi.string().when('...workflowType', {
        is: 'line_change_approval',
        then: Joi.string().pattern(/^\d+\.\d{2}$/).required(),
        otherwise: Joi.optional()
      }),
      newOdds: Joi.string().when('...workflowType', {
        is: 'line_change_approval',
        then: Joi.string().pattern(/^\d+\.\d{2}$/).required(),
        otherwise: Joi.optional()
      }),
      eventName: Joi.string().when('...workflowType', {
        is: 'line_change_approval',
        then: Joi.string().required(),
        otherwise: Joi.optional()
      }),
      marketType: Joi.string().when('...workflowType', {
        is: 'line_change_approval',
        then: Joi.valid('match_winner', 'over_under', 'both_teams_to_score', 'correct_score', 'asian_handicap').required(),
        otherwise: Joi.optional()
      })
    }),
    metadata: Joi.object().optional()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Approval validation
export const validateApproval = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    comments: Joi.string().max(1000).optional(),
    stepId: Joi.string().optional(),
    approvalType: Joi.string().valid('standard', 'emergency', 'conditional').default('standard'),
    conditions: Joi.array().items(Joi.string()).optional().when('approvalType', {
      is: 'conditional',
      then: Joi.array().min(1).required()
    })
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Approval validation failed',
        details: error.details
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Workflow update validation
export const validateWorkflowUpdate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    data: Joi.object(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'rejected', 'cancelled')
  }).min(1);

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Workflow update validation failed',
        details: error.details
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Bulk operation validation
export const validateBulkOperation = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    workflowIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
    comments: Joi.string().max(1000).optional(),
    approvalType: Joi.string().valid('standard', 'emergency').default('standard'),
    reason: Joi.string().max(500).optional() // for cancel operations
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bulk operation validation failed',
        details: error.details
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Escalation validation
export const validateEscalation = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    reason: Joi.string().required().max(500),
    priority: Joi.string().valid('high', 'critical').required(),
    escalateTo: Joi.array().items(Joi.string()).min(1).optional(),
    notificationChannels: Joi.array().items(Joi.string().valid('email', 'slack', 'telegram')).optional()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Escalation validation failed',
        details: error.details
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Delegation validation
export const validateDelegation = (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
  const schema = Joi.object({
    delegateTo: Joi.string().required(),
    reason: Joi.string().required().max(500),
    permissions: Joi.array().items(Joi.string()).optional(),
    deadline: Joi.date().optional()
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Delegation validation failed',
        details: error.details
      },
      timestamp: new Date().toISOString()
    });
  }

  next();
};