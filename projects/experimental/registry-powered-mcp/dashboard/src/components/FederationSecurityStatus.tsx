/**
 * Federation LSP Security Status Component
 * Displays real-time security compliance status with LSP diagnostics
 */

import React from 'react';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { useFederationLSPSecurity } from '../hooks/useFederationLSPSecurity';

interface FederationSecurityStatusProps {
  systemName: string;
  showDetails?: boolean;
}

export const FederationSecurityStatus: React.FC<FederationSecurityStatusProps> = ({
  systemName,
  showDetails = false
}) => {
  const { getSystemSecurityStatus } = useFederationLSPSecurity();
  const securityStatus = getSystemSecurityStatus(systemName);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 size={12} className="text-emerald-500" />;
      case 'non-compliant':
        return <XCircle size={12} className="text-rose-500" />;
      default:
        return <Info size={12} className="text-slate-400" />;
    }
  };

  const getOverallStatusIcon = () => {
    switch (securityStatus.overall) {
      case 'secure':
        return <Shield size={14} className="text-emerald-500" />;
      case 'warning':
        return <AlertTriangle size={14} className="text-amber-500" />;
      case 'critical':
        return <XCircle size={14} className="text-rose-500" />;
      default:
        return <Info size={14} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'non-compliant':
        return 'text-rose-600 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Overall Status */}
      <div className="flex items-center gap-1">
        {getOverallStatusIcon()}
        <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border ${
          securityStatus.overall === 'secure' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
          securityStatus.overall === 'warning' ? 'text-amber-600 bg-amber-50 border-amber-200' :
          'text-rose-600 bg-rose-50 border-rose-200'
        }`}>
          {securityStatus.overall}
        </span>
      </div>

      {/* Compliance Indicators */}
      {!showDetails && (
        <div className="flex gap-0.5">
          {Object.entries(securityStatus.compliance).map(([framework, status]) => (
            <div key={framework} className="flex items-center">
              {getStatusIcon(status)}
            </div>
          ))}
        </div>
      )}

      {/* Detailed View */}
      {showDetails && (
        <div className="space-y-1">
          {Object.entries(securityStatus.compliance).map(([framework, status]) => (
            <div key={framework} className={`flex items-center justify-between px-2 py-1 rounded text-[8px] font-bold border ${getStatusColor(status)}`}>
              <span className="uppercase tracking-tighter">{framework}</span>
              {getStatusIcon(status)}
            </div>
          ))}

          {/* LSP Diagnostics */}
          {securityStatus.violations.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-[8px] font-black text-rose-600 uppercase tracking-tighter">
                LSP Diagnostics ({securityStatus.violations.length})
              </div>
              {securityStatus.violations.slice(0, 2).map((diagnostic, idx) => (
                <div key={idx} className={`px-2 py-1 rounded text-[7px] border ${
                  diagnostic.severity === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                  diagnostic.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                  <div className="font-mono font-bold">{diagnostic.code}</div>
                  <div className="truncate">{diagnostic.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};