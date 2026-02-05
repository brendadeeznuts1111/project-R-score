/**
 * MetricsPanel - Component for displaying KYC metrics and charts
 */

import type { KYCMetrics, ReviewQueueItem } from "../types";

interface MetricsPanelProps {
  metrics: KYCMetrics | null;
  filteredQueue: ReviewQueueItem[];
  showCharts: boolean;
  onToggleCharts: () => void;
  riskScoreChartRef: React.RefObject<HTMLCanvasElement>;
  priorityChartRef: React.RefObject<HTMLCanvasElement>;
  statusChartRef: React.RefObject<HTMLCanvasElement>;
}

function getRiskColor(riskScore: number): string {
  if (riskScore >= 80) return "text-red-600 font-bold";
  if (riskScore >= 50) return "text-yellow-600";
  return "text-green-600";
}

export function MetricsPanel({
  metrics,
  filteredQueue,
  showCharts,
  onToggleCharts,
  riskScoreChartRef,
  priorityChartRef,
  statusChartRef,
}: MetricsPanelProps) {
  if (!metrics) return null;

  return (
    <>
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold">{metrics.pending}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Approved</div>
          <div className="text-2xl font-bold text-green-600">{metrics.approved}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{metrics.rejected}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">High Priority</div>
          <div className="text-2xl font-bold text-red-600">{metrics.highPriority}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-600">Avg Risk Score</div>
          <div className={`text-2xl font-bold ${getRiskColor(metrics.avgRiskScore)}`}>
            {metrics.avgRiskScore.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {showCharts && filteredQueue.length > 0 && (
        <div className="bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Visualizations</h3>
            <button
              onClick={onToggleCharts}
              className="text-gray-500 hover:text-gray-700"
            >
              Hide Charts
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <canvas ref={riskScoreChartRef} style={{ height: '250px' }}></canvas>
            </div>
            <div>
              <canvas ref={priorityChartRef} style={{ height: '250px' }}></canvas>
            </div>
            <div>
              <canvas ref={statusChartRef} style={{ height: '250px' }}></canvas>
            </div>
          </div>
        </div>
      )}

      {!showCharts && (
        <div className="bg-white p-4 rounded shadow text-center">
          <button
            onClick={onToggleCharts}
            className="text-blue-600 hover:text-blue-800"
          >
            Show Charts
          </button>
        </div>
      )}
    </>
  );
}
