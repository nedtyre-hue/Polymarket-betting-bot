import { Router } from 'express';
import * as settingsController from '@/controllers/settingsController';
import { validate } from '@/middlewares/validate';
import { isAuthenticated } from '@/middlewares/auth';
import { settingsSchema } from '@/validators';

const router = Router();

/**
 * @route   GET /api/settings
 * @desc    Get settings for authenticated user
 * @access  Private
 */
router.get('/', isAuthenticated, settingsController.getSettings);

/**
 * @route   POST /api/settings
 * @desc    Create or update settings for authenticated user
 * @access  Private
 */
router.post('/', isAuthenticated, validate(settingsSchema, 'body'), settingsController.saveSettings);

/**
 * @route   PUT /api/settings
 * @desc    Update settings for authenticated user
 * @access  Private
 */
router.put('/', isAuthenticated, validate(settingsSchema, 'body'), settingsController.updateSettings);

/**
 * @route   DELETE /api/settings
 * @desc    Delete settings for authenticated user
 * @access  Private
 */
router.delete('/', isAuthenticated, settingsController.deleteSettings);

export default router;

