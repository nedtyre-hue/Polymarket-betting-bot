import Joi from 'joi';

/**
 * Validation schema for strategy settings
 */
export const saveStrategySettingsSchema = Joi.object({
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

