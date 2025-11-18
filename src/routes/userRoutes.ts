import { Router } from 'express';
import * as userController from '@/controllers/userController';
import { validate } from '@/middlewares/validate';
import { createUserSchema, idSchema, updateUserSchema, fetchUsersSchema } from '@/validators';

const router = Router();

/**
 * @route   GET /api/users/stats
 */
router.get('/stats', userController.getUserStats);

/**
 * @route   GET /api/users
 */
router.get('/', validate(fetchUsersSchema, 'query'), userController.getAllUsers);

/**
 * @route   GET /api/users/:id
 */
router.get('/:id', validate(idSchema, 'params'), userController.getUserById);

/**
 * @route   POST /api/users
 */
router.post('/', validate(createUserSchema), userController.createUser);

/**
 * @route   PUT /api/users/:id
 */
router.put('/:id', validate(updateUserSchema), validate(idSchema, 'params'), userController.updateUser);

/**
 * @route   PATCH /api/users/:id/deactivate
 */
router.patch('/:id/deactivate', validate(idSchema, 'params'), userController.deactivateUser);

/**
 * @route   DELETE /api/users/:id
 */
router.delete('/:id', validate(idSchema, 'params'), userController.deleteUser);

export default router;

