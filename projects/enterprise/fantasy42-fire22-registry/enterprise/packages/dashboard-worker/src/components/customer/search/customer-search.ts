/**
 * Customer Search Module
 * Advanced customer search and filtering functionality
 */

import type {
  CustomerSearchOptions,
  CustomerSearchFilters,
  CustomerProfile,
  CustomerPaginationOptions,
} from '../core/customer-interface-types';
import { CustomerInformationService } from '../../../services/customer-information-service';

export class CustomerSearch {
  private customerService: CustomerInformationService;
  private searchCache: Map<string, { results: CustomerProfile[]; timestamp: Date }> = new Map();
  private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.customerService = CustomerInformationService.getInstance();
  }

  /**
   * Perform customer search
   */
  async search(options: CustomerSearchOptions): Promise<{
    results: CustomerProfile[];
    pagination: CustomerPaginationOptions;
    totalFound: number;
    searchTime: number;
  }> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Searching customers: "${options.query}"`);

      // Check cache first
      const cacheKey = this.generateCacheKey(options);
      const cached = this.getCachedResults(cacheKey);

      if (cached) {
        console.log('✅ Using cached search results');
        return {
          ...cached,
          searchTime: Date.now() - startTime,
        };
      }

      // Perform search
      const searchFilters: CustomerSearchFilters = {
        ...options.filters,
        query: options.query,
      };

      const customers = await this.customerService.searchCustomers(searchFilters);

      // Apply sorting
      const sortedCustomers = this.applySorting(customers, options.sortBy, options.sortOrder);

      // Apply pagination
      const { results, pagination } = this.applyPagination(
        sortedCustomers,
        options.page,
        options.limit
      );

      const searchResult = {
        results,
        pagination,
        totalFound: customers.length,
        searchTime: Date.now() - startTime,
      };

      // Cache results
      this.cacheResults(cacheKey, {
        results,
        pagination,
        totalFound: customers.length,
      });

      console.log(`✅ Search completed: ${results.length} results in ${searchResult.searchTime}ms`);
      return searchResult;
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Perform advanced search with multiple criteria
   */
  async advancedSearch(criteria: {
    name?: string;
    email?: string;
    phone?: string;
    status?: string[];
    vipTier?: string[];
    riskLevel?: string[];
    balanceRange?: { min: number; max: number };
    createdDateRange?: { start: Date; end: Date };
    lastLoginRange?: { start: Date; end: Date };
    tags?: string[];
    customFields?: Record<string, any>;
  }): Promise<CustomerProfile[]> {
    console.log('🔬 Performing advanced search');

    const filters: CustomerSearchFilters = {};

    // Build filters from criteria
    if (criteria.name) filters.name = criteria.name;
    if (criteria.email) filters.email = criteria.email;
    if (criteria.phone) filters.phone = criteria.phone;
    if (criteria.status) filters.status = criteria.status;
    if (criteria.vipTier) filters.vipTier = criteria.vipTier;
    if (criteria.riskLevel) filters.riskLevel = criteria.riskLevel;
    if (criteria.balanceRange) filters.balance = criteria.balanceRange;
    if (criteria.createdDateRange) filters.createdAt = criteria.createdDateRange;
    if (criteria.lastLoginRange) filters.lastLogin = criteria.lastLoginRange;
    if (criteria.tags) filters.tags = criteria.tags;
    if (criteria.customFields) filters.customFields = criteria.customFields;

    return await this.customerService.searchCustomers(filters);
  }

  /**
   * Search customers by tags
   */
  async searchByTags(tags: string[], matchAll: boolean = false): Promise<CustomerProfile[]> {
    console.log(`🏷️ Searching by tags: ${tags.join(', ')}`);

    const filters: CustomerSearchFilters = {
      tags: matchAll ? tags : undefined,
    };

    const customers = await this.customerService.searchCustomers(filters);

    if (!matchAll) {
      // Match any tag
      return customers.filter(customer => customer.tags?.some(tag => tags.includes(tag)));
    }

    return customers;
  }

  /**
   * Search customers by VIP tier
   */
  async searchByVIPTier(tiers: string[]): Promise<CustomerProfile[]> {
    console.log(`👑 Searching by VIP tiers: ${tiers.join(', ')}`);

    const filters: CustomerSearchFilters = {
      vipTier: tiers,
    };

    return await this.customerService.searchCustomers(filters);
  }

  /**
   * Search customers by risk level
   */
  async searchByRiskLevel(riskLevels: string[]): Promise<CustomerProfile[]> {
    console.log(`⚠️ Searching by risk levels: ${riskLevels.join(', ')}`);

    const filters: CustomerSearchFilters = {
      riskLevel: riskLevels,
    };

    return await this.customerService.searchCustomers(filters);
  }

  /**
   * Search customers with balance in range
   */
  async searchByBalanceRange(min: number, max: number): Promise<CustomerProfile[]> {
    console.log(`💰 Searching by balance range: $${min} - $${max}`);

    const filters: CustomerSearchFilters = {
      balance: { min, max },
    };

    return await this.customerService.searchCustomers(filters);
  }

  /**
   * Search customers by activity date range
   */
  async searchByActivityDate(
    startDate: Date,
    endDate: Date,
    activityType: 'created' | 'login' | 'transaction' = 'login'
  ): Promise<CustomerProfile[]> {
    console.log(
      `📅 Searching by ${activityType} date range: ${startDate.toISOString()} - ${endDate.toISOString()}`
    );

    const filters: CustomerSearchFilters = {};

    switch (activityType) {
      case 'created':
        filters.createdAt = { start: startDate, end: endDate };
        break;
      case 'login':
        filters.lastLogin = { start: startDate, end: endDate };
        break;
      case 'transaction':
        filters.lastTransaction = { start: startDate, end: endDate };
        break;
    }

    return await this.customerService.searchCustomers(filters);
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.length < 2) return [];

    try {
      // Get customer data for suggestions
      const customers = await this.customerService.getAllCustomers();

      const suggestions = new Set<string>();

      // Name suggestions
      customers.forEach(customer => {
        if (customer.firstName?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(customer.firstName);
        }
        if (customer.lastName?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(customer.lastName);
        }
        if (customer.email?.toLowerCase().includes(query.toLowerCase())) {
          suggestions.add(customer.email);
        }
        if (customer.phone?.includes(query)) {
          suggestions.add(customer.phone);
        }
      });

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      console.error('❌ Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Get popular search terms
   */
  async getPopularSearchTerms(limit: number = 20): Promise<Array<{ term: string; count: number }>> {
    // This would typically come from analytics/search history
    // For now, return mock data
    return [
      { term: 'john', count: 45 },
      { term: 'smith', count: 32 },
      { term: 'gmail.com', count: 28 },
      { term: 'active', count: 25 },
      { term: 'gold', count: 22 },
    ].slice(0, limit);
  }

  /**
   * Get search statistics
   */
  getSearchStats(): {
    totalSearches: number;
    averageResults: number;
    popularFilters: Array<{ filter: string; count: number }>;
    cacheHitRate: number;
    averageSearchTime: number;
  } {
    // Mock statistics - in real implementation, these would be tracked
    return {
      totalSearches: 1250,
      averageResults: 15.5,
      popularFilters: [
        { filter: 'status', count: 450 },
        { filter: 'vipTier', count: 380 },
        { filter: 'email', count: 320 },
        { filter: 'name', count: 280 },
      ],
      cacheHitRate: 0.65,
      averageSearchTime: 125,
    };
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('🧹 Search cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.searchCache.size;
  }

  // Private helper methods

  private generateCacheKey(options: CustomerSearchOptions): string {
    return `${options.query}_${JSON.stringify(options.filters)}_${options.sortBy}_${options.sortOrder}_${options.page}_${options.limit}`;
  }

  private getCachedResults(cacheKey: string): any | null {
    const cached = this.searchCache.get(cacheKey);
    if (!cached) return null;

    // Check if cache is expired
    const now = Date.now();
    const cacheAge = now - cached.timestamp.getTime();

    if (cacheAge > this.cacheExpiryMs) {
      this.searchCache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  private cacheResults(cacheKey: string, results: any): void {
    this.searchCache.set(cacheKey, {
      ...results,
      timestamp: new Date(),
    });

    // Clean up old cache entries if too many
    if (this.searchCache.size > 100) {
      this.cleanupOldCache();
    }
  }

  private cleanupOldCache(): void {
    const now = Date.now();
    const entries = Array.from(this.searchCache.entries());

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());

    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.searchCache.delete(entries[i][0]);
    }
  }

  private applySorting(
    customers: CustomerProfile[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): CustomerProfile[] {
    return customers.sort((a, b) => {
      let aValue: any = a[sortBy as keyof CustomerProfile];
      let bValue: any = b[sortBy as keyof CustomerProfile];

      // Handle nested properties
      if (sortBy.includes('.')) {
        const [parent, child] = sortBy.split('.');
        aValue = a[parent as keyof CustomerProfile]?.[child];
        bValue = b[parent as keyof CustomerProfile]?.[child];
      }

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      // Handle dates
      if (aValue instanceof Date && bValue instanceof Date) {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private applyPagination(
    customers: CustomerProfile[],
    page: number,
    limit: number
  ): {
    results: CustomerProfile[];
    pagination: CustomerPaginationOptions;
  } {
    const totalItems = customers.length;
    const totalPages = Math.ceil(totalItems / limit);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;

    const results = customers.slice(startIndex, endIndex);

    const pagination: CustomerPaginationOptions = {
      currentPage,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
    };

    return { results, pagination };
  }
}
