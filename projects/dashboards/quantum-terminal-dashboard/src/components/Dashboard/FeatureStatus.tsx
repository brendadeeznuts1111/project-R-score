/**
 * FeatureStatus.tsx - Build Feature Status Display
 * Shows which compile-time features are enabled
 */

import React from 'react';

export interface FeatureStatusProps {
  hasTerminal: boolean;
  hasWebGL: boolean;
  hasPremium: boolean;
  terminalConnected?: boolean;
}

export const FeatureStatus: React.FC<FeatureStatusProps> = ({
  hasTerminal,
  hasWebGL,
  hasPremium,
  terminalConnected = false
}) => {
  const features = [
    { name: 'PTY', enabled: hasTerminal, connected: terminalConnected },
    { name: 'WebGL', enabled: hasWebGL },
    { name: 'Premium', enabled: hasPremium }
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {features.map(feat => (
        <div
          key={feat.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: feat.enabled ? '#00f0ff11' : '#ff003311',
            border: `1px solid ${feat.enabled ? '#00f0ff33' : '#ff003333'}`,
            fontSize: '11px',
            color: feat.enabled ? '#00f0ff' : '#ff0033'
          }}
          title={feat.enabled ? `${feat.name} enabled` : `${feat.name} disabled`}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: feat.enabled
                ? (feat.connected !== undefined ? (feat.connected ? '#00ff41' : '#ffaa00') : '#00ff41')
                : '#ff0033',
              boxShadow: feat.enabled ? '0 0 4px currentColor' : 'none'
            }}
          />
          <span>{feat.name}</span>
          {feat.enabled ? '\u2713' : '\u2717'}
        </div>
      ))}
    </div>
  );
};

export default FeatureStatus;
