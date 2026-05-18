/**
 * 🔍 Fire22 Search API
 *
 * Unified search endpoints for customers, agents, and accounts
 * Provides fast, intelligent search with filtering and scoring
 */

import { createSuccessResponse, createErrorResponse } from '../errors/middleware';
import { RetryUtils } from '../errors/RetryUtils';
import {
  CustomerRepository,
  CustomerSearchOptions,
} from '../repositories/fire22/customer-repository';
import { AgentRepository, AgentSearchOptions } from '../repositories/fire22/agent-repository';

export interface SearchRequest {
  query: string;
  type?: 'customers' | 'agents' | 'all';
  filters?: {
    agentId?: string;
    status?: string;
    tier?: string;
    balanceMin?: number;
    balanceMax?: number;
    riskLevel?: string;
    lastActivityDays?: number;
  };
  limit?: number;
  sortBy?: 'name' | 'balance' | 'lastActivity' | 'agentId';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  id: string;
  type: 'customer' | 'agent';
  name: string;
  customerId?: string;
  agentId?: string;
  balance?: number;
  status: string;
  tier?: string;
  lastActivity?: string;
  agentName?: string;
  riskLevel?: string;
  matchScore: number;
  highlightedFields: Record<string, string>;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  query: string;
  error?: string;
}

export class SearchAPI {
  private customerRepo: CustomerRepository;
  private agentRepo: AgentRepository;

  constructor(db: D1Database) {
    this.customerRepo = new CustomerRepository(db);
    this.agentRepo = new AgentRepository(db);
  }

  /**
   * Unified search endpoint for customers and agents
   */
  async handleSearch(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as SearchRequest;
      const { query, type = 'all', filters, limit = 10, sortBy, sortOrder } = body;

      if (!query || query.trim().length < 2) {
        return createErrorResponse('Query must be at least 2 characters long', 400);
      }

      const startTime = Date.now();
      let results: SearchResult[] = [];

      // Search based on type
      if (type === 'customers' || type === 'all') {
        const customerResults = await this.searchCustomers(query, filters, limit);
        results.push(...customerResults);
      }

      if (type === 'agents' || type === 'all') {
        const agentResults = await this.searchAgents(query, filters, Math.ceil(limit / 2));
        results.push(...agentResults);
      }

      // Sort results by match score
      results.sort((a, b) => b.matchScore - a.matchScore);

      // Apply limit after combining
      results = results.slice(0, limit);

      const response: SearchResponse = {
        success: true,
        results,
        totalCount: results.length,
        searchTime: Date.now() - startTime,
        query,
      };

      return createSuccessResponse(response);
    } catch (error) {
      console.error('Search API error:', error);
      return createErrorResponse('Search failed: ' + error.message, 500);
    }
  }

  /**
   * Customer-specific search endpoint
   */
  async handleCustomerSearch(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as SearchRequest;
      const { query, filters, limit = 10 } = body;

      if (!query || query.trim().length < 2) {
        return createErrorResponse('Query must be at least 2 characters long', 400);
      }

      const startTime = Date.now();
      const results = await this.searchCustomers(query, filters, limit);

      const response: SearchResponse = {
        success: true,
        results,
        totalCount: results.length,
        searchTime: Date.now() - startTime,
        query,
      };

      return createSuccessResponse(response);
    } catch (error) {
      console.error('Customer search error:', error);
      return createErrorResponse('Customer search failed: ' + error.message, 500);
    }
  }

  /**
   * Agent-specific search endpoint
   */
  async handleAgentSearch(request: Request): Promise<Response> {
    try {
      const body = (await request.json()) as SearchRequest;
      const { query, filters, limit = 10 } = body;

      if (!query || query.trim().length < 2) {
        return createErrorResponse('Query must be at least 2 characters long', 400);
      }

      const startTime = Date.now();
      const results = await this.searchAgents(query, filters, limit);

      const response: SearchResponse = {
        success: true,
        results,
        totalCount: results.length,
        searchTime: Date.now() - startTime,
        query,
      };

      return createSuccessResponse(response);
    } catch (error) {
      console.error('Agent search error:', error);
      return createErrorResponse('Agent search failed: ' + error.message, 500);
    }
  }

  private async searchCustomers(
    query: string,
    filters?: SearchRequest['filters'],
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      const searchOptions: CustomerSearchOptions = {
        search: query,
        searchFields: ['customer_id', 'name', 'phone'],
        limit,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      // Apply additional filters
      if (filters) {
        if (filters.agentId) searchOptions.agent_id = filters.agentId;
        if (filters.status) searchOptions.status = filters.status as any;
        if (filters.tier) searchOptions.tier = filters.tier as any;
        if (filters.balanceMin) searchOptions.balance_min = filters.balanceMin;
        if (filters.balanceMax) searchOptions.balance_max = filters.balanceMax;
        if (filters.riskLevel) searchOptions.risk_level = filters.riskLevel;
        if (filters.lastActivityDays) searchOptions.last_activity_days = filters.lastActivityDays;
      }

      const result = await this.customerRepo.searchCustomers(searchOptions);

      if (!result.success || !result.data) {
        return [];
      }

      return result.data.map(customer => ({
        id: customer.customer_id,
        type: 'customer' as const,
        name: customer.name || customer.customer_id,
        customerId: customer.customer_id,
        agentId: customer.agent_id,
        balance: customer.balance || 0,
        status: customer.status || 'unknown',
        tier: customer.tier,
        lastActivity: customer.last_login || customer.last_ticket,
        riskLevel: customer.risk_level,
        matchScore: this.calculateMatchScore(query, customer),
        highlightedFields: this.highlightMatches(query, customer),
      }));
    } catch (error) {
      console.error('Customer search error:', error);
      return [];
    }
  }

  private async searchAgents(
    query: string,
    filters?: SearchRequest['filters'],
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      const searchOptions: AgentSearchOptions = {
        search: query,
        searchFields: ['agent_id', 'agent_name'],
        limit,
        sortBy: 'agent_name',
        sortOrder: 'asc',
      };

      // Apply additional filters
      if (filters) {
        if (filters.status) searchOptions.status = filters.status as any;
        if (filters.tier) searchOptions.agent_type = filters.tier as any;
      }

      const result = await this.agentRepo.searchAgents(searchOptions);

      if (!result.success || !result.data) {
        return [];
      }

      return result.data.map(agent => ({
        id: agent.agent_id,
        type: 'agent' as const,
        name: agent.agent_name,
        agentId: agent.agent_id,
        status: agent.status || 'unknown',
        tier: agent.agent_type,
        lastActivity: agent.last_login_at,
        matchScore: this.calculateMatchScore(query, agent),
        highlightedFields: this.highlightMatches(query, agent),
      }));
    } catch (error) {
      console.error('Agent search error:', error);
      return [];
    }
  }

  private calculateMatchScore(query: string, item: any): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // Exact matches get highest score
    if (item.name?.toLowerCase() === queryLower) score += 100;
    if (item.customer_id?.toLowerCase() === queryLower) score += 100;
    if (item.agent_id?.toLowerCase() === queryLower) score += 100;

    // Partial matches
    if (item.name?.toLowerCase().includes(queryLower)) score += 50;
    if (item.customer_id?.toLowerCase().includes(queryLower)) score += 50;
    if (item.agent_id?.toLowerCase().includes(queryLower)) score += 50;

    // Recent activity bonus
    if (item.lastActivity || item.last_login_at || item.last_login || item.last_ticket) {
      const lastActivity =
        item.lastActivity || item.last_login_at || item.last_login || item.last_ticket;
      if (lastActivity) {
        const daysSinceActivity = Math.floor(
          (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceActivity <= 7) score += 20;
        else if (daysSinceActivity <= 30) score += 10;
      }
    }

    return score;
  }

  private highlightMatches(query: string, item: any): Record<string, string> {
    const highlighted: Record<string, string> = {};
    const queryLower = query.toLowerCase();

    Object.keys(item).forEach(key => {
      const value = String(item[key] || '');
      if (value.toLowerCase().includes(queryLower)) {
        highlighted[key] = value.replace(new RegExp(`(${query})`, 'gi'), '<mark>$1</mark>');
      }
    });

    return highlighted;
  }
}

// Route handlers
export async function handleUnifiedSearch(request: Request, env: any): Promise<Response> {
  const searchAPI = new SearchAPI(env.DB);
  return await searchAPI.handleSearch(request);
}

export async function handleCustomerSearch(request: Request, env: any): Promise<Response> {
  const searchAPI = new SearchAPI(env.DB);
  return await searchAPI.handleCustomerSearch(request);
}

export async function handleAgentSearch(request: Request, env: any): Promise<Response> {
  const searchAPI = new SearchAPI(env.DB);
  return await searchAPI.handleAgentSearch(request);
}

export { SearchRequest, SearchResult, SearchResponse };
