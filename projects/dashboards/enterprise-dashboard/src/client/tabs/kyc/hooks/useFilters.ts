/**
 * useFilters - Hook for managing KYC review queue filters
 */

import { useState, useCallback, useEffect } from "react";
import type { FilterState } from "../types";

interface UseFiltersReturn {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  buildQueryParams: (filterState: FilterState) => URLSearchParams;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useFilters(): UseFiltersReturn {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: null,
    priority: null,
    riskScoreMin: null,
    riskScoreMax: null,
    dateFrom: null,
    dateTo: null,
    reviewerId: null,
  });

  // Build query parameters from filters
  const buildQueryParams = useCallback((filterState: FilterState): URLSearchParams => {
    const params = new URLSearchParams();
    
    if (filterState.status && filterState.status.length > 0) {
      params.append("status", filterState.status[0]); // API supports single status for now
    }
    
    if (filterState.search) {
      // Search in userId or traceId
      if (filterState.search.includes("-")) {
        params.append("traceId", filterState.search);
      } else {
        params.append("userId", filterState.search);
      }
    }
    
    if (filterState.priority && filterState.priority.length > 0) {
      params.append("priority", filterState.priority[0]);
    }
    
    if (filterState.riskScoreMin !== null) {
      params.append("riskScoreMin", filterState.riskScoreMin.toString());
    }
    
    if (filterState.riskScoreMax !== null) {
      params.append("riskScoreMax", filterState.riskScoreMax.toString());
    }
    
    if (filterState.dateFrom) {
      params.append("createdAtFrom", Math.floor(new Date(filterState.dateFrom).getTime() / 1000).toString());
    }
    
    if (filterState.dateTo) {
      params.append("createdAtTo", Math.floor(new Date(filterState.dateTo).getTime() / 1000).toString());
    }
    
    if (filterState.reviewerId) {
      params.append("reviewerId", filterState.reviewerId);
    }
    
    return params;
  }, []);

  // Persist filters to URL
  useEffect(() => {
    const params = buildQueryParams(filters);
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [filters, buildQueryParams]);

  // Load filters from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlFilters: FilterState = {
      search: urlParams.get("search") || "",
      status: urlParams.get("status") ? [urlParams.get("status") as "pending" | "approved" | "rejected"] : null,
      priority: urlParams.get("priority") ? [urlParams.get("priority") as "low" | "medium" | "high"] : null,
      riskScoreMin: urlParams.has("riskScoreMin") ? parseInt(urlParams.get("riskScoreMin")!) : null,
      riskScoreMax: urlParams.has("riskScoreMax") ? parseInt(urlParams.get("riskScoreMax")!) : null,
      dateFrom: urlParams.get("dateFrom") || null,
      dateTo: urlParams.get("dateTo") || null,
      reviewerId: urlParams.get("reviewerId") || null,
    };
    setFilters(urlFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      status: null,
      priority: null,
      riskScoreMin: null,
      riskScoreMax: null,
      dateFrom: null,
      dateTo: null,
      reviewerId: null,
    });
  }, []);

  const hasActiveFilters = filters.search || 
    (filters.status && filters.status.length > 0) ||
    (filters.priority && filters.priority.length > 0) ||
    filters.riskScoreMin !== null ||
    filters.riskScoreMax !== null ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.reviewerId;

  return {
    filters,
    setFilters,
    buildQueryParams,
    clearFilters,
    hasActiveFilters,
  };
}
