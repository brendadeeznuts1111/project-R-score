/**
 * KYC Review Tab Component
 * Admin dashboard for reviewing KYC failsafe queue items
 * Enhanced with search, filtering, bulk actions, and detailed views
 * 
 * Refactored to use extracted hooks and components for better maintainability
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { ErrorBoundary, ErrorMessage, LoadingSkeleton, TableSkeleton, EmptyState } from "../components/ErrorBoundary";
import { useQueueData, useFilters, useMetrics, useNotifications, useCharts } from "./kyc/hooks";
import { BulkActions, FilterPanel, MetricsPanel, QueueTable, DetailView, ExportModal } from "./kyc/components";
import type { ReviewQueueItem, DetailedReviewItem } from "./kyc/types";

export function KYCReviewTab() {
  // Filters
  const { filters, setFilters, buildQueryParams, clearFilters, hasActiveFilters } = useFilters();
  
  // Queue data
  const { queue, allQueue, loading, error, fetchQueue } = useQueueData({ buildQueryParams, filters });
  
  // Metrics
  const { metrics, fetchMetrics } = useMetrics();
  
  // Notifications
  const {
    soundEnabled,
    setSoundEnabled,
    desktopNotificationsEnabled,
    setDesktopNotificationsEnabled,
    notificationPermission,
    newItemsCount,
    showNewItemsBadge,
  } = useNotifications(queue, loading);
  
  // Charts - use filteredQueue for accurate chart data
  const { riskScoreChartRef, priorityChartRef, statusChartRef } = useCharts({
    filteredQueue,
    showCharts,
  });
  
  // UI state
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [detailedItem, setDetailedItem] = useState<DetailedReviewItem | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);

  // Client-side filtering for search
  const filteredQueue = useMemo(() => {
    let result = [...queue];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(item => 
        item.userId.toLowerCase().includes(searchLower) ||
        item.traceId.toLowerCase().includes(searchLower) ||
        (item.reviewerId && item.reviewerId.toLowerCase().includes(searchLower)) ||
        item.deviceSignatures.some(sig => sig.toLowerCase().includes(searchLower))
      );
    }
    
    if (filters.status && filters.status.length > 0) {
      result = result.filter(item => filters.status!.includes(item.status));
    }
    
    if (filters.priority && filters.priority.length > 0) {
      result = result.filter(item => filters.priority!.includes(item.priority));
    }
    
    if (filters.riskScoreMin !== null) {
      result = result.filter(item => item.riskScore >= filters.riskScoreMin!);
    }
    
    if (filters.riskScoreMax !== null) {
      result = result.filter(item => item.riskScore <= filters.riskScoreMax!);
    }
    
    return result;
  }, [queue, filters]);

  // Charts - use filteredQueue for accurate chart data
  const { riskScoreChartRef, priorityChartRef, statusChartRef } = useCharts({
    filteredQueue,
    showCharts,
  });

  // Fetch data on mount and periodically
  useEffect(() => {
    fetchQueue();
    fetchMetrics();
    const interval = setInterval(() => {
      fetchQueue();
      fetchMetrics();
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchQueue, fetchMetrics]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/dashboard`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "kyc_review_queued") {
          fetchQueue();
          fetchMetrics();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };
    return () => ws.close();
  }, [fetchQueue, fetchMetrics]);

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleKYCValidate = () => {
      console.log("KYC validation requested via shortcut");
    };

    const handleKYCReview = () => {
      console.log("KYC review queue requested via shortcut");
      setFilters(prev => ({ ...prev, status: ["pending"] }));
      fetchQueue();
    };

    const handleKYCFailsafe = () => {
      console.log("KYC failsafe requested via shortcut");
    };

    window.addEventListener("kyc:validate:requested", handleKYCValidate);
    window.addEventListener("kyc:review:requested", handleKYCReview);
    window.addEventListener("kyc:failsafe:requested", handleKYCFailsafe);

    return () => {
      window.removeEventListener("kyc:validate:requested", handleKYCValidate);
      window.removeEventListener("kyc:review:requested", handleKYCReview);
      window.removeEventListener("kyc:failsafe:requested", handleKYCFailsafe);
    };
  }, [fetchQueue, setFilters]);

  // Action handlers
  const handleApprove = useCallback(async (traceId: string, retryCount = 0) => {
    try {
      const response = await fetch(`/api/kyc/review-queue/${traceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          reviewerId: "admin", // In production, get from auth context
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to approve: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success !== false) {
        fetchQueue();
        fetchMetrics();
        setSelectedItems(prev => {
          const next = new Set(prev);
          next.delete(traceId);
          return next;
        });
      } else {
        throw new Error(data.message || "Approval failed");
      }
    } catch (error) {
      console.error("Failed to approve:", error);

      // Auto-retry for network errors (up to 2 times)
      if (retryCount < 2 && (error instanceof TypeError || error instanceof Error && error.message.includes('fetch'))) {
        setTimeout(() => handleApprove(traceId, retryCount + 1), 1000 * (retryCount + 1));
      }
    }
  }, [fetchQueue, fetchMetrics]);

  const handleReject = useCallback(async (traceId: string, retryCount = 0) => {
    try {
      const response = await fetch(`/api/kyc/review-queue/${traceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          reviewerId: "admin", // In production, get from auth context
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to reject: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success !== false) {
        fetchQueue();
        fetchMetrics();
        setSelectedItems(prev => {
          const next = new Set(prev);
          next.delete(traceId);
          return next;
        });
      } else {
        throw new Error(data.message || "Rejection failed");
      }
    } catch (error) {
      console.error("Failed to reject:", error);

      // Auto-retry for network errors (up to 2 times)
      if (retryCount < 2 && (error instanceof TypeError || error instanceof Error && error.message.includes('fetch'))) {
        setTimeout(() => handleReject(traceId, retryCount + 1), 1000 * (retryCount + 1));
      }
    }
  }, [fetchQueue, fetchMetrics]);

  const handleBulkApprove = useCallback(async () => {
    if (!confirm(`Approve ${selectedItems.size} item(s)?`)) return;
    
    const promises = Array.from(selectedItems).map(traceId => handleApprove(traceId));
    await Promise.all(promises);
    setSelectedItems(new Set());
  }, [selectedItems, handleApprove]);

  const handleBulkReject = useCallback(async () => {
    if (!confirm(`Reject ${selectedItems.size} item(s)?`)) return;
    
    const promises = Array.from(selectedItems).map(traceId => handleReject(traceId));
    await Promise.all(promises);
    setSelectedItems(new Set());
  }, [selectedItems, handleReject]);

  const toggleSelectItem = useCallback((traceId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(traceId)) {
        next.delete(traceId);
      } else {
        next.add(traceId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredQueue.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredQueue.map(item => item.traceId)));
    }
  }, [selectedItems.size, filteredQueue]);

  const fetchDetailedItem = useCallback(async (traceId: string) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(`/api/kyc/review-queue/${traceId}`);
      const data = await response.json();
      if (data.data) {
        setDetailedItem(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch detailed item:", error);
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  const handleViewDetails = useCallback((traceId: string) => {
    setSelectedItem(traceId);
    fetchDetailedItem(traceId);
  }, [fetchDetailedItem]);

  return (
    <ErrorBoundary
      title="KYC Dashboard Error"
      description="The KYC review dashboard encountered an unexpected error."
      showRetry={true}
      showReport={true}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-theme">KYC Review Queue</h2>
            {showNewItemsBadge && newItemsCount > 0 && (
              <span 
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-500 text-white animate-pulse"
                title={`${newItemsCount} new item${newItemsCount > 1 ? 's' : ''} added`}
              >
                <span className="mr-2">🔔</span>
                {newItemsCount} new item{newItemsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {/* Notification Settings */}
            <div className="flex gap-2 items-center bg-gray-100 rounded px-3 py-1">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`text-sm px-2 py-1 rounded transition-colors ${
                  soundEnabled ? "bg-green-500 text-white" : "bg-gray-200 text-gray-600"
                }`}
                title={soundEnabled ? "Sound notifications ON" : "Sound notifications OFF"}
              >
                {soundEnabled ? "🔔" : "🔕"}
              </button>
              <button
                onClick={async () => {
                  if ('Notification' in window) {
                    if (Notification.permission === 'default') {
                      const permission = await Notification.requestPermission();
                      if (permission === 'granted') {
                        setDesktopNotificationsEnabled(true);
                      }
                    } else if (Notification.permission === 'granted') {
                      setDesktopNotificationsEnabled(!desktopNotificationsEnabled);
                    }
                  }
                }}
                className={`text-sm px-2 py-1 rounded transition-colors ${
                  desktopNotificationsEnabled && notificationPermission === 'granted'
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
                title={
                  notificationPermission === 'denied'
                    ? "Desktop notifications blocked"
                    : desktopNotificationsEnabled
                    ? "Desktop notifications ON"
                    : "Desktop notifications OFF"
                }
                disabled={notificationPermission === 'denied'}
              >
                {desktopNotificationsEnabled && notificationPermission === 'granted' ? "📱" : "📵"}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded transition-colors relative ${
                  showFilters || hasActiveFilters
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
                title="Toggle filters (Ctrl/Cmd+F)"
              >
                🔍 Filters {hasActiveFilters && `(${Object.values(filters).filter(v => v).length})`}
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
                title="Export data (Ctrl/Cmd+E)"
              >
                📥 Export
              </button>
              <button
                onClick={() => fetchQueue()}
                className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
                title="Refresh (Ctrl/Cmd+R)"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded shadow">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Search by User ID, Trace ID, Reviewer ID, or Device Signature..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Search (Ctrl/Cmd+F)"
            />
            {filters.search && (
              <button
                onClick={() => setFilters(prev => ({ ...prev, search: "" }))}
                className="px-3 py-2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            onClearFilters={clearFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Bulk Actions Bar */}
        <BulkActions
          selectedCount={selectedItems.size}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onCancel={() => setSelectedItems(new Set())}
        />

        {/* Metrics and Charts */}
        <MetricsPanel
          metrics={metrics}
          filteredQueue={filteredQueue}
          showCharts={showCharts}
          onToggleCharts={() => setShowCharts(!showCharts)}
          riskScoreChartRef={riskScoreChartRef}
          priorityChartRef={priorityChartRef}
          statusChartRef={statusChartRef}
        />

        {/* Error/Loading/Empty States */}
        {error ? (
          <ErrorMessage
            message={error}
            onRetry={() => fetchQueue()}
            showRetry={true}
            className="my-8"
          />
        ) : loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white p-4 rounded shadow animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
            <TableSkeleton rows={8} cols={6} />
          </div>
        ) : filteredQueue.length === 0 ? (
          <EmptyState
            icon={hasActiveFilters ? "🔍" : "📋"}
            title={hasActiveFilters ? "No matching items" : "Queue is empty"}
            description={hasActiveFilters ? "Try adjusting your filters to see more results." : "New KYC review items will appear here automatically."}
            action={hasActiveFilters ? clearFilters : undefined}
            actionLabel={hasActiveFilters ? "Clear Filters" : undefined}
          />
        ) : (
          <QueueTable
            filteredQueue={filteredQueue}
            allQueue={allQueue}
            selectedItems={selectedItems}
            onToggleSelectItem={toggleSelectItem}
            onToggleSelectAll={toggleSelectAll}
            onViewDetails={handleViewDetails}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* Detailed Item Modal */}
        <DetailView
          selectedItem={selectedItem}
          detailedItem={detailedItem}
          loadingDetails={loadingDetails}
          onClose={() => {
            setSelectedItem(null);
            setDetailedItem(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          filteredQueue={filteredQueue}
          filters={filters}
          onClose={() => setShowExportModal(false)}
        />
      </div>
    </ErrorBoundary>
  );
}
