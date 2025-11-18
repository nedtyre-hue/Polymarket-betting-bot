import { Router } from 'express';
import * as authController from '@/controllers/authController';
import { validate } from '@/middlewares/validate';
import { authenticate } from '@/middlewares/auth';
import { 
  registerSchema, 
  loginSchema, 
  changePasswordSchema 
} from '@/validators';

const router = Router();

/**
 * @route   POST /api/auth/register
 */
router.post('/register', validate(registerSchema, 'body'), authController.register);

/**
 * @route   POST /api/auth/login
 */
router.post('/login', validate(loginSchema, 'body'), authController.login);

/**
 * @route   GET /api/auth/refresh
 */
router.get('/refresh', authenticate, authController.refreshToken);


/**
 * @route   POST /api/auth/change-password
 */
router.post('/change-password', authenticate, validate(changePasswordSchema, 'body'), authController.changePassword);

export default router;

