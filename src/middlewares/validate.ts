import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema, type: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const target =
      type === 'body' ? req.body : type === 'params' ? req.params : req.query;

    const { error, value } = schema.validate(target || {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    if (type === 'body') {
      req.body = value;
    } else if (type === 'params') {
      req.params = value;
    } else {
      req.query = value;
    }

    next();
  };
};
