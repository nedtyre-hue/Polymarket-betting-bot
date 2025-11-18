import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import settingsRoutes from './settingsRoutes';
import { isAuthenticated } from '@/middlewares/auth';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/users', isAuthenticated, userRoutes);

// Settings routes
router.use('/settings', settingsRoutes);

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

export default router;

