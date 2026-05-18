/**
 * DetailView - Modal component for displaying detailed KYC review item information
 */

import type { DetailedReviewItem } from "../types";

interface DetailViewProps {
  selectedItem: string | null;
  detailedItem: DetailedReviewItem | null;
  loadingDetails: boolean;
  onClose: () => void;
  onApprove: (traceId: string) => void;
  onReject: (traceId: string) => void;
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "high":
      return "text-red-600 bg-red-50";
    case "medium":
      return "text-yellow-600 bg-yellow-50";
    default:
      return "text-blue-600 bg-blue-50";
  }
}

function getRiskColor(riskScore: number): string {
  if (riskScore >= 80) return "text-red-600 font-bold";
  if (riskScore >= 50) return "text-yellow-600";
  return "text-green-600";
}

export function DetailView({
  selectedItem,
  detailedItem,
  loadingDetails,
  onClose,
  onApprove,
  onReject,
}: DetailViewProps) {
  if (!selectedItem) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Review Item Details</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {loadingDetails ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Loading details...</p>
          </div>
        ) : detailedItem ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Trace ID</label>
                <p className="text-lg font-mono">{detailedItem.trace_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">User ID</label>
                <p className="text-lg">{detailedItem.user_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className={`text-lg font-semibold ${
                  detailedItem.status === "approved" ? "text-green-600" :
                  detailedItem.status === "rejected" ? "text-red-600" :
                  "text-yellow-600"
                }`}>
                  {detailedItem.status.toUpperCase()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Priority</label>
                <p className={`text-lg ${getPriorityColor(detailedItem.priority)}`}>
                  {detailedItem.priority.toUpperCase()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Risk Score</label>
                <p className={`text-2xl font-bold ${getRiskColor(detailedItem.risk_score)}`}>
                  {detailedItem.risk_score}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Created At</label>
                <p className="text-lg">{new Date(detailedItem.created_at * 1000).toLocaleString()}</p>
              </div>
              {detailedItem.reviewed_at && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Reviewed At</label>
                    <p className="text-lg">{new Date(detailedItem.reviewed_at * 1000).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Reviewer ID</label>
                    <p className="text-lg">{detailedItem.reviewer_id || "N/A"}</p>
                  </div>
                </>
              )}
            </div>

            {/* Device Signatures */}
            <div>
              <h4 className="text-lg font-semibold mb-2">Device Signatures</h4>
              <div className="bg-gray-50 rounded p-4">
                {detailedItem.device_signatures ? (
                  <div className="space-y-2">
                    {JSON.parse(detailedItem.device_signatures).map((sig: string, idx: number) => (
                      <div key={idx} className="font-mono text-sm bg-white p-2 rounded">
                        {sig}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No device signatures</p>
                )}
              </div>
            </div>

            {/* Device Verification */}
            {detailedItem.deviceVerification && (
              <div>
                <h4 className="text-lg font-semibold mb-2">Device Verification</h4>
                <div className="bg-gray-50 rounded p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Is Genuine</label>
                      <p className={`font-semibold ${detailedItem.deviceVerification.is_genuine ? "text-green-600" : "text-red-600"}`}>
                        {detailedItem.deviceVerification.is_genuine ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Risk Score</label>
                      <p className={`font-semibold ${getRiskColor(detailedItem.deviceVerification.risk_score)}`}>
                        {detailedItem.deviceVerification.risk_score}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Verified At</label>
                      <p>{detailedItem.deviceVerification.verified_at.toLocaleString()}</p>
                    </div>
                  </div>
                  {detailedItem.deviceVerification.signatures.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Signatures</label>
                      <div className="mt-1 space-y-1">
                        {detailedItem.deviceVerification.signatures.map((sig, idx) => (
                          <div key={idx} className="font-mono text-xs bg-white p-1 rounded">{sig}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Biometric Verification */}
            {detailedItem.biometric && (
              <div>
                <h4 className="text-lg font-semibold mb-2">Biometric Verification</h4>
                <div className="bg-gray-50 rounded p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Passed</label>
                      <p className={`font-semibold ${detailedItem.biometric.passed ? "text-green-600" : "text-red-600"}`}>
                        {detailedItem.biometric.passed ? "Yes" : "No"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Liveness Score</label>
                      <p className="font-semibold">{detailedItem.biometric.liveness_score}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Attempted At</label>
                      <p>{detailedItem.biometric.attempted_at.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            {detailedItem.documents && detailedItem.documents.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-2">Documents ({detailedItem.documents.length})</h4>
                <div className="space-y-2">
                  {detailedItem.documents.map((doc, idx) => (
                    <div key={idx} className="bg-gray-50 rounded p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Type</label>
                          <p>{doc.document_type}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">S3 Key</label>
                          <p className="font-mono text-xs break-all">{doc.s3_key}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Uploaded At</label>
                          <p>{doc.uploaded_at.toLocaleString()}</p>
                        </div>
                        {Object.keys(doc.extractedData).length > 0 && (
                          <div>
                            <label className="text-sm font-medium text-gray-500">Extracted Data</label>
                            <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(doc.extractedData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit Log */}
            {detailedItem.auditLog && detailedItem.auditLog.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-2">Audit Log ({detailedItem.auditLog.length} entries)</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {detailedItem.auditLog.map((log, idx) => (
                    <div key={idx} className="bg-gray-50 rounded p-4 border-l-4 border-blue-500">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold">{log.action}</span>
                          {log.risk_score !== null && (
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${getRiskColor(log.risk_score)}`}>
                              Risk: {log.risk_score}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">{log.timestamp.toLocaleString()}</span>
                      </div>
                      {Object.keys(log.details).length > 0 && (
                        <pre className="text-xs bg-white p-2 rounded overflow-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {detailedItem.status === "pending" && (
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    onApprove(detailedItem.trace_id);
                    onClose();
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    onReject(detailedItem.trace_id);
                    onClose();
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Failed to load details</p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
