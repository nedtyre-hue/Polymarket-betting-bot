import { Router } from 'express';
import {
  getStrategySettings,
  saveStrategySettings,
  deleteStrategySettings,
} from '@/controllers/odds-strategy/strategySettingsController';
import { isAuthenticated } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { saveStrategySettingsSchema } from '@/validators/odds-strategy/strategySettingsSchema';

const router = Router();

/**
 * @route   GET /api/strategy-settings
 * @desc    Get strategy settings for authenticated user
 * @access  Private
 */
router.get('/', isAuthenticated, getStrategySettings);

/**
 * @route   POST /api/strategy-settings
 * @desc    Create or update strategy settings for authenticated user
 * @access  Private
 */
router.post(
  '/',
  isAuthenticated,
  validate(saveStrategySettingsSchema, 'body'),
  saveStrategySettings
);

/**
 * @route   DELETE /api/strategy-settings
 * @desc    Delete strategy settings for authenticated user
 * @access  Private
 */
router.delete('/', isAuthenticated, deleteStrategySettings);

export default router;

