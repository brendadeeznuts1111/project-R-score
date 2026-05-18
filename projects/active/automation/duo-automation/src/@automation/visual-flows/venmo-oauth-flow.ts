/**
 * 💙 Venmo OAuth Flow - FactoryWager Visual Payment Flows
 * Production-ready OAuth implementation for Venmo integration
 */

import * as crypto from 'crypto';
import { createHmac } from 'crypto';

/**
 * 💙 Venmo OAuth Configuration
 */
export interface VenmoOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  environment: 'sandbox' | 'production';
}

/**
 * 💙 Venmo OAuth Token Response
 */
export interface VenmoOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  user_id: string;
  username: string;
  display_name: string;
}

/**
 * 💙 Venmo User Profile
 */
export interface VenmoUserProfile {
  id: string;
  username: string;
  display_name: string;
  profile_picture_url: string;
  about: string;
  date_joined: string;
  balance: number;
  email: string;
  phone: string;
}

/**
 * 💙 Venmo OAuth Manager
 */
export class VenmoOAuthManager {
  private config: VenmoOAuthConfig;
  private stateStore: Map<string, { timestamp: number; userId?: string }>;

  constructor(config: VenmoOAuthConfig) {
    this.config = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
      scopes: config.scopes || [
        'access_profile',
        'access_email',
        'access_phone',
        'access_balance',
        'make_payments',
        'access_feed',
        'access_webhook'
      ],
      environment: config.environment || 'sandbox'
    };
    this.stateStore = new Map();
  }

  /**
   * 🔗 Generate OAuth authorization URL
   */
  generateAuthorizationUrl(userId?: string): string {
    const state = this.generateState();
    
    // Store state with timestamp and optional userId
    this.stateStore.set(state, {
      timestamp: Date.now(),
      userId
    });

    const baseUrl = this.config.environment === 'production' 
      ? 'https://api.venmo.com/v1/oauth/authorize'
      : 'https://sandbox-api.venmo.com/v1/oauth/authorize';

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_type: 'code',
      state
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 🔄 Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<VenmoOAuthTokenResponse> {
    try {
      // Validate state
      if (!this.validateState(state)) {
        throw new Error('Invalid or expired state parameter');
      }

      const tokenUrl = this.config.environment === 'production'
        ? 'https://api.venmo.com/v1/oauth/access_token'
        : 'https://sandbox-api.venmo.com/v1/oauth/access_token';

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token exchange failed: ${error}`);
      }

      const tokenData: VenmoOAuthTokenResponse = await response.json();
      
      // Clean up state
      this.stateStore.delete(state);

      return tokenData;
    } catch (error) {
      console.error('Venmo OAuth token exchange error:', error);
      throw error;
    }
  }

  /**
   * 👤 Get user profile with access token
   */
  async getUserProfile(accessToken: string): Promise<VenmoUserProfile> {
    try {
      const profileUrl = this.config.environment === 'production'
        ? 'https://api.venmo.com/v1/users/me'
        : 'https://sandbox-api.venmo.com/v1/users/me';

      const response = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Profile fetch failed: ${error}`);
      }

      const profileData = await response.json();
      
      return {
        id: profileData.data.id,
        username: profileData.data.username,
        display_name: profileData.data.display_name,
        profile_picture_url: profileData.data.profile_picture_url,
        about: profileData.data.about,
        date_joined: profileData.data.date_joined,
        balance: profileData.data.balance,
        email: profileData.data.email,
        phone: profileData.data.phone
      };
    } catch (error) {
      console.error('Venmo profile fetch error:', error);
      throw error;
    }
  }

  /**
   * 🔄 Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<VenmoOAuthTokenResponse> {
    try {
      const refreshUrl = this.config.environment === 'production'
        ? 'https://api.venmo.com/v1/oauth/access_token'
        : 'https://sandbox-api.venmo.com/v1/oauth/access_token';

      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: params.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Token refresh failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Venmo token refresh error:', error);
      throw error;
    }
  }

  /**
   * 💳 Make payment with OAuth token
   */
  async makePayment(
    accessToken: string,
    recipient: string,
    amount: number,
    note?: string
  ): Promise<any> {
    try {
      const paymentUrl = this.config.environment === 'production'
        ? 'https://api.venmo.com/v1/payments'
        : 'https://sandbox-api.venmo.com/v1/payments';

      const paymentData = {
        user_id: recipient,
        amount: amount * 100, // Convert to cents
        note: note || '',
        audience: 'private'
      };

      const response = await fetch(paymentUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Payment failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Venmo payment error:', error);
      throw error;
    }
  }

  /**
   * 📊 Get payment history
   */
  async getPaymentHistory(accessToken: string, limit: number = 50): Promise<any> {
    try {
      const historyUrl = this.config.environment === 'production'
        ? `https://api.venmo.com/v1/story?limit=${limit}`
        : `https://sandbox-api.venmo.com/v1/story?limit=${limit}`;

      const response = await fetch(historyUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`History fetch failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Venmo history fetch error:', error);
      throw error;
    }
  }

  /**
   * 🔐 Generate secure state parameter
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * ✅ Validate state parameter
   */
  private validateState(state: string): boolean {
    const storedState = this.stateStore.get(state);
    
    if (!storedState) {
      return false;
    }

    // Check if state is not expired (10 minutes)
    const now = Date.now();
    const age = now - storedState.timestamp;
    
    if (age > 10 * 60 * 1000) { // 10 minutes
      this.stateStore.delete(state);
      return false;
    }

    return true;
  }

  /**
   * 🧹 Clean up expired states
   */
  cleanupExpiredStates(): void {
    const now = Date.now();
    const expiredStates: string[] = [];

    for (const [state, data] of this.stateStore.entries()) {
      if (now - data.timestamp > 10 * 60 * 1000) { // 10 minutes
        expiredStates.push(state);
      }
    }

    expiredStates.forEach(state => this.stateStore.delete(state));
  }

  /**
   * 🔍 Get stored state data
   */
  getStateData(state: string): { timestamp: number; userId?: string } | undefined {
    return this.stateStore.get(state);
  }
}

/**
 * 💙 Venmo OAuth Handler
 */
export class VenmoOAuthHandler {
  private oauthManager: VenmoOAuthManager;

  constructor(config: VenmoOAuthConfig) {
    this.oauthManager = new VenmoOAuthManager(config);
  }

  /**
   * 🚀 Start OAuth flow
   */
  startOAuthFlow(userId?: string): string {
    return this.oauthManager.generateAuthorizationUrl(userId);
  }

  /**
   * 🔄 Handle OAuth callback
   */
  async handleCallback(code: string, state: string): Promise<{
    tokens: VenmoOAuthTokenResponse;
    profile: VenmoUserProfile;
    userId?: string;
  }> {
    try {
      // Exchange code for tokens
      const tokens = await this.oauthManager.exchangeCodeForToken(code, state);
      
      // Get user profile
      const profile = await this.oauthManager.getUserProfile(tokens.access_token);
      
      // Get stored state data
      const stateData = this.oauthManager.getStateData(state);
      
      return {
        tokens,
        profile,
        userId: stateData?.userId
      };
    } catch (error) {
      console.error('Venmo OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * 💳 Process payment with OAuth
   */
  async processPayment(
    accessToken: string,
    recipient: string,
    amount: number,
    note?: string
  ): Promise<any> {
    return await this.oauthManager.makePayment(accessToken, recipient, amount, note);
  }

  /**
   * 📊 Get user's payment history
   */
  async getPaymentHistory(accessToken: string, limit?: number): Promise<any> {
    return await this.oauthManager.getPaymentHistory(accessToken, limit);
  }

  /**
   * 🔄 Refresh user's access token
   */
  async refreshAccessToken(refreshToken: string): Promise<VenmoOAuthTokenResponse> {
    return await this.oauthManager.refreshToken(refreshToken);
  }
}

/**
 * 🚀 Usage Example
 */

// Initialize OAuth handler
/*
const venmoConfig: VenmoOAuthConfig = {
  clientId: process.env.VENMO_CLIENT_ID || 'your-client-id',
  clientSecret: process.env.VENMO_CLIENT_SECRET || 'your-client-secret',
  redirectUri: 'https://your-app.com/callback/venmo',
  scopes: [
    'access_profile',
    'access_email',
    'access_phone',
    'access_balance',
    'make_payments',
    'access_feed',
    'access_webhook'
  ],
  environment: 'sandbox' // or 'production'
};

const venmoOAuth = new VenmoOAuthHandler(venmoConfig);

// Start OAuth flow
export async function startVenmoOAuth(userId: string) {
  const authUrl = venmoOAuth.startOAuthFlow(userId);
  return { authUrl };
}

// Handle OAuth callback
export async function handleVenmoCallback(code: string, state: string) {
  const result = await venmoOAuth.handleCallback(code, state);
  
  // Store tokens securely in your database
  await storeUserTokens(result.profile.id, result.tokens);
  
  return result;
}

// Make payment
export async function makeVenmoPayment(userId: string, recipient: string, amount: number, note?: string) {
  const tokens = await getUserTokens(userId);
  const payment = await venmoOAuth.processPayment(tokens.access_token, recipient, amount, note);
  return payment;
}
*/

// Example callback URL structure:
/*
GET /callback/venmo?code=AUTH_CODE_HERE&state=STATE_PARAMETER_HERE
*/

// Example token response:
/*
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scope": "access_profile access_email access_phone access_balance make_payments",
  "user_id": "1234567890",
  "username": "john_doe",
  "display_name": "John Doe"
}
*/

// Example user profile:
/*
{
  "id": "1234567890",
  "username": "john_doe",
  "display_name": "John Doe",
  "profile_picture_url": "https://venmo.com/profile-picture.jpg",
  "about": "Software engineer",
  "date_joined": "2020-01-15",
  "balance": 12345,
  "email": "john@example.com",
  "phone": "+1234567890"
}
*/
