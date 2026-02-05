/**
 * Enhanced Payment QR Display Component with Accessibility & Real-time Updates
 * 
 * Addresses LOW priority improvements: visual countdown timer, WebSocket payment
 * status polling, and accessibility labels.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode.react';

interface PaymentQRDisplayProps {
  paymentIntent: {
    id: string;
    amount: number;
    currency: string;
    description: string;
    recipientName: string;
    paymentMethod: {
      type: 'cashapp' | 'venmo' | 'crypto' | 'bitcoin_lightning';
      identifier: string;
      displayName: string;
    };
    deepLink: string;
    qrCode: string;
    expiresAt: string;
  };
  onPaymentComplete?: (transactionId: string) => void;
  onPaymentFailed?: (error: string) => void;
  className?: string;
}

interface PaymentStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  transactionId?: string;
  error?: string;
  lastUpdated: string;
}

const EnhancedPaymentQRDisplay: React.FC<PaymentQRDisplayProps> = ({
  paymentIntent,
  onPaymentComplete,
  onPaymentFailed,
  className = ''
}) => {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'pending',
    lastUpdated: new Date().toISOString()
  });
  
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showCopied, setShowCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 🕐 Visual countdown timer
   */
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(paymentIntent.expiresAt).getTime();
      const remaining = Math.max(0, expiry - now);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0 && paymentStatus.status === 'pending') {
        setPaymentStatus(prev => ({
          ...prev,
          status: 'expired',
          lastUpdated: new Date().toISOString()
        }));
      }
    };

    calculateTimeRemaining();
    countdownIntervalRef.current = setInterval(calculateTimeRemaining, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [paymentIntent.expiresAt, paymentStatus.status]);

  /**
   * 🔄 WebSocket connection for real-time updates
   */
  useEffect(() => {
    const connectWebSocket = () => {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/payment/${paymentIntent.id}`;
      
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected for payment updates');
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handlePaymentUpdate(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected, attempting reconnect...');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [paymentIntent.id]);

  /**
   * 🔄 Fallback polling for payment status
   */
  useEffect(() => {
    if (!isConnected) {
      const pollPaymentStatus = async () => {
        try {
          const response = await fetch(`/api/payment/status/${paymentIntent.id}`);
          const data = await response.json();
          
          if (data.success) {
            handlePaymentUpdate(data);
          }
        } catch (error) {
          console.error('Error polling payment status:', error);
        }
      };

      // Poll every 5 seconds when WebSocket is disconnected
      pollingIntervalRef.current = setInterval(pollPaymentStatus, 5000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [isConnected, paymentIntent.id]);

  /**
   * 📱 Handle payment status updates
   */
  const handlePaymentUpdate = useCallback((data: any) => {
    const newStatus: PaymentStatus = {
      status: data.status || 'pending',
      transactionId: data.transactionId,
      error: data.error,
      lastUpdated: new Date().toISOString()
    };

    setPaymentStatus(newStatus);

    // Trigger callbacks
    if (newStatus.status === 'completed' && newStatus.transactionId) {
      onPaymentComplete?.(newStatus.transactionId);
    } else if (newStatus.status === 'failed' && newStatus.error) {
      onPaymentFailed?.(newStatus.error);
    }
  }, [onPaymentComplete, onPaymentFailed]);

  /**
   * 📋 Copy payment link to clipboard
   */
  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentIntent.deepLink);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy payment link:', error);
    }
  };

  /**
   * 📱 Format time remaining
   */
  const formatTimeRemaining = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  /**
   * 🎨 Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'expired': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  /**
   * 🎨 Get status background color
   */
  const getStatusBgColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-100';
      case 'processing': return 'bg-blue-100';
      case 'completed': return 'bg-green-100';
      case 'failed': return 'bg-red-100';
      case 'expired': return 'bg-gray-100';
      default: return 'bg-gray-100';
    }
  };

  /**
   * ♿ Accessibility labels
   */
  const getAccessibilityLabel = (): string => {
    const statusText = paymentStatus.status.charAt(0).toUpperCase() + paymentStatus.status.slice(1);
    const timeText = timeRemaining > 0 ? `expires in ${formatTimeRemaining(timeRemaining)}` : 'expired';
    
    return `Payment QR code for ${paymentIntent.paymentMethod.displayName}, amount ${paymentIntent.currency} ${paymentIntent.amount}, status is ${statusText}, ${timeText}`;
  };

  return (
    <div className={`max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header with status */}
      <div className={`p-4 ${getStatusBgColor(paymentStatus.status)}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Pay {paymentIntent.recipientName}
            </h2>
            <p className="text-sm text-gray-600">
              {paymentIntent.paymentMethod.displayName}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${getStatusColor(paymentStatus.status)}`}>
              {paymentStatus.status.charAt(0).toUpperCase() + paymentStatus.status.slice(1)}
            </div>
            {timeRemaining > 0 && (
              <div className="text-xs text-gray-500">
                {formatTimeRemaining(timeRemaining)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Section */}
      <div className="p-6">
        <div className="flex flex-col items-center">
          {/* QR Code with accessibility */}
          <div 
            className="relative mb-4"
            role="img"
            aria-label={getAccessibilityLabel()}
            tabIndex={0}
          >
            <QRCode
              value={paymentIntent.deepLink}
              size={256}
              level="H"
              includeMargin={true}
              bgColor="#3b82f6"
              fgColor="#3b82f6"
            />
            
            {/* Status overlay */}
            {paymentStatus.status !== 'pending' && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  {paymentStatus.status === 'completed' && (
                    <div className="text-green-600">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="font-semibold">Payment Completed!</p>
                    </div>
                  )}
                  {paymentStatus.status === 'failed' && (
                    <div className="text-red-600">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <p className="font-semibold">Payment Failed</p>
                    </div>
                  )}
                  {paymentStatus.status === 'expired' && (
                    <div className="text-gray-600">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      <p className="font-semibold">Payment Expired</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment details */}
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-gray-900">
              {paymentIntent.currency} {paymentIntent.amount}
            </div>
            <div className="text-sm text-gray-600">
              {paymentIntent.description}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={copyPaymentLink}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Copy payment link to clipboard"
            >
              {showCopied ? 'Copied!' : 'Copy Link'}
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              aria-label={isExpanded ? 'Hide payment details' : 'Show payment details'}
              aria-expanded={isExpanded}
            >
              {isExpanded ? 'Hide Details' : 'Show Details'}
            </button>
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span>
              {isConnected ? 'Real-time updates' : 'Checking for updates...'}
            </span>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment ID:</span>
                <span className="font-mono text-gray-900">{paymentIntent.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="text-gray-900">{paymentIntent.paymentMethod.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Identifier:</span>
                <span className="font-mono text-gray-900">{paymentIntent.paymentMethod.identifier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expires:</span>
                <span className="text-gray-900">
                  {new Date(paymentIntent.expiresAt).toLocaleString()}
                </span>
              </div>
              {paymentStatus.transactionId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction ID:</span>
                  <span className="font-mono text-gray-900">{paymentStatus.transactionId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="text-gray-900">
                  {new Date(paymentStatus.lastUpdated).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with help */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-600 text-center">
          <p>Scan this QR code with {paymentIntent.paymentMethod.displayName} or click the payment link</p>
          <p className="mt-1">Payment will be automatically detected</p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPaymentQRDisplay;
export type { PaymentQRDisplayProps, PaymentStatus };
