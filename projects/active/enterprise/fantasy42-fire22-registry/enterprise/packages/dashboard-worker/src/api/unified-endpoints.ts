/**
 * 🔥 Fire22 Unified API Endpoints
 * Shared endpoints for both dashboard and Telegram bot
 */

import { Env } from '../env';
import { Fire22SystemController } from '../integration/system-controller';

export interface UnifiedAPIRequest {
  method: string;
  path: string;
  body?: any;
  headers?: Record<string, string>;
  user?: {
    id: string;
    username: string;
    telegramId?: number;
    isAdmin: boolean;
  };
  systemController: Fire22SystemController;
}

export interface UnifiedAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

/**
 * Unified API Handler
 */
export class UnifiedAPIHandler {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Handle unified API requests
   */
  async handleRequest(request: UnifiedAPIRequest): Promise<UnifiedAPIResponse> {
    try {
      const { method, path, body, user, systemController } = request;

      // Route to appropriate handler
      switch (path) {
        case '/api/auth/login':
          return await this.handleLogin(body, systemController);

        case '/api/user/profile':
          return await this.handleGetProfile(user, systemController);

        case '/api/user/balance':
          return await this.handleGetBalance(user, systemController);

        case '/api/wagers/list':
          return await this.handleGetWagers(user, body, systemController);

        case '/api/wagers/place':
          return await this.handlePlaceWager(user, body, systemController);

        case '/api/agents/list':
          return await this.handleGetAgents(user, systemController);

        case '/api/agents/performance':
          return await this.handleGetAgentPerformance(user, body, systemController);

        case '/api/system/status':
          return await this.handleGetSystemStatus(systemController);

        case '/api/notifications/send':
          return await this.handleSendNotification(user, body, systemController);

        case '/api/fire22/player-info':
          return await this.handleGetPlayerInfo(user, body, systemController);

        case '/api/fire22/transactions':
          return await this.handleGetTransactions(user, body, systemController);

        case '/api/fire22/crypto-info':
          return await this.handleGetCryptoInfo(user, body, systemController);

        case '/api/fire22/teaser-profile':
          return await this.handleGetTeaserProfile(user, body, systemController);

        case '/api/fire22/mail':
          return await this.handleGetMail(user, body, systemController);

        case '/api/fire22/web-log':
          return await this.handleGetWebLog(user, body, systemController);

        case '/api/fire22/operation':
          return await this.handleFire22Operation(user, body, systemController);

        default:
          return {
            success: false,
            error: 'Endpoint not found',
          };
      }
    } catch (error) {
      console.error('Unified API error:', error);
      return {
        success: false,
        error: 'Internal server error',
      };
    }
  }

  /**
   * Handle login
   */
  private async handleLogin(
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    const { username, password } = body;

    // Validate credentials (simplified for demo)
    if (username === 'admin' && password === 'Fire22Admin2025!') {
      const user = {
        id: 'admin',
        username: 'admin',
        isAdmin: true,
      };

      // Broadcast login event
      await systemController.broadcastSystemEvent('user:login', {
        username: user.username,
        isAdmin: user.isAdmin,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: {
          user,
          token: 'demo-jwt-token', // In production, generate real JWT
          message: 'Login successful',
        },
      };
    }

    return {
      success: false,
      error: 'Invalid credentials',
    };
  }

  /**
   * Handle get user profile
   */
  private async handleGetProfile(
    user: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      // Get user profile from database
      const profile = await this.env.DB.prepare(
        `
        SELECT customer_id, username, first_name, last_name, email, 
               account_type, status, balance, credit_limit
        FROM players 
        WHERE customer_id = ?
      `
      )
        .bind(user.id)
        .first();

      return {
        success: true,
        data: profile || {
          customer_id: user.id,
          username: user.username,
          first_name: 'Demo',
          last_name: 'User',
          account_type: 'admin',
          status: 'active',
          balance: 1000.0,
          credit_limit: 5000.0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch profile',
      };
    }
  }

  /**
   * Handle get user balance
   */
  private async handleGetBalance(
    user: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const balance = await this.env.DB.prepare(
        `
        SELECT balance, credit_limit, outstanding_balance
        FROM players 
        WHERE customer_id = ?
      `
      )
        .bind(user.id)
        .first();

      return {
        success: true,
        data: balance || {
          balance: 1000.0,
          credit_limit: 5000.0,
          outstanding_balance: 0.0,
          available_credit: 5000.0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch balance',
      };
    }
  }

  /**
   * Handle get wagers
   */
  private async handleGetWagers(
    user: any,
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const { limit = 10, offset = 0 } = body || {};

      const wagers = await this.env.DB.prepare(
        `
        SELECT bet_id, customer_id, selection, stake, odds, 
               potential_win, status, placed_at
        FROM bets 
        WHERE customer_id = ?
        ORDER BY placed_at DESC
        LIMIT ? OFFSET ?
      `
      )
        .bind(user.id, limit, offset)
        .all();

      return {
        success: true,
        data: {
          wagers: wagers.results || [],
          total: wagers.results?.length || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch wagers',
      };
    }
  }

  /**
   * Handle place wager
   */
  private async handlePlaceWager(
    user: any,
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user) {
      return { success: false, error: 'Authentication required' };
    }

    try {
      const { selection, stake, odds } = body;
      const potential_win = stake * odds;

      // Insert wager (simplified)
      const result = await this.env.DB.prepare(
        `
        INSERT INTO bets (customer_id, selection, stake, odds, potential_win, status, placed_at)
        VALUES (?, ?, ?, ?, ?, 'pending', datetime('now'))
      `
      )
        .bind(user.id, selection, stake, odds, potential_win)
        .run();

      // Broadcast wager event
      await systemController.broadcastSystemEvent('wager:placed', {
        username: user.username,
        telegramId: user.telegramId,
        amount: stake,
        selection,
        odds,
        potential_win,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        data: {
          bet_id: result.meta?.last_row_id,
          message: 'Wager placed successfully',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to place wager',
      };
    }
  }

  /**
   * Handle get agents (admin only)
   */
  private async handleGetAgents(
    user: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user?.isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    try {
      const agents = await this.env.DB.prepare(
        `
        SELECT agent_id, agent_name, master_agent_id, status, 
               internet_rate, casino_rate, sports_rate
        FROM agents 
        ORDER BY agent_name
      `
      ).all();

      return {
        success: true,
        data: {
          agents: agents.results || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch agents',
      };
    }
  }

  /**
   * Handle get agent performance (admin only)
   */
  private async handleGetAgentPerformance(
    user: any,
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user?.isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    try {
      const { agentId = 'BLAKEPPH', period = '7d' } = body || {};

      // Call real Fire22 API
      const fire22Response = await this.callFire22API('/Manager/getAgentPerformance', {
        agentID: agentId,
        agentOwner: agentId,
        agentSite: 1,
      });

      if (fire22Response.success) {
        return {
          success: true,
          data: {
            agentId,
            period,
            performance: fire22Response.data,
            timestamp: new Date().toISOString(),
          },
        };
      } else {
        // Fallback to mock data
        const performance = {
          agentId,
          period,
          totalVolume: 50000,
          totalWagers: 150,
          commission: 2500,
          winRate: 0.65,
          timestamp: new Date().toISOString(),
        };

        return {
          success: true,
          data: performance,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch agent performance',
      };
    }
  }

  /**
   * Call Fire22 API
   */
  private async callFire22API(
    endpoint: string,
    data: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const fire22BaseUrl = this.env.FIRE22_API_BASE_URL || 'https://fire22.ag/cloud/api';
      const fire22Token = this.env.FIRE22_TOKEN;

      if (!fire22Token) {
        console.warn('FIRE22_TOKEN not configured, using mock data');
        return { success: false, error: 'Fire22 token not configured' };
      }

      // Import Fire22Config for proper headers
      const { Fire22Config } = await import('../config/fire22-config');

      const response = await fetch(`${fire22BaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          ...Fire22Config.getDefaultHeaders(),
          'Content-Type': 'application/json',
          Authorization: `Bearer ${fire22Token}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const responseData = await response.json();
        return { success: true, data: responseData };
      } else {
        return { success: false, error: `Fire22 API error: ${response.status}` };
      }
    } catch (error) {
      console.error('Fire22 API call failed:', error);
      return { success: false, error: 'Fire22 API call failed' };
    }
  }

  /**
   * Handle get system status
   */
  private async handleGetSystemStatus(
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    const status = systemController.getSystemStatus();

    return {
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString(),
        version: '3.0.8',
      },
    };
  }

  /**
   * Handle send notification (admin only)
   */
  private async handleSendNotification(
    user: any,
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user?.isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    try {
      const { message, target = 'all' } = body;

      // Broadcast notification
      await systemController.broadcastSystemEvent('system:alert', {
        message,
        target,
        sender: user.username,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'Notification sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to send notification',
      };
    }
  }

  /**
   * Handle get player info from Fire22
   */
  private async handleGetPlayerInfo(
    user: any,
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user?.isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    try {
      const { playerId, agentId = 'BLAKEPPH' } = body || {};

      const fire22Response = await this.callFire22API('/Manager/getInfoPlayer', {
        playerID: playerId,
        agentID: agentId,
        agentOwner: agentId,
        agentSite: 1,
      });

      return fire22Response.success
        ? { success: true, data: fire22Response.data }
        : { success: false, error: 'Failed to fetch player info' };
    } catch (error) {
      return { success: false, error: 'Failed to fetch player info' };
    }
  }

  /**
   * Handle get transactions from Fire22
   */
  private async handleGetTransactions(
    user: any,
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user?.isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    try {
      const { playerId, agentId = 'BLAKEPPH', limit = 50 } = body || {};

      const fire22Response = await this.callFire22API('/Manager/getTransactionList', {
        playerID: playerId,
        agentID: agentId,
        agentOwner: agentId,
        agentSite: 1,
        limit,
      });

      return fire22Response.success
        ? { success: true, data: fire22Response.data }
        : { success: false, error: 'Failed to fetch transactions' };
    } catch (error) {
      return { success: false, error: 'Failed to fetch transactions' };
    }
  }

  /**
   * Handle get crypto info from Fire22
   */
  private async handleGetCryptoInfo(
    user: any,
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user?.isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    try {
      const { agentId = 'BLAKEPPH' } = body || {};

      const fire22Response = await this.callFire22API('/Manager/getCryptoInfo', {
        agentID: agentId,
        agentOwner: agentId,
        agentSite: 1,
      });

      return fire22Response.success
        ? { success: true, data: fire22Response.data }
        : { success: false, error: 'Failed to fetch crypto info' };
    } catch (error) {
      return { success: false, error: 'Failed to fetch crypto info' };
    }
  }

  /**
   * Handle get teaser profile from Fire22
   */
  private async handleGetTeaserProfile(
    user: any,
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user?.isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    try {
      const { playerId, agentId = 'BLAKEPPH' } = body || {};

      const fire22Response = await this.callFire22API('/Manager/getTeaserProfile', {
        playerID: playerId,
        agentID: agentId,
        agentOwner: agentId,
        agentSite: 1,
      });

      return fire22Response.success
        ? { success: true, data: fire22Response.data }
        : { success: false, error: 'Failed to fetch teaser profile' };
    } catch (error) {
      return { success: false, error: 'Failed to fetch teaser profile' };
    }
  }

  /**
   * Handle get mail from Fire22
   */
  private async handleGetMail(
    user: any,
    body: any,
    systemController: Fire22SystemController
  ): Promise<UnifiedAPIResponse> {
    if (!user?.isAdmin) {
      return { success: false, error: 'Admin access required' };
    }

    try {
      const { agentId = 'BLAKEPPH' } = body || {};

      const fire22Response = await this.callFire22API('/Manager/getMail', {
        agentID: agentId,
        agentOwner: agentId,
        agentSite: 1,
      });

      return fire22Response.success
        ? { success: true, data: fire22Response.data }
        : { success: false, error: 'Failed to fetch mail' };
    } catch (error) {
      return { success: false, error: 'Failed to fetch mail' };
    }
  }
}

/**
 * Create unified API handler
 */
export function createUnifiedAPIHandler(env: Env): UnifiedAPIHandler {
  return new UnifiedAPIHandler(env);
}
