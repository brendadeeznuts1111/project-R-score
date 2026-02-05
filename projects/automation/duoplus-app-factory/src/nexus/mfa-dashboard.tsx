// 🛡️ SOVEREIGN IDENTITY BLUEPRINT - MFA DASHBOARD
// Real-Time 2FA Code Display for Centralized Secret Silo
// Generated: January 22, 2026 | Nebula-Flow™ v3.5.0

import React, { useState, useEffect } from "react";
import { IdentitySilo } from "./identity-factory.ts";

interface MfaPanelProps {
  silo: IdentitySilo;
  autoRotate?: boolean; // Enable auto-rotation of codes
  showSecret?: boolean; // Toggle visibility of TOTP secret
}

/**
 * MFA Dashboard Component
 * Displays real-time 2FA codes for identity silos
 * Never need to check a real phone again
 */
export const MfaPanel: React.FC<MfaPanelProps> = ({
  silo,
  autoRotate = true,
  showSecret = false,
}) => {
  const [currentCode, setCurrentCode] = useState<string>("000000");
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // TOTP Configuration
  const TOTP_INTERVAL = 30; // 30 seconds per code
  const CODE_LENGTH = 6;

  /**
   * Generate TOTP Code
   * Simulates TOTP generation using silo's secret
   * In production, use a proper TOTP library like otplib
   */
  const generateTOTP = (secret: string, timestamp: number): string => {
    // Simulate TOTP algorithm (HMAC-SHA1 truncated to 6 digits)
    const timeStep = Math.floor(timestamp / 1000 / TOTP_INTERVAL);
    const timeBuffer = Buffer.from(timeStep.toString(), 'utf8');
    
    // Use Bun's crypto for HMAC simulation
    const hmac = Bun.hash(secret + timeBuffer.toString('hex'), 'sha1');
    const offset = hmac & 0xf;
    const code = ((hmac >> (offset * 4)) & 0x7fffffff) % 1000000;
    
    return code.toString().padStart(CODE_LENGTH, '0');
  };

  /**
   * Real-Time Code Rotation
   * Updates every 30 seconds
   */
  useEffect(() => {
    if (!autoRotate || isPaused) return;

    const updateCode = () => {
      const now = Date.now();
      const newCode = generateTOTP(silo.totpSecret, now);
      setCurrentCode(newCode);
      setTimeRemaining(TOTP_INTERVAL);
    };

    // Initial code generation
    updateCode();

    // Countdown timer
    const countdown = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          updateCode();
          return TOTP_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, [silo.totpSecret, autoRotate, isPaused]);

  /**
   * Manual Code Refresh
   * Force generate new code
   */
  const manualRefresh = () => {
    const now = Date.now();
    const newCode = generateTOTP(silo.totpSecret, now);
    setCurrentCode(newCode);
    setTimeRemaining(TOTP_INTERVAL);
  };

  /**
   * Copy Code to Clipboard
   * One-click 2FA entry
   */
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      // Visual feedback
      const original = currentCode;
      setCurrentCode("COPIED!");
      setTimeout(() => setCurrentCode(original), 1000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  /**
   * Export 2FA for DuoPlus RPA
   * Format for automated authentication
   */
  const exportForRPA = () => {
    return {
      secret: silo.totpSecret,
      currentCode,
      timeRemaining,
      label: `${silo.fullName} (${silo.id})`,
    };
  };

  return (
    <div className="mfa-panel">
      <style jsx>{`
        .mfa-panel {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 2px solid #00d4ff;
          border-radius: 12px;
          padding: 20px;
          color: white;
          font-family: 'Courier New', monospace;
          box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .identity {
          font-size: 14px;
          font-weight: 600;
          color: #00d4ff;
        }
        .status {
          font-size: 11px;
          color: #00ff88;
          padding: 4px 8px;
          background: rgba(0, 255, 136, 0.1);
          border-radius: 4px;
        }
        .code-display {
          background: #0f0f1e;
          border: 2px solid #00d4ff;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          margin: 12px 0;
          position: relative;
        }
        .code {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: 8px;
          color: #00d4ff;
          text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }
        .countdown {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 12px;
          color: #00ff88;
        }
        .secret {
          font-size: 11px;
          color: #888;
          margin-top: 8px;
          opacity: 0.7;
        }
        .controls {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }
        .btn {
          flex: 1;
          background: #00d4ff;
          color: #0f0f1e;
          border: none;
          padding: 10px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          transition: all 0.2s;
        }
        .btn:hover {
          background: #00ff88;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
        }
        .btn.secondary {
          background: rgba(0, 212, 255, 0.2);
          color: #00d4ff;
        }
        .btn.secondary:hover {
          background: rgba(0, 212, 255, 0.3);
        }
        .rpa-export {
          background: rgba(157, 78, 221, 0.1);
          border: 1px solid #9d4edd;
          border-radius: 6px;
          padding: 10px;
          margin-top: 12px;
          font-size: 11px;
          color: #9d4edd;
        }
        .security-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
          font-size: 10px;
        }
        .info-item {
          background: rgba(255, 255, 255, 0.05);
          padding: 6px;
          border-radius: 4px;
        }
        .info-label {
          color: #888;
          margin-bottom: 2px;
        }
        .info-value {
          color: #00d4ff;
          font-weight: 600;
        }
      `}</style>

      <div className="header">
        <div className="identity">
          {silo.fullName} ({silo.id})
        </div>
        <div className="status">2FA ACTIVE</div>
      </div>

      <div className="code-display">
        <div className="countdown">{timeRemaining}s</div>
        <div className="code" onClick={copyToClipboard} title="Click to copy">
          {currentCode}
        </div>
        {showSecret && (
          <div className="secret">Secret: {silo.totpSecret}</div>
        )}
      </div>

      <div className="controls">
        <button className="btn" onClick={manualRefresh}>
          🔄 Refresh
        </button>
        <button className="btn secondary" onClick={() => setIsPaused(!isPaused)}>
          {isPaused ? "▶️ Resume" : "⏸️ Pause"}
        </button>
        <button className="btn secondary" onClick={copyToClipboard}>
          📋 Copy
        </button>
      </div>

      <div className="rpa-export">
        <strong>RPA Export:</strong> {silo.totpSecret} | Code: {currentCode}
      </div>

      <div className="security-info">
        <div className="info-item">
          <div className="info-label">Passkey ID</div>
          <div className="info-value">{silo.passkeyId}</div>
        </div>
        <div className="info-item">
          <div className="info-label">Recovery Email</div>
          <div className="info-value">{silo.recoveryEmail}</div>
        </div>
        <div className="info-item">
          <div className="info-label">Recovery Hint</div>
          <div className="info-value">{silo.recoveryHint}</div>
        </div>
        <div className="info-item">
          <div className="info-label">Location</div>
          <div className="info-value">{silo.city}, {silo.state}</div>
        </div>
      </div>
    </div>
  );
};

/**
 * MFA Dashboard Feed
 * Shows multiple identity silos in a grid
 */
export const MfaDashboardFeed: React.FC<{ silos: IdentitySilo[] }> = ({ silos }) => {
  return (
    <div className="mfa-feed">
      <style jsx>{`
        .mfa-feed {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          padding: 16px;
        }
        .feed-header {
          grid-column: 1 / -1;
          background: linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%);
          border-radius: 12px;
          padding: 16px;
          color: white;
          font-weight: 700;
          font-size: 18px;
          text-align: center;
        }
      `}</style>
      
      <div className="feed-header">
        🛡️ SOVEREIGN IDENTITY MFA DASHBOARD
        <div style={{ fontSize: '12px', fontWeight: '400', marginTop: '4px' }}>
          Real-time 2FA codes for {silos.length} identity silos
        </div>
      </div>

      {silos.map((silo) => (
        <MfaPanel key={silo.id} silo={silo} autoRotate={true} showSecret={false} />
      ))}
    </div>
  );
};

// Default export
export default MfaPanel;