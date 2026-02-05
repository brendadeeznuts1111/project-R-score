/**
 * Authentication Service
 * Handles user authentication and authorization
 */

import { BaseService } from '../../../core/services/base-service';
import { DatabaseService } from '../../../core/services/database-service';
import { UserService } from '../../../core/services/user-service';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiresAt: Date;
  userId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export class AuthService extends BaseService {
  private db: DatabaseService;
  private userService: UserService;
  private jwtSecret: string;
  private tokenExpiryHours: number;

  constructor(
    dbService: DatabaseService,
    userService: UserService,
    jwtSecret: string = 'default-secret-change-in-production',
    tokenExpiryHours: number = 24
  ) {
    super('AuthService');
    this.db = dbService;
    this.userService = userService;
    this.jwtSecret = jwtSecret;
    this.tokenExpiryHours = tokenExpiryHours;
  }

  async initialize(): Promise<void> {
    await super.initialize();
    console.log('Authentication service initialized successfully');
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthToken | null> {
    const { email, password } = credentials;

    // Find user by email
    const user = await this.userService.findByEmail(email);
    if (!user || !user.isActive) {
      return null;
    }

    // In a real implementation, you would verify the password hash
    // For now, we'll simulate password verification
    const isValidPassword = await this.verifyPassword(password, user.id);
    if (!isValidPassword) {
      return null;
    }

    // Generate JWT token
    const token = await this.generateToken(user);

    // Store token in database (optional, for token blacklisting)
    await this.storeToken(token, user.id);

    return token;
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      // In a real implementation, you would verify the JWT signature
      // For now, we'll simulate token verification
      const payload = await this.decodeToken(token);

      if (!payload || payload.expiresAt < new Date()) {
        return null;
      }

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return null;
      }

      // Get user details
      const user = await this.userService.findById(payload.userId);
      if (!user || !user.isActive) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: await this.getUserPermissions(user.role),
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Logout user by blacklisting token
   */
  async logout(token: string): Promise<boolean> {
    try {
      await this.blacklistToken(token);
      return true;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(oldToken: string): Promise<AuthToken | null> {
    const user = await this.verifyToken(oldToken);
    if (!user) {
      return null;
    }

    // Blacklist old token
    await this.blacklistToken(oldToken);

    // Generate new token
    const dbUser = await this.userService.findById(user.id);
    if (!dbUser) {
      return null;
    }

    const newToken = await this.generateToken(dbUser);
    await this.storeToken(newToken, user.id);

    return newToken;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    const user = await this.userService.findById(userId);
    if (!user) {
      return false;
    }

    // Verify old password
    const isOldPasswordValid = await this.verifyPassword(oldPassword, userId);
    if (!isOldPasswordValid) {
      return false;
    }

    // Update password hash
    await this.updatePasswordHash(userId, newPassword);

    // Blacklist all existing tokens for security
    await this.blacklistAllUserTokens(userId);

    return true;
  }

  /**
   * Get user permissions based on role
   */
  private async getUserPermissions(role: string): Promise<string[]> {
    const rolePermissions: Record<string, string[]> = {
      admin: ['read', 'write', 'delete', 'admin'],
      moderator: ['read', 'write', 'moderate'],
      user: ['read', 'write'],
    };

    return rolePermissions[role] || ['read'];
  }

  /**
   * Generate JWT token (simplified implementation)
   */
  private async generateToken(user: any): Promise<AuthToken> {
    const expiresAt = new Date(Date.now() + this.tokenExpiryHours * 60 * 60 * 1000);

    // In a real implementation, use a proper JWT library
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      issuedAt: new Date(),
      expiresAt,
    };

    const token = btoa(JSON.stringify(payload)); // Simplified encoding

    return {
      token,
      expiresAt,
      userId: user.id,
    };
  }

  /**
   * Decode JWT token (simplified implementation)
   */
  private async decodeToken(token: string): Promise<any> {
    try {
      const payload = JSON.parse(atob(token)); // Simplified decoding
      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify password (simplified implementation)
   */
  private async verifyPassword(password: string, userId: string): Promise<boolean> {
    // In a real implementation, compare password hash
    // For now, simulate verification
    return password.length >= 6;
  }

  /**
   * Update password hash (simplified implementation)
   */
  private async updatePasswordHash(userId: string, newPassword: string): Promise<void> {
    // In a real implementation, hash and store password
    // For now, just log
    console.log(`Password updated for user ${userId}`);
  }

  /**
   * Token management methods (simplified)
   */
  private async storeToken(token: AuthToken, userId: string): Promise<void> {
    await this.db.insert('auth_tokens', {
      token: token.token,
      userId,
      expiresAt: token.expiresAt,
      createdAt: new Date(),
    });
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const result = await this.db.query('SELECT id FROM blacklisted_tokens WHERE token = ?', [
      token,
    ]);
    return result.length > 0;
  }

  private async blacklistToken(token: string): Promise<void> {
    await this.db.insert('blacklisted_tokens', {
      token,
      blacklistedAt: new Date(),
    });
  }

  private async blacklistAllUserTokens(userId: string): Promise<void> {
    // Blacklist all active tokens for user
    await this.db.query(
      'INSERT INTO blacklisted_tokens (token, blacklistedAt) SELECT token, ? FROM auth_tokens WHERE userId = ? AND expiresAt > ?',
      [new Date(), userId, new Date()]
    );
  }
}
