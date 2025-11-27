import { Router } from 'express';
import * as strategyBotController from '@/controllers/odds-strategy/strategyBotController';
import { validate } from '@/middlewares/validate';
import { isAuthenticated } from '@/middlewares/auth';
import {
  createStrategyBotSchema,
  updateStrategyBotSchema,
  fetchStrategyBotsSchema,
  strategyBotIdSchema,
  updateStrategyBotStatusSchema,
  getStrategyBotDetailsSchema,
} from '@/validators/odds-strategy/strategyBotSchema';

const router = Router();

/**
 * @route   GET /api/strategy-bots
 * @desc    Get all strategy bots for authenticated user with pagination
 * @access  Private
 */
router.get(
  '/',
  isAuthenticated,
  validate(fetchStrategyBotsSchema, 'query'),
  strategyBotController.getStrategyBots
);

/**
 * @route   GET /api/strategy-bots/:id/details
 * @desc    Get strategy bot details with order history
 * @access  Private
 */
router.get(
  '/:id/details',
  isAuthenticated,
  validate(strategyBotIdSchema, 'params'),
  validate(getStrategyBotDetailsSchema, 'query'),
  strategyBotController.getStrategyBotDetails
);

/**
 * @route   GET /api/strategy-bots/:id
 * @desc    Get a single strategy bot by ID
 * @access  Private
 */
router.get(
  '/:id',
  isAuthenticated,
  validate(strategyBotIdSchema, 'params'),
  strategyBotController.getStrategyBotById
);

/**
 * @route   POST /api/strategy-bots
 * @desc    Create a new strategy bot
 * @access  Private
 */
router.post(
  '/',
  isAuthenticated,
  validate(createStrategyBotSchema, 'body'),
  strategyBotController.createStrategyBot
);

/**
 * @route   PUT /api/strategy-bots/:id
 * @desc    Update a strategy bot
 * @access  Private
 */
router.put(
  '/:id',
  isAuthenticated,
  validate(strategyBotIdSchema, 'params'),
  validate(updateStrategyBotSchema, 'body'),
  strategyBotController.updateStrategyBot
);

/**
 * @route   PATCH /api/strategy-bots/:id/status
 * @desc    Update strategy bot status (start/stop)
 * @access  Private
 */
router.patch(
  '/:id/status',
  isAuthenticated,
  validate(strategyBotIdSchema, 'params'),
  validate(updateStrategyBotStatusSchema, 'body'),
  strategyBotController.updateStrategyBotStatus
);

/**
 * @route   DELETE /api/strategy-bots/:id
 * @desc    Delete a strategy bot
 * @access  Private
 */
router.delete(
  '/:id',
  isAuthenticated,
  validate(strategyBotIdSchema, 'params'),
  strategyBotController.deleteStrategyBot
);

export default router;

