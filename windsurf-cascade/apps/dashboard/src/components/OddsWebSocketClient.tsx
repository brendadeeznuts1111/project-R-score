import React, { useState, useEffect, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  sequence: number;
}

interface OddsWebSocketClientProps {
  onConnectionChange: (connected: boolean) => void;
}

export const OddsWebSocketClient: React.FC<OddsWebSocketClientProps> = ({ onConnectionChange }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<number | null>(null);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  const connect = () => {
    try {
      ws.current = new WebSocket('ws://localhost:8080');
      
      ws.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        onConnectionChange(true);
        console.log('WebSocket connected');
      };
      
      ws.current.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setMessages((prev: WebSocketMessage[]) => [...prev.slice(-99), message]); // Keep last 100 messages
        } catch (err) {
          console.error('Failed to parse message:', err);
        }
      };
      
      ws.current.onclose = (event: CloseEvent) => {
        setIsConnected(false);
        onConnectionChange(false);
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Auto-reconnect after 3 seconds
        if (event.code !== 1000) {
          reconnectTimeout.current = window.setTimeout(connect, 3000);
        }
      };
      
      ws.current.onerror = (event: Event) => {
        setError('WebSocket connection error');
        console.error('WebSocket error:', event);
      };
      
    } catch (err) {
      setError('Failed to create WebSocket connection');
      console.error('Connection error:', err);
    }
  };

  const disconnect = () => {
    if (reconnectTimeout.current !== null) {
      window.clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    
    if (ws.current) {
      ws.current.close(1000, 'User disconnected');
      ws.current = null;
    }
    
    setIsConnected(false);
    onConnectionChange(false);
  };

  const sendMessage = (type: string, data: any) => {
    if (ws.current && isConnected) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: Date.now(),
        sequence: messages.length
      };
      
      ws.current.send(JSON.stringify(message));
    }
  };

  const subscribeToSymbol = (symbol: string) => {
    sendMessage('subscribe', { symbol });
  };

  const unsubscribeFromSymbol = (symbol: string) => {
    sendMessage('unsubscribe', { symbol });
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="websocket-client">
      <div className="client-header">
        <h3>WebSocket Client</h3>
        <div className="connection-controls">
          <button 
            onClick={isConnected ? disconnect : connect}
            className={isConnected ? 'disconnect' : 'connect'}
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </button>
          <button onClick={clearMessages} className="clear">
            Clear Messages
          </button>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="client-status">
        <span className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        <span className="message-count">
          {messages.length} messages
        </span>
      </div>
      
      <div className="subscription-controls">
        <h4>Subscriptions</h4>
        <div className="symbol-controls">
          <input 
            type="text" 
            placeholder="Symbol (e.g., AAPL)"
            id="symbol-input"
            onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                const input = e.currentTarget;
                if (input.value.trim()) {
                  subscribeToSymbol(input.value.trim());
                  input.value = '';
                }
              }
            }}
          />
          <button onClick={() => {
            const input = document.getElementById('symbol-input') as HTMLInputElement;
            if (input?.value.trim()) {
              subscribeToSymbol(input.value.trim());
              input.value = '';
            }
          }}>
            Subscribe
          </button>
        </div>
      </div>
      
      <div className="message-log">
        <h4>Message Log</h4>
        <div className="messages">
          {messages.length === 0 ? (
            <div className="no-messages">No messages received</div>
          ) : (
            messages.slice(-20).reverse().map((message: WebSocketMessage, index: number) => (
              <div key={index} className="message">
                <div className="message-header">
                  <span className="message-type">{message.type}</span>
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="message-sequence">#{message.sequence}</span>
                </div>
                <div className="message-content">
                  {JSON.stringify(message.data, null, 2)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
