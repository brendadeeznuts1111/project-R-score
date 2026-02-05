// Merchant-facing dispute response UI components

import React, { useState, useEffect } from 'react';
import './DisputeUI.css';

export const MerchantDisputeDashboard: React.FC<{
  merchantId: string;
  onSelectDispute: (disputeId: string) => void;
}> = ({ merchantId, onSelectDispute }) => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock fetching merchant disputes
    setTimeout(() => {
      setDisputes([
        {
          id: 'DSP-123456',
          transactionId: 'TX-789012',
          customerUsername: 'coffee_lover',
          amount: 12.50,
          reason: 'Wrong item received',
          status: 'MERCHANT_REVIEW',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          deadline: new Date(Date.now() + 86400000).toISOString()
        },
        {
          id: 'DSP-789012',
          transactionId: 'TX-345678',
          customerUsername: 'morning_joe',
          amount: 5.50,
          reason: 'Item not received',
          status: 'UNDER_REVIEW',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          deadline: new Date(Date.now() - 86400000).toISOString()
        }
      ]);
      setLoading(false);
    }, 1000);
  }, [merchantId]);

  if (loading) return <div className="loading">Loading disputes...</div>;

  return (
    <div className="merchant-dashboard">
      <header className="dashboard-header">
        <h1>Dispute Management</h1>
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{disputes.filter(d => d.status === 'MERCHANT_REVIEW').length}</span>
            <span className="stat-label">Action Required</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{disputes.length}</span>
            <span className="stat-label">Total Active</span>
          </div>
        </div>
      </header>

      <div className="dispute-list">
        {disputes.map(dispute => (
          <div 
            key={dispute.id} 
            className={`dispute-item-card ${dispute.status === 'MERCHANT_REVIEW' ? 'priority' : ''}`}
            onClick={() => onSelectDispute(dispute.id)}
          >
            <div className="dispute-item-header">
              <span className="dispute-id">{dispute.id}</span>
              <span className={`status-tag ${dispute.status.toLowerCase()}`}>{dispute.status}</span>
            </div>
            <div className="dispute-item-body">
              <div className="customer-info">
                <strong>@{dispute.customerUsername}</strong>
                <span className="amount">${dispute.amount.toFixed(2)}</span>
              </div>
              <p className="reason-text">{dispute.reason}</p>
              <div className="date-info">
                <span>Filed: {new Date(dispute.createdAt).toLocaleDateString()}</span>
                {dispute.status === 'MERCHANT_REVIEW' && (
                  <span className="deadline-alert">Respond by: {new Date(dispute.deadline).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MerchantResponseActivity: React.FC<{
  dispute: any;
  onSubmitResponse: (response: any) => void;
}> = ({ dispute, onSubmitResponse }) => {
  const [message, setMessage] = useState('');
  const [acceptsFault, setAcceptsFault] = useState(false);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [offerType, setOfferType] = useState<'FULL_REFUND' | 'PARTIAL_REFUND' | 'STORE_CREDIT' | 'NONE'>('FULL_REFUND');
  const [offerAmount, setOfferAmount] = useState(dispute.amount);

  const handleSubmit = () => {
    onSubmitResponse({
      message,
      acceptsFault,
      evidence,
      resolutionOffer: offerType !== 'NONE' ? {
        type: offerType,
        amount: offerAmount,
        description: message
      } : undefined
    });
  };

  return (
    <div className="merchant-response-activity">
      <div className="dispute-context-card">
        <h3>Responding to {dispute.id}</h3>
        <p className="customer-claim">
          <strong>Customer Claim:</strong> {dispute.description || "The item I received was not what I ordered."}
        </p>
      </div>

      <div className="response-form">
        <section className="form-section">
          <h4>Your Position</h4>
          <div className="radio-group">
            <label className="radio-label">
              <input 
                type="radio" 
                checked={acceptsFault} 
                onChange={() => {
                  setAcceptsFault(true);
                  setOfferType('FULL_REFUND');
                }} 
              />
              Accept responsibility & issue refund
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                checked={!acceptsFault} 
                onChange={() => setAcceptsFault(false)} 
              />
              Contest claim with evidence
            </label>
          </div>
        </section>

        {!acceptsFault && (
          <section className="form-section">
            <h4>Resolution Offer (Optional)</h4>
            <select 
              value={offerType} 
              onChange={(e) => setOfferType(e.target.value as any)}
              className="styled-select"
            >
              <option value="NONE">No offer, wait for review</option>
              <option value="PARTIAL_REFUND">Offer Partial Refund</option>
              <option value="STORE_CREDIT">Offer Store Credit</option>
            </select>
            
            {offerType === 'PARTIAL_REFUND' && (
              <div className="amount-input-wrapper">
                <span>$</span>
                <input 
                  type="number" 
                  value={offerAmount} 
                  onChange={(e) => setOfferAmount(Number(e.target.value))}
                  max={dispute.amount}
                />
              </div>
            )}
          </section>
        )}

        <section className="form-section">
          <h4>Response Message</h4>
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={acceptsFault ? "Brief note to customer about the refund..." : "Explain your side of the transaction..."}
            rows={5}
          />
        </section>

        <section className="form-section">
          <h4>Supporting Evidence</h4>
          <div className="evidence-upload-zone">
            <button className="upload-btn">📷 Upload Photos/Receipts</button>
            <p className="upload-hint">Upload proof of delivery, item preparation, or communication.</p>
          </div>
        </section>

        <button 
          className={`submit-response-btn ${acceptsFault ? 'refund' : 'contest'}`}
          onClick={handleSubmit}
        >
          {acceptsFault ? 'Issue Refund' : 'Submit Response'}
        </button>
      </div>
    </div>
  );
};
