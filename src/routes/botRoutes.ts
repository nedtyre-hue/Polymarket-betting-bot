import { Router } from 'express';
import * as botController from '@/controllers/botController';
import { validate } from '@/middlewares/validate';
import { isAuthenticated } from '@/middlewares/auth';
import {
  createBotSchema,
  updateBotSchema,
  fetchBotsSchema,
  botIdSchema,
  updateBotStatusSchema,
  getBotDetailsSchema,
} from '@/validators';

const router = Router();

/**
 * @route   GET /api/bots
 * @desc    Get all bots for authenticated user with pagination
 * @access  Private
 */
router.get(
  '/',
  isAuthenticated,
  validate(fetchBotsSchema, 'query'),
  botController.getBots
);

/**
 * @route   GET /api/bots/:id/details
 * @desc    Get bot details with order history
 * @access  Private
 */
router.get(
  '/:id/details',
  isAuthenticated,
  validate(botIdSchema, 'params'),
  validate(getBotDetailsSchema, 'query'),
  botController.getBotDetails
);

/**
 * @route   GET /api/bots/:id
 * @desc    Get a single bot by ID
 * @access  Private
 */
router.get(
  '/:id',
  isAuthenticated,
  validate(botIdSchema, 'params'),
  botController.getBotById
);

/**
 * @route   POST /api/bots
 * @desc    Create a new bot
 * @access  Private
 */
router.post(
  '/',
  isAuthenticated,
  validate(createBotSchema, 'body'),
  botController.createBot
);

/**
 * @route   PUT /api/bots/:id
 * @desc    Update a bot
 * @access  Private
 */
router.put(
  '/:id',
  isAuthenticated,
  validate(botIdSchema, 'params'),
  validate(updateBotSchema, 'body'),
  botController.updateBot
);

/**
 * @route   PATCH /api/bots/:id/status
 * @desc    Update bot status (start/stop)
 * @access  Private
 */
router.patch(
  '/:id/status',
  isAuthenticated,
  validate(botIdSchema, 'params'),
  validate(updateBotStatusSchema, 'body'),
  botController.updateBotStatus
);

/**
 * @route   DELETE /api/bots/:id
 * @desc    Delete a bot
 * @access  Private
 */
router.delete(
  '/:id',
  isAuthenticated,
  validate(botIdSchema, 'params'),
  botController.deleteBot
);

export default router;

