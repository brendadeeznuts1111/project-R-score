/**
 * 🔍 Fire22 Account Search System
 *
 * Advanced search functionality for customers, agents, and accounts
 * Real-time search with intelligent filtering and results
 */

import { EventEmitter } from 'events';

export interface SearchCriteria {
  query: string;
  type: 'customers' | 'agents' | 'all';
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

export class AccountSearch extends EventEmitter {
  private searchInput: HTMLInputElement;
  private resultsContainer: HTMLElement;
  private searchTimeout: NodeJS.Timeout;
  private currentQuery: string = '';
  private isLoading: boolean = false;

  constructor(searchInput: HTMLInputElement, resultsContainer: HTMLElement) {
    super();
    this.searchInput = searchInput;
    this.resultsContainer = resultsContainer;
    this.initializeSearch();
  }

  private initializeSearch(): void {
    // Setup input event listeners
    this.searchInput.addEventListener('input', this.handleInput.bind(this));
    this.searchInput.addEventListener('keydown', this.handleKeydown.bind(this));
    this.searchInput.addEventListener('focus', this.handleFocus.bind(this));
    this.searchInput.addEventListener('blur', this.handleBlur.bind(this));

    // Setup results container
    this.setupResultsContainer();

    console.log('🔍 Account search initialized');
  }

  private setupResultsContainer(): void {
    this.resultsContainer.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      display: none;
    `;
  }

  private handleInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value.trim();

    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Update current query
    this.currentQuery = query;

    if (query.length === 0) {
      this.hideResults();
      return;
    }

    // Debounce search for better performance
    if (query.length >= 2) {
      this.searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    // Handle arrow keys for navigation
    if (event.key === 'Escape') {
      this.hideResults();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.selectFirstResult();
    }
  }

  private handleFocus(): void {
    if (this.currentQuery.length >= 2 && this.resultsContainer.children.length > 0) {
      this.showResults();
    }
  }

  private handleBlur(): void {
    // Delay hiding to allow for result clicks
    setTimeout(() => {
      this.hideResults();
    }, 200);
  }

  private async performSearch(query: string): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    this.showLoadingState();

    try {
      const searchCriteria: SearchCriteria = {
        query,
        type: 'all', // Search both customers and agents
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const response = await this.searchAccounts(searchCriteria);

      if (response.success) {
        this.displayResults(response.results, query);
        this.emit('search-completed', response);
      } else {
        this.showError('Search failed: ' + response.error);
      }
    } catch (error) {
      console.error('Search error:', error);
      this.showError('Search failed: ' + error.message);
    } finally {
      this.isLoading = false;
    }
  }

  private async searchAccounts(criteria: SearchCriteria): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      // Parallel search for customers and agents
      const [customerResults, agentResults] = await Promise.all([
        this.searchCustomers(criteria),
        this.searchAgents(criteria),
      ]);

      // Combine and sort results
      const allResults = [...customerResults, ...agentResults]
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, criteria.limit || 10);

      return {
        success: true,
        results: allResults,
        totalCount: allResults.length,
        searchTime: Date.now() - startTime,
        query: criteria.query,
      };
    } catch (error) {
      return {
        success: false,
        results: [],
        totalCount: 0,
        searchTime: Date.now() - startTime,
        query: criteria.query,
        error: error.message,
      };
    }
  }

  private async searchCustomers(criteria: SearchCriteria): Promise<SearchResult[]> {
    try {
      const response = await fetch('/api/customers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: criteria.query,
          filters: criteria.filters,
          limit: criteria.limit || 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Customer search failed: ${response.status}`);
      }

      const data = await response.json();
      return data.results.map((customer: any) => ({
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
        matchScore: this.calculateMatchScore(criteria.query, customer),
        highlightedFields: this.highlightMatches(criteria.query, customer),
      }));
    } catch (error) {
      console.error('Customer search error:', error);
      return [];
    }
  }

  private async searchAgents(criteria: SearchCriteria): Promise<SearchResult[]> {
    try {
      const response = await fetch('/api/agents/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: criteria.query,
          filters: criteria.filters,
          limit: criteria.limit || 3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent search failed: ${response.status}`);
      }

      const data = await response.json();
      return data.results.map((agent: any) => ({
        id: agent.agent_id,
        type: 'agent' as const,
        name: agent.agent_name,
        agentId: agent.agent_id,
        status: agent.status || 'unknown',
        tier: agent.agent_type,
        lastActivity: agent.last_login_at,
        matchScore: this.calculateMatchScore(criteria.query, agent),
        highlightedFields: this.highlightMatches(criteria.query, agent),
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
    if (item.lastActivity) {
      const daysSinceActivity = Math.floor(
        (Date.now() - new Date(item.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActivity <= 7) score += 20;
      else if (daysSinceActivity <= 30) score += 10;
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

  private displayResults(results: SearchResult[], query: string): void {
    this.resultsContainer.innerHTML = '';

    if (results.length === 0) {
      this.showNoResults(query);
      return;
    }

    // Create result items
    results.forEach(result => {
      const resultItem = this.createResultItem(result);
      this.resultsContainer.appendChild(resultItem);
    });

    // Add "View All Results" link
    const viewAllLink = document.createElement('div');
    viewAllLink.className = 'search-view-all';
    viewAllLink.innerHTML = `
      <a href="#" onclick="viewAllSearchResults('${query}')">
        View all ${results.length}+ results
      </a>
    `;
    viewAllLink.style.cssText = `
      padding: 8px 12px;
      text-align: center;
      border-top: 1px solid #eee;
      background: #f8f9fa;
    `;
    this.resultsContainer.appendChild(viewAllLink);

    this.showResults();
  }

  private createResultItem(result: SearchResult): HTMLElement {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.style.cssText = `
      padding: 12px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const icon = result.type === 'customer' ? '👤' : '👨‍💼';
    const statusColor = result.status === 'active' ? '#28a745' : '#6c757d';

    item.innerHTML = `
      <div class="result-icon">${icon}</div>
      <div class="result-content" style="flex: 1;">
        <div class="result-name" style="font-weight: 500; margin-bottom: 2px;">
          ${result.name}
        </div>
        <div class="result-meta" style="font-size: 12px; color: #666;">
          ${result.customerId || result.agentId}
          ${result.balance !== undefined ? ` • $${result.balance.toFixed(2)}` : ''}
          ${result.agentName ? ` • Agent: ${result.agentName}` : ''}
        </div>
      </div>
      <div class="result-status" style="
        font-size: 11px;
        color: white;
        background: ${statusColor};
        padding: 2px 6px;
        border-radius: 10px;
      ">
        ${result.status}
      </div>
    `;

    // Add click handler
    item.addEventListener('click', () => {
      this.selectResult(result);
    });

    return item;
  }

  private selectResult(result: SearchResult): void {
    this.hideResults();

    // Update search input with selected result
    this.searchInput.value = result.name;

    // Emit selection event
    this.emit('result-selected', result);

    // Navigate to appropriate page
    if (result.type === 'customer') {
      window.location.href = `/customer/${result.customerId}`;
    } else {
      window.location.href = `/agent/${result.agentId}`;
    }
  }

  private selectFirstResult(): void {
    const firstResult = this.resultsContainer.querySelector('.search-result-item') as HTMLElement;
    if (firstResult) {
      firstResult.click();
    }
  }

  private showLoadingState(): void {
    this.resultsContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #666;">
        🔍 Searching...
      </div>
    `;
    this.showResults();
  }

  private showNoResults(query: string): void {
    this.resultsContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #666;">
        No results found for "${query}"
      </div>
    `;
    this.showResults();
  }

  private showError(message: string): void {
    this.resultsContainer.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #dc3545;">
        ❌ ${message}
      </div>
    `;
    this.showResults();
  }

  private showResults(): void {
    this.resultsContainer.style.display = 'block';
  }

  private hideResults(): void {
    this.resultsContainer.style.display = 'none';
  }

  // Public API methods
  public setSearchCriteria(criteria: Partial<SearchCriteria>): void {
    // Update search behavior
    console.log('Search criteria updated:', criteria);
  }

  public clearSearch(): void {
    this.searchInput.value = '';
    this.currentQuery = '';
    this.hideResults();
  }

  public focus(): void {
    this.searchInput.focus();
  }

  // Cleanup
  public destroy(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchInput.removeEventListener('input', this.handleInput);
    this.searchInput.removeEventListener('keydown', this.handleKeydown);
    this.searchInput.removeEventListener('focus', this.handleFocus);
    this.searchInput.removeEventListener('blur', this.handleBlur);

    this.removeAllListeners();
  }
}

// Utility functions
export function initializeAccountSearch(
  searchInputId: string,
  resultsContainerId: string
): AccountSearch {
  const searchInput = document.getElementById(searchInputId) as HTMLInputElement;
  const resultsContainer = document.getElementById(resultsContainerId) as HTMLElement;

  if (!searchInput || !resultsContainer) {
    throw new Error('Search input or results container not found');
  }

  return new AccountSearch(searchInput, resultsContainer);
}

// Global utility functions for the HTML
declare global {
  interface Window {
    viewAllSearchResults: (query: string) => void;
    initializeAccountSearch: typeof initializeAccountSearch;
  }
}

window.viewAllSearchResults = (query: string) => {
  window.location.href = `/search?q=${encodeURIComponent(query)}`;
};

window.initializeAccountSearch = initializeAccountSearch;

export { SearchCriteria, SearchResult, SearchResponse };
