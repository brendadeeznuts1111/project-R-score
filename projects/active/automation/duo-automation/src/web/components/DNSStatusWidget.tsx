import React, { useState, useEffect } from 'react';

// src/web/components/DNSStatusWidget.tsx
export const DNSStatusWidget: React.FC = () => {
  const [status, setStatus] = useState<DNSStatus | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const response = await fetch('/api/admin/dns-status');
      setStatus(await response.json());
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  if (!status) return <Skeleton />;

  return (
    <div className="dns-status-grid">
      {status.records.map(record => (
        <div key={record.subdomain} className={`dns-record ${record.status}`}>
          <div className="dns-icon">
            {record.status === 'active' ? '✅' : '⏳'}
          </div>
          <div className="dns-details">
            <code>{record.subdomain}.factory-wager.com</code>
            <span className="dns-type">{record.type}</span>
          </div>
          <div className="dns-action">
            {record.status !== 'active' && (
              <button onClick={() => window.open('https://dash.cloudflare.com', '_blank')}>
                Add to Cloudflare
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
