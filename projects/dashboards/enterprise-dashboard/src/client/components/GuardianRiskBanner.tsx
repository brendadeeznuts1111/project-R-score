import { useState, useCallback } from "react";

export interface RiskAssessment {
  riskScore: number; // 0-1
  topFeatures: string[];
  daysUntilAction: number;
  projectId?: string;
  projectName?: string;
  lastUpdated: Date;
}

interface GuardianRiskBannerProps {
  risk: RiskAssessment;
  onNominateBackupSponsor: (projectId?: string) => void;
  onViewDetails?: (projectId?: string) => void;
  onDismiss?: () => void;
}

const alertIcons = {
  critical: (
    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function GuardianRiskBanner({
  risk,
  onNominateBackupSponsor,
  onViewDetails,
  onDismiss,
}: GuardianRiskBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  const isCritical = risk.riskScore > 0.9;
  const variant = isCritical ? "critical" : "warning";
  const daysUntilAction = isCritical ? 3 : risk.daysUntilAction;
  const canDismiss = risk.riskScore < 0.7 && onDismiss;

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleNominate = useCallback(() => {
    onNominateBackupSponsor(risk.projectId);
  }, [onNominateBackupSponsor, risk.projectId]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(risk.projectId);
  }, [onViewDetails, risk.projectId]);

  if (isDismissed) return null;

  const bgColor = isCritical
    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
    : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";

  const textColor = isCritical
    ? "text-red-800 dark:text-red-200"
    : "text-yellow-800 dark:text-yellow-200";

  const mutedColor = isCritical
    ? "text-red-600 dark:text-red-300"
    : "text-yellow-600 dark:text-yellow-300";

  return (
    <div
      className={`guardian-risk-banner rounded-lg border p-4 ${bgColor} animate-slide-in`}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-0.5">
          {alertIcons[variant]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-base font-semibold ${textColor}`}>
              Suspension Risk Detected
            </h3>
            {isCritical && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 text-xs font-medium uppercase">
                Critical
              </span>
            )}
          </div>

          <div className={`space-y-1 ${mutedColor}`}>
            <p className="text-sm">
              Predicted risk:{" "}
              <span className="font-semibold">
                {(risk.riskScore * 100).toFixed(1)}%
              </span>{" "}
              in next{" "}
              <span className="font-semibold">{daysUntilAction} days</span>
            </p>

            {risk.topFeatures.length > 0 && (
              <p className="text-sm">
                Top drivers:{" "}
                <span className="font-medium">
                  {risk.topFeatures.slice(0, 3).join(", ")}
                </span>
              </p>
            )}

            <p className="text-xs opacity-80 mt-2">
              Team seats buffered &bull; Payments paused if unresolved
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleNominate}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isCritical
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-yellow-600 hover:bg-yellow-700 text-white"
              }`}
            >
              Add Backup Sponsor
            </button>

            {onViewDetails && (
              <button
                onClick={handleViewDetails}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isCritical
                    ? "bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-200"
                    : "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-800 dark:hover:bg-yellow-700 text-yellow-700 dark:text-yellow-200"
                }`}
              >
                View Details
              </button>
            )}
          </div>
        </div>

        {canDismiss && (
          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${mutedColor}`}
            aria-label="Dismiss alert"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
