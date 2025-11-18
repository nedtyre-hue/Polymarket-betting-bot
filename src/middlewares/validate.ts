import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema, type = 'body') => {
    return (req: Request, res: Response, next: NextFunction) => {
      let error;
      
      if (type === 'body') {
        const result = schema.validate(req.body || {});
        error = result.error;
      } else if (type === 'params') {
        const result = schema.validate(req.params || {});
        error = result.error;
      } else if (type === 'query') {
        const result = schema.validate(req.query || {});
        error = result.error;
      }

      if (error) {
        res.status(400).json({ 
          success: false,
          message: error.details[0].message 
        });
      } else {
        next();
      }
    };
};
  