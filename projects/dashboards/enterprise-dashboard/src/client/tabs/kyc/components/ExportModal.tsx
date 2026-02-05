/**
 * ExportModal - Modal component for exporting KYC review queue data
 */

import type { ReviewQueueItem, FilterState } from "../types";

interface ExportModalProps {
  isOpen: boolean;
  filteredQueue: ReviewQueueItem[];
  filters: FilterState;
  onClose: () => void;
}

export function ExportModal({ isOpen, filteredQueue, filters, onClose }: ExportModalProps) {
  if (!isOpen) return null;

  const exportToCSV = () => {
    const headers = ['User ID', 'Trace ID', 'Risk Score', 'Priority', 'Status', 'Created At', 'Reviewed At', 'Reviewer ID'];
    const rows = filteredQueue.map(item => [
      item.userId,
      item.traceId,
      item.riskScore.toString(),
      item.priority,
      item.status,
      item.createdAt.toISOString(),
      item.reviewedAt?.toISOString() || '',
      item.reviewerId || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kyc-review-queue-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportToJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      totalItems: filteredQueue.length,
      filters: filters,
      items: filteredQueue.map(item => ({
        userId: item.userId,
        traceId: item.traceId,
        riskScore: item.riskScore,
        priority: item.priority,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        reviewedAt: item.reviewedAt?.toISOString(),
        reviewerId: item.reviewerId,
        deviceSignatures: item.deviceSignatures,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kyc-review-queue-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportToPDF = async () => {
    // Simple PDF generation using browser print API
    // For production, consider using jsPDF or similar library
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KYC Review Queue Export</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .header { margin-bottom: 20px; }
            .summary { margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>KYC Review Queue Export</h1>
            <p>Exported: ${new Date().toLocaleString()}</p>
            <p>Total Items: ${filteredQueue.length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Trace ID</th>
                <th>Risk Score</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Reviewed At</th>
                <th>Reviewer ID</th>
              </tr>
            </thead>
            <tbody>
              ${filteredQueue.map(item => `
                <tr>
                  <td>${item.userId}</td>
                  <td>${item.traceId}</td>
                  <td>${item.riskScore}</td>
                  <td>${item.priority}</td>
                  <td>${item.status}</td>
                  <td>${item.createdAt.toLocaleString()}</td>
                  <td>${item.reviewedAt?.toLocaleString() || 'N/A'}</td>
                  <td>${item.reviewerId || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      setTimeout(() => printWindow.close(), 100);
    };
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Export Data</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>
        <p className="text-gray-600 mb-4">
          Export {filteredQueue.length} item(s) in your preferred format.
        </p>
        <div className="space-y-2">
          <button
            onClick={exportToCSV}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-left"
          >
            📊 Export as CSV
          </button>
          <button
            onClick={exportToJSON}
            className="w-full px-4 py-3 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-left"
          >
            📄 Export as JSON
          </button>
          <button
            onClick={exportToPDF}
            className="w-full px-4 py-3 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-left"
          >
            📑 Export as PDF (Print)
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>Note: PDF export uses browser print functionality</p>
        </div>
      </div>
    </div>
  );
}
