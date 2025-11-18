import Joi from 'joi';
import {
  DEFAULT_USER_ALLOW_STATUS,
  USER_ALLOW_STATUS_VALUES,
} from '@enums';

/**
 * Validation schema for user registration
 */
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 100 characters',
      'any.required': 'Password is required',
    }),
  firstName: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'First name must be at least 1 character long',
      'string.max': 'First name must not exceed 100 characters',
      'any.required': 'First name is required',
    }),
  lastName: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Last name must be at least 1 character long',
      'string.max': 'Last name must not exceed 100 characters',
      'any.required': 'Last name is required',
    }),
  status: Joi.string()
    .valid(...USER_ALLOW_STATUS_VALUES)
    .optional()
    .lowercase()
    .trim()
    .default(DEFAULT_USER_ALLOW_STATUS)
    .messages({
      'any.only': 'Status must be either allow or block',
    }),
});

/**
 * Validation schema for user login
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required',
    }),
});


/**
 * Validation schema for change password
 */
export const changePasswordSchema = Joi.object({
  oldPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Old password is required',
    }),
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.max': 'New password must not exceed 100 characters',
      'any.required': 'New password is required',
    }),
});

