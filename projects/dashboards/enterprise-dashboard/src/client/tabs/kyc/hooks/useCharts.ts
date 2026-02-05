/**
 * useCharts - Hook for managing Chart.js charts
 */

import { useEffect, useRef } from "react";
import type { ReviewQueueItem } from "../types";

interface UseChartsOptions {
  filteredQueue: ReviewQueueItem[];
  showCharts: boolean;
}

interface UseChartsReturn {
  riskScoreChartRef: React.RefObject<HTMLCanvasElement>;
  priorityChartRef: React.RefObject<HTMLCanvasElement>;
  statusChartRef: React.RefObject<HTMLCanvasElement>;
}

export function useCharts({ filteredQueue, showCharts }: UseChartsOptions): UseChartsReturn {
  const riskScoreChartRef = useRef<HTMLCanvasElement>(null);
  const priorityChartRef = useRef<HTMLCanvasElement>(null);
  const statusChartRef = useRef<HTMLCanvasElement>(null);

  // Initialize charts when data is available
  useEffect(() => {
    if (!showCharts || filteredQueue.length === 0) return;

    // Load Chart.js dynamically
    const loadChartJS = async () => {
      if (typeof window !== 'undefined' && !(window as any).Chart) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
    };

    const renderCharts = async () => {
      await loadChartJS();
      const Chart = (window as any).Chart;
      if (!Chart) return;

      // Risk Score Distribution Histogram
      if (riskScoreChartRef.current) {
        const ctx = riskScoreChartRef.current.getContext('2d');
        if (ctx) {
          // Destroy existing chart if it exists
          const existingChart = (riskScoreChartRef.current as any).chart;
          if (existingChart) {
            existingChart.destroy();
          }

          const riskScores = filteredQueue.map(item => item.riskScore);
          const bins = [0, 20, 40, 60, 80, 100];
          const counts = bins.slice(0, -1).map((_, i) => 
            riskScores.filter(score => score >= bins[i] && score < bins[i + 1]).length
          );

          const chart = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: ['0-20', '20-40', '40-60', '60-80', '80-100'],
              datasets: [{
                label: 'Risk Score Distribution',
                data: counts,
                backgroundColor: [
                  'rgba(34, 197, 94, 0.6)',
                  'rgba(234, 179, 8, 0.6)',
                  'rgba(251, 146, 60, 0.6)',
                  'rgba(239, 68, 68, 0.6)',
                  'rgba(185, 28, 28, 0.6)',
                ],
                borderColor: [
                  'rgb(34, 197, 94)',
                  'rgb(234, 179, 8)',
                  'rgb(251, 146, 60)',
                  'rgb(239, 68, 68)',
                  'rgb(185, 28, 28)',
                ],
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                title: { display: true, text: 'Risk Score Distribution' }
              },
              scales: {
                y: { beginAtZero: true }
              }
            }
          });
          (riskScoreChartRef.current as any).chart = chart;
        }
      }

      // Priority Breakdown Pie Chart
      if (priorityChartRef.current) {
        const ctx = priorityChartRef.current.getContext('2d');
        if (ctx) {
          const existingChart = (priorityChartRef.current as any).chart;
          if (existingChart) {
            existingChart.destroy();
          }

          const priorityCounts = {
            high: filteredQueue.filter(item => item.priority === 'high').length,
            medium: filteredQueue.filter(item => item.priority === 'medium').length,
            low: filteredQueue.filter(item => item.priority === 'low').length,
          };

          const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['High', 'Medium', 'Low'],
              datasets: [{
                data: [priorityCounts.high, priorityCounts.medium, priorityCounts.low],
                backgroundColor: [
                  'rgba(239, 68, 68, 0.6)',
                  'rgba(234, 179, 8, 0.6)',
                  'rgba(59, 130, 246, 0.6)',
                ],
                borderColor: [
                  'rgb(239, 68, 68)',
                  'rgb(234, 179, 8)',
                  'rgb(59, 130, 246)',
                ],
                borderWidth: 2
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Priority Breakdown' }
              }
            }
          });
          (priorityChartRef.current as any).chart = chart;
        }
      }

      // Status Breakdown Pie Chart
      if (statusChartRef.current) {
        const ctx = statusChartRef.current.getContext('2d');
        if (ctx) {
          const existingChart = (statusChartRef.current as any).chart;
          if (existingChart) {
            existingChart.destroy();
          }

          const statusCounts = {
            pending: filteredQueue.filter(item => item.status === 'pending').length,
            approved: filteredQueue.filter(item => item.status === 'approved').length,
            rejected: filteredQueue.filter(item => item.status === 'rejected').length,
          };

          const chart = new Chart(ctx, {
            type: 'pie',
            data: {
              labels: ['Pending', 'Approved', 'Rejected'],
              datasets: [{
                data: [statusCounts.pending, statusCounts.approved, statusCounts.rejected],
                backgroundColor: [
                  'rgba(234, 179, 8, 0.6)',
                  'rgba(34, 197, 94, 0.6)',
                  'rgba(239, 68, 68, 0.6)',
                ],
                borderColor: [
                  'rgb(234, 179, 8)',
                  'rgb(34, 197, 94)',
                  'rgb(239, 68, 68)',
                ],
                borderWidth: 2
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Status Breakdown' }
              }
            }
          });
          (statusChartRef.current as any).chart = chart;
        }
      }
    };

    renderCharts();

    // Cleanup function to destroy charts on unmount
    return () => {
      [riskScoreChartRef, priorityChartRef, statusChartRef].forEach(ref => {
        if (ref.current && (ref.current as any).chart) {
          (ref.current as any).chart.destroy();
        }
      });
    };
  }, [filteredQueue, showCharts]);

  return {
    riskScoreChartRef,
    priorityChartRef,
    statusChartRef,
  };
}
