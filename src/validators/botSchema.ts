import Joi from 'joi';

/**
 * Validation schema for bot settings
 */
const botSettingsSchema = Joi.object({
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
  
  minBetValue: Joi.number()
    .min(5)
    .required()
    .messages({
      'number.base': 'Minimum bet value must be a number',
      'number.min': 'Minimum bet value must be at least 5',
      'any.required': 'Minimum bet value is required',
    }),
  
  maxBetValue: Joi.number()
    .min(0)
    .required()
    .messages({
      'number.base': 'Maximum bet value must be a number',
      'number.min': 'Maximum bet value must be 0 or greater',
      'any.required': 'Maximum bet value is required',
    })
    .custom((value, helpers) => {
      const minBetValue = helpers.state.ancestors[0]?.settings?.minBetValue;
      if (minBetValue !== undefined && value < minBetValue) {
        return helpers.error('any.custom', {
          message: 'Maximum bet value must be greater than or equal to minimum bet value',
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
  
  fixedAmount: Joi.number()
    .min(0)
    .optional()
    .when('betSizeStrategy', {
      is: 'FIX',
      then: Joi.required().messages({
        'any.required': 'Fixed amount is required when bet size strategy is FIX',
      }),
      otherwise: Joi.optional(),
    })
    .messages({
      'number.base': 'Fixed amount must be a number',
      'number.min': 'Fixed amount must be 0 or greater',
    }),
});

/**
 * Validation schema for creating/updating a bot
 */
export const createBotSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(255)
    .optional()
    .default('Bot')
    .messages({
      'string.max': 'Name must not exceed 255 characters',
    }),
  
  copyTradingWallet: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Copy trading wallet is required',
      'any.required': 'Copy trading wallet is required',
    }),
  
  copyTradingWalletContractAddress: Joi.string()
    .trim()
    .required()
    .messages({
      'string.empty': 'Copy trading wallet contract address is required',
      'any.required': 'Copy trading wallet contract address is required',
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
  
  settings: botSettingsSchema.required().messages({
    'any.required': 'Settings are required',
  }),
});

/**
 * Validation schema for updating a bot
 */
export const updateBotSchema = Joi.object({
  name: Joi.string()
    .trim()
    .max(255)
    .optional()
    .messages({
      'string.max': 'Name must not exceed 255 characters',
    }),
  
  copyTradingWallet: Joi.string()
    .trim()
    .optional()
    .messages({
      'string.empty': 'Copy trading wallet cannot be empty',
    }),
  
  copyTradingWalletContractAddress: Joi.string()
    .trim()
    .optional()
    .messages({
      'string.empty': 'Copy trading wallet contract address cannot be empty',
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
  
  settings: botSettingsSchema.optional(),
});

/**
 * Validation schema for pagination query
 */
export const fetchBotsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(12),
  search: Joi.string().trim().optional().allow(''),
  status: Joi.string().valid('STOPPED', 'RUNNING', 'ERROR').optional(),
  sortBy: Joi.string().optional().default('createdAt'),
  sortOrder: Joi.string().valid('ASC', 'DESC').optional().default('DESC'),
});

/**
 * Validation schema for bot ID
 */
export const botIdSchema = Joi.object({
  id: Joi.string()
    .required()
    .messages({
      'string.empty': 'Bot ID is required',
      'any.required': 'Bot ID is required',
    }),
});

/**
 * Validation schema for bot status update
 */
export const updateBotStatusSchema = Joi.object({
  status: Joi.string()
    .valid('STOPPED', 'RUNNING', 'ERROR')
    .required()
    .uppercase()
    .messages({
      'any.only': 'Status must be either STOPPED, RUNNING, or ERROR',
      'any.required': 'Status is required',
    }),
});

