import Joi from 'joi';

/**
 * Validation schema for creating/updating settings
 */
export const settingsSchema = Joi.object({
  ratio: Joi.number()
    .min(0)
    .max(1)
    .required()
    .messages({
      'number.base': 'Ratio must be a number',
      'number.min': 'Ratio must be between 0 and 1',
      'number.max': 'Ratio must be between 0 and 1',
      'any.required': 'Ratio is required',
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
  
  minBetSize: Joi.number()
    .min(5)
    .required()
    .messages({
      'number.base': 'Minimum bet size must be a number',
      'number.min': 'Minimum bet size must be at least 5',
      'any.required': 'Minimum bet size is required',
    }),
  
  maxBetSize: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Maximum bet size must be a number',
      'number.min': 'Maximum bet size must be 0 or greater',
      'any.required': 'Maximum bet size is required',
    })
    .custom((value, helpers) => {
      const minBetSize = helpers.state.ancestors[0]?.minBetSize;
      if (minBetSize !== undefined && value < minBetSize) {
        return helpers.error('any.custom', {
          message: 'Maximum bet size must be greater than or equal to minimum bet size',
        });
      }
      return value;
    }),
  
  betSizeStrategy: Joi.string()
    .valid('PERCENTAGE', 'FIX')
    .required()
    .uppercase()
    .messages({
      'any.only': 'Bet size strategy must be either PERCENTAGE or FIX',
      'any.required': 'Bet size strategy is required',
    }),
  
  fixedSize: Joi.number()
    .min(0)
    .optional()
    .when('betSizeStrategy', {
      is: 'FIX',
      then: Joi.required().messages({
        'any.required': 'Fixed size is required when bet size strategy is FIX',
      }),
      otherwise: Joi.optional(),
    })
    .messages({
      'number.base': 'Fixed size must be a number',
      'number.min': 'Fixed size must be 0 or greater',
    }),
});

