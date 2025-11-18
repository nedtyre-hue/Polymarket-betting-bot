import bcrypt from 'bcrypt';
import CustomError from '@/utils/customError';
import { generateToken } from '@/utils/jwt';
import {
  DEFAULT_USER_ALLOW_STATUS,
  USER_ALLOW_STATUS,
} from '@enums';
import { ILoginRequest, IRegisterRequest, IAuthResponse } from '@/types';
import userService from '@/services/userService';

/**
 * Auth Service
 */

class AuthService {
  /**
   * Register a new user
   */
  async register(registerData: IRegisterRequest): Promise<IAuthResponse> {
    // Check if user already exists
    const existingUser = await userService.findUserByEmail(registerData.email);
    if (existingUser) {
      throw new CustomError('User with this email already exists', 409);
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerData.password, saltRounds);

    // Create user
    const status = registerData.status || DEFAULT_USER_ALLOW_STATUS;

    const user = await userService.createUser({
      email: registerData.email,
      password: hashedPassword,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      status,
    });

    // Generate token
    const token = generateToken({
      id: user.id!,
      email: user.email,
    });

    return {
      user: {
        id: user.id!,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
      token: token,
    };
  }

  /**
   * Login user
   */
  async login(loginData: ILoginRequest): Promise<IAuthResponse> {
    // Find user by email
    const user = await userService.findUserByEmail(loginData.email, true);
    if (!user) {
      throw new CustomError('Invalid email or password', 401);
    }

    if (user.status === USER_ALLOW_STATUS.BLOCK) {
      throw new CustomError('Your account has been blocked', 403);
    }
    
    // Verify password
    if (!user.password) {
      throw new CustomError('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(loginData.password, user.password);
    if (!isPasswordValid) {
      throw new CustomError('Invalid email or password', 401);
    }

    // Update last login
    await userService.updateLastLogin(user.id!);

    // Generate token
    const token = generateToken({
      id: user.id!,
      email: user.email,
    });

    return {
      user: {
        id: user.id!,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
      token: token,
    };
  }


  /**
   * Verify user exists and is allowed (for middleware use)
   */
  async verifyUserStatus(userId: string) {
    const user = await userService.findUserById(userId);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.status === USER_ALLOW_STATUS.BLOCK) {
      throw new CustomError('Your account has been blocked', 403);
    }

    return user;
  }

  /**
   * Change password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await userService.findUserById(userId, true);
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Verify old password
    if (!user.password) {
      throw new CustomError('User credentials are unavailable', 500);
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new CustomError('Old password is incorrect', 401);
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await userService.updateUser(userId, { password: hashedPassword });

  }
}

export default new AuthService();

