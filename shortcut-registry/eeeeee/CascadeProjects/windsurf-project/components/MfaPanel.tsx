#!/usr/bin/env bun
// 📱 src/client/components/MfaPanel.tsx - Real-Time 2FA Dashboard Central
// Shows live 2FA codes from Identity Silo without requiring real phone

import React, { useState, useEffect } from "react";

export interface MfaPanelProps {
  totpSecret: string;
  deviceId: string;
  identity: {
    fullName: string;
    email: string;
    phone: string;
  };
  isActive?: boolean;
  autoRefresh?: boolean;
}

export const MfaPanel: React.FC<MfaPanelProps> = ({
  totpSecret,
  deviceId,
  identity,
  isActive = true,
  autoRefresh = true
}) => {
  const [code, setCode] = useState("000000");
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [copied, setCopied] = useState(false);

  // ⚡ BUN-NATIVE CRYPTO 2FA CALCULATION
  // Simulated TOTP generation (in production would use proper TOTP library)
  const generateTOTPCode = (secret: string): string => {
    // Simple deterministic code generation based on secret and time
    const timeSlot = Math.floor(Date.now() / 30000); // 30-second intervals
    const hash = Bun.hash(secret + timeSlot.toString());
    return Math.floor(Number(hash) % 1000000).toString().padStart(6, '0');
  };

  // 🔄 UPDATE CODE EVERY 30 SECONDS
  useEffect(() => {
    if (!isActive || !autoRefresh) return;

    const updateCode = () => {
      const newCode = generateTOTPCode(totpSecret);
      setCode(newCode);
      setLastUpdated(new Date());
      setTimeRemaining(30);
    };

    // Initial code generation
    updateCode();

    // Set up timer for code updates
    const codeTimer = setInterval(() => {
      updateCode();
    }, 30000);

    // Set up timer for countdown
    const countdownTimer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) return 30;
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(codeTimer);
      clearInterval(countdownTimer);
    };
  }, [totpSecret, isActive, autoRefresh]);

  // 📋 COPY CODE TO CLIPBOARD
  const copyToClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // 🎨 DYNAMIC PROGRESS BAR COLOR
  const getProgressColor = () => {
    if (timeRemaining > 20) return 'bg-green-500';
    if (timeRemaining > 10) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 📱 MOBILE RESPONSIVE DESIGN
  const isMobile = typeof globalThis !== 'undefined' && (globalThis as any).window 
    ? (globalThis as any).window.innerWidth < 768 
    : false;

  return (
    <div className={`
      bg-gray-900 border border-blue-500/50 rounded-lg p-4 
      ${isMobile ? 'p-3' : 'p-4'}
      ${isActive ? 'shadow-lg shadow-blue-500/20' : 'opacity-50'}
      transition-all duration-300
    `}>
      {/* 📊 HEADER */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            2FA Core
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {deviceId}
        </div>
      </div>

      {/* 🔐 SECRET DISPLAY */}
      <div className="mb-3">
        <div className="text-xs text-gray-500 mb-1">Secret:</div>
        <div className="bg-gray-800 px-2 py-1 rounded font-mono text-xs text-blue-400">
          {totpSecret}
        </div>
      </div>

      {/* 🔢 MAIN 2FA CODE */}
      <div className="text-center mb-4">
        <div 
          className={`
            text-4xl font-mono text-blue-400 tracking-widest 
            ${isMobile ? 'text-3xl' : 'text-4xl'}
            ${copied ? 'text-green-400' : ''}
            transition-colors duration-200
          `}
        >
          {code}
        </div>
        {copied && (
          <div className="text-xs text-green-400 mt-1">Copied!</div>
        )}
      </div>

      {/* 📊 PROGRESS BAR */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Time Remaining</span>
          <span>{timeRemaining}s</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`
              ${getProgressColor()} h-2 rounded-full transition-all duration-1000
            `}
            style={{ width: `${(timeRemaining / 30) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* 🎯 ACTION BUTTONS */}
      <div className="flex space-x-2 mb-3">
        <button
          onClick={copyToClipboard}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-xs font-medium transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy Code'}
        </button>
        <button
          onClick={() => {
            const newCode = generateTOTPCode(totpSecret);
            setCode(newCode);
            setLastUpdated(new Date());
          }}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-xs font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* 👤 IDENTITY INFO */}
      <div className="border-t border-gray-700 pt-3">
        <div className="text-xs text-gray-500 mb-2">Identity:</div>
        <div className="space-y-1">
          <div className="text-xs text-gray-300">
            <span className="text-gray-500">Name:</span> {identity.fullName}
          </div>
          <div className="text-xs text-gray-300">
            <span className="text-gray-500">Email:</span> {identity.email}
          </div>
          <div className="text-xs text-gray-300">
            <span className="text-gray-500">Phone:</span> {identity.phone}
          </div>
        </div>
      </div>

      {/* 📊 STATUS FOOTER */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Last Updated:</span>
          <span>{lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

// 🎯 MULTI-DEVICE 2FA PANEL
export interface MultiDeviceMfaPanelProps {
  devices: Array<{
    deviceId: string;
    totpSecret: string;
    identity: MfaPanelProps['identity'];
    isActive: boolean;
  }>;
}

export const MultiDeviceMfaPanel: React.FC<MultiDeviceMfaPanelProps> = ({ devices }) => {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* 📱 DEVICE SELECTOR */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {devices.map(device => (
          <button
            key={device.deviceId}
            onClick={() => setSelectedDevice(device.deviceId)}
            className={`
              px-3 py-1 rounded-full text-xs font-medium transition-colors
              ${selectedDevice === device.deviceId 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
              ${device.isActive ? 'ring-2 ring-green-500' : ''}
            `}
          >
            {device.deviceId}
            {device.isActive && (
              <span className="ml-1 w-2 h-2 bg-green-500 rounded-full inline-block"></span>
            )}
          </button>
        ))}
      </div>

      {/* 📊 SELECTED DEVICE PANEL */}
      {selectedDevice && (
        <div className="animate-fadeIn">
          <MfaPanel
            {...devices.find(d => d.deviceId === selectedDevice)!}
            isActive={true}
            autoRefresh={true}
          />
        </div>
      )}

      {/* 📊 ALL DEVICES GRID */}
      {!selectedDevice && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <div key={device.deviceId} className="animate-fadeIn">
              <MfaPanel
                {...device}
                isActive={device.isActive}
                autoRefresh={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 🎯 COMPACT 2FA DISPLAY
export interface CompactMfaDisplayProps {
  totpSecret: string;
  label?: string;
  showSecret?: boolean;
}

export const CompactMfaDisplay: React.FC<CompactMfaDisplayProps> = ({
  totpSecret,
  label = "2FA",
  showSecret = false
}) => {
  const [code, setCode] = useState("000000");

  useEffect(() => {
    const generateCode = () => {
      const timeSlot = Math.floor(Date.now() / 30000);
      const hash = Bun.hash(totpSecret + timeSlot.toString());
      const newCode = Math.floor(Number(hash) % 1000000).toString().padStart(6, '0');
      setCode(newCode);
    };

    generateCode();
    const timer = setInterval(generateCode, 30000);
    return () => clearInterval(timer);
  }, [totpSecret]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded px-3 py-2 inline-block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-mono text-sm text-blue-400">{code}</div>
      {showSecret && (
        <div className="text-xs text-gray-600 mt-1">{totpSecret}</div>
      )}
    </div>
  );
};

export default MfaPanel;
