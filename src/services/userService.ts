import { FilterQuery } from 'mongoose';
import { User } from '@/models';
import {
  DEFAULT_USER_ALLOW_STATUS,
  USER_ALLOW_STATUS,
} from '@enums';
import {
  IPaginatedResponse,
  IUserAttributes,
  IUserCreationAttributes,
  IUserDocument,
  IUserPaginationOptions,
  UserAllowStatus,
} from '@/types';

const ALLOWED_SORT_FIELDS = new Set([
  'email',
  'firstName',
  'lastName',
  'createdAt',
  'updatedAt',
  'lastLogin',
  'status',
]);
/**
 * User Service
 */

class UserService {
  /**
   * Create a new user
   */
  async createUser(userData: IUserCreationAttributes): Promise<IUserDocument> {
    const normalizedData: IUserCreationAttributes = {
      ...userData,
      email: userData.email.trim().toLowerCase(),
      status: userData.status || DEFAULT_USER_ALLOW_STATUS,
    };

    const user = await User.create(normalizedData);
    return user;
  }

  /**
   * Find user by ID
   */
  async findUserById(id: string, includePassword = false): Promise<IUserDocument | null> {
    if (!id) {
      return null;
    }

    const query = User.findById(id);
    if (includePassword) {
      query.select('+password');
    }

    return query.exec();
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string, includePassword = false): Promise<IUserDocument | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const query = User.findOne({ email: normalizedEmail });

    if (includePassword) {
      query.select('+password');
    }

    return query.exec();
  }

  /**
   * Find all users with pagination
   */
  async findAllUsers(options: IUserPaginationOptions): Promise<IPaginatedResponse<IUserAttributes>> {
    const page = Number(options.page) || 1;
    const limit = Number(options.limit) || 10;
    const search = options.search?.trim();
    const requestedSortBy = options.sortBy || 'createdAt';
    const sortBy = ALLOWED_SORT_FIELDS.has(requestedSortBy) ? requestedSortBy : 'createdAt';
    const sortOrder = (options.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 1 : -1;

    const skip = (page - 1) * limit;

    const filters: FilterQuery<IUserDocument> = {};

    if (options.status) {
      filters.status = options.status;
    }

    if (search) {
      filters.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, count] = await Promise.all([
      User.find(filters)
        .skip(skip)
        .limit(limit)
        .sort({ [sortBy]: sortOrder })
        .exec(),
      User.countDocuments(filters).exec(),
    ]);

    const totalPages = Math.ceil(count / limit) || 1;

    return {
      data: users,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount: count,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Find allowed users with pagination
   */
  async findActiveUsers(options: IUserPaginationOptions): Promise<IPaginatedResponse<IUserAttributes>> {
    return this.findAllUsers({ ...options, status: USER_ALLOW_STATUS.ALLOW });
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: Partial<IUserAttributes>): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(id, userData, { new: true }).exec();
  }

  /**
   * Delete user (soft delete by setting status to block)
   */
  async deactivateUser(id: string): Promise<boolean> {
    const user = await User.findByIdAndUpdate(
      id,
      { status: USER_ALLOW_STATUS.BLOCK },
      { new: true }
    ).exec();
    return Boolean(user);
  }

  /**
   * Delete user permanently
   */
  async deleteUser(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id).exec();
    return Boolean(result);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { lastLogin: new Date() }).exec();
  }

  /**
   * Count total users
   */
  async countUsers(status?: UserAllowStatus): Promise<number> {
    const filters: FilterQuery<IUserDocument> = {};
    if (status) {
      filters.status = status;
    }
    return User.countDocuments(filters);
  }
}

export default new UserService();

