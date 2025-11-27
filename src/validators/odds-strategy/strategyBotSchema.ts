import Joi from 'joi';

/**
 * Validation schema for odds strategy settings
 */
const oddsStrategySettingsSchema = Joi.object({
  marketSelection: Joi.string()
    .valid('BTC', 'ETH', 'SOL', 'XRP')
    .required()
    .messages({
      'any.only': 'Market selection must be BTC, ETH, SOL, or XRP',
      'any.required': 'Market selection is required',
    }),
  
  triggerPrice: Joi.number()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': 'Trigger price must be a number',
      'number.min': 'Trigger price must be 0 or greater',
      'number.max': 'Trigger price must be 100 or less',
      'any.required': 'Trigger price is required',
    }),
  
  tradeType: Joi.string()
    .valid('MARKET', 'LIMIT')
    .required()
    .messages({
      'any.only': 'Trade type must be either MARKET or LIMIT',
      'any.required': 'Trade type is required',
    }),
  
  limitPrice: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .allow(null)
    .when('tradeType', {
      is: 'LIMIT',
      then: Joi.required().messages({
        'any.required': 'Limit price is required when trade type is LIMIT',
      }),
      otherwise: Joi.optional().allow(null),
    })
    .messages({
      'number.base': 'Limit price must be a number',
      'number.min': 'Limit price must be 0 or greater',
      'number.max': 'Limit price must be 100 or less',
    }),
  
  timeout: Joi.number()
    .integer()
    .min(1)
    .max(3600)
    .required()
    .messages({
      'number.base': 'Timeout must be a number',
      'number.integer': 'Timeout must be an integer',
      'number.min': 'Timeout must be at least 1 second',
      'number.max': 'Timeout must not exceed 3600 seconds',
      'any.required': 'Timeout is required',
    }),
  
  increment: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Increment must be a number',
      'number.integer': 'Increment must be an integer',
      'number.min': 'Increment must be at least 1 cent',
      'any.required': 'Increment is required',
    }),
  
  fixedSize: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Fixed size must be a number',
      'number.min': 'Fixed size must be 0 or greater',
      'any.required': 'Fixed size is required',
    }),
  
  retryLimit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
    .messages({
      'number.base': 'Retry limit must be a number',
      'number.integer': 'Retry limit must be an integer',
      'number.min': 'Retry limit must be at least 1',
      'number.max': 'Retry limit must not exceed 100',
      'any.required': 'Retry limit is required',
    }),
});

/**
 * Validation schema for creating a strategy bot
 */
export const createStrategyBotSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(255)
    .optional()
    .default('Strategy Bot')
    .messages({
      'string.max': 'Name must not exceed 255 characters',
    }),
  
  wallet: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Wallet is required',
      'any.required': 'Wallet is required',
    }),
  
  privateKey: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Private key is required',
      'any.required': 'Private key is required',
    }),
  
  oddsStrategySettings: oddsStrategySettingsSchema.required().messages({
    'any.required': 'Odds strategy settings are required',
  }),
});

/**
 * Validation schema for updating a strategy bot
 */
export const updateStrategyBotSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(255)
    .optional()
    .messages({
      'string.max': 'Name must not exceed 255 characters',
    }),
  
  wallet: Joi.string()
    .trim()
    .optional()
    .messages({
      'string.empty': 'Wallet cannot be empty',
    }),
  
  privateKey: Joi.string()
    .trim()
    .optional()
    .messages({
      'string.empty': 'Private key cannot be empty',
    }),
  
  oddsStrategySettings: oddsStrategySettingsSchema.optional(),
});

/**
 * Validation schema for pagination query
 */
export const fetchStrategyBotsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(12),
  search: Joi.string().trim().optional().allow(''),
  status: Joi.string().valid('STOPPED', 'RUNNING', 'ERROR').optional(),
  sortBy: Joi.string().optional().default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional().default('DESC'),
});

/**
 * Validation schema for strategy bot ID
 */
export const strategyBotIdSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'string.empty': 'Strategy bot ID is required',
      'any.required': 'Strategy bot ID is required',
    }),
});

/**
 * Validation schema for strategy bot status update
 */
export const updateStrategyBotStatusSchema = Joi.object({
  status: Joi.string()
    .valid('STOPPED', 'RUNNING', 'ERROR')
    .required()
    .uppercase()
    .messages({
      'any.only': 'Status must be either STOPPED, RUNNING, or ERROR',
      'any.required': 'Status is required',
    }),
});

/**
 * Validation schema for strategy bot details query parameters
 */
export const getStrategyBotDetailsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
  sortBy: Joi.string().optional().default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional().default('DESC'),
  // Filters
  status: Joi.string().valid('PENDING', 'SUCCESS', 'FAILED', 'PARTIAL').optional(),
  side: Joi.string().valid('BUY', 'SELL').optional(),
  // Search
  search: Joi.string().trim().optional().allow('').max(255),
  // Timeframe for stats (in hours, 0 or undefined means all time)
  timeframeHours: Joi.number().integer().min(0).max(1000).optional(),
});

