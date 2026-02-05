// Android-style dispute UI components built in React

import React, { useState, useEffect } from 'react';
import './DisputeUI.css';

// Main Dispute Activity Component
export const DisputeActivity: React.FC<{
  transaction: any;
  onSubmitDispute: (disputeData: any) => void;
}> = ({ transaction, onSubmitDispute }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const disputeReasons = [
    'Item not received',
    'Item damaged/defective',
    'Wrong item received',
    'Unauthorized transaction',
    'Merchant overcharged',
    'Other issue'
  ];

  const handleDisputeClick = () => {
    setShowReasonDialog(true);
  };

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    setShowReasonDialog(false);
    // Navigate to dispute details
    onSubmitDispute({ transaction, reason });
  };

  return (
    <div className="dispute-activity">
      <div className="transaction-card">
        <div className="merchant-info">
          <h3>@{transaction.merchantUsername}</h3>
          <p className="amount">${transaction.amount.toFixed(2)}</p>
          <p className="date">{new Date(transaction.createdAt).toLocaleString()}</p>
          <p className="status">{transaction.status}</p>
        </div>
      </div>

      <button 
        className="dispute-button"
        onClick={handleDisputeClick}
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Dispute This Transaction'}
      </button>

      {showReasonDialog && (
        <ReasonSelectionDialog
          reasons={disputeReasons}
          onSelect={handleReasonSelect}
          onClose={() => setShowReasonDialog(false)}
        />
      )}
    </div>
  );
};

// Reason Selection Dialog
interface ReasonSelectionDialogProps {
  reasons: string[];
  onSelect: (reason: string) => void;
  onClose: () => void;
}

const ReasonSelectionDialog: React.FC<ReasonSelectionDialogProps> = ({
  reasons,
  onSelect,
  onClose
}) => {
  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-header">
          <h2>Select dispute reason</h2>
        </div>
        <div className="dialog-content">
          {reasons.map((reason, index) => (
            <button
              key={index}
              className="reason-option"
              onClick={() => onSelect(reason)}
            >
              {reason}
            </button>
          ))}
        </div>
        <div className="dialog-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Dispute Details Screen
export const DisputeDetailsActivity: React.FC<{
  transaction: any;
  reason: string;
  onSubmit: (disputeData: any) => void;
}> = ({ transaction, reason, onSubmit }) => {
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<string[]>([]);
  const [contactMerchantFirst, setContactMerchantFirst] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showCameraOptions, setShowCameraOptions] = useState(false);

  const handleAddPhoto = () => {
    setShowCameraOptions(true);
  };

  const handleCameraOption = (option: 'camera' | 'gallery') => {
    // In a real app, this would open camera or gallery
    const mockFile = `photo_${Date.now()}.jpg`;
    setEvidenceFiles([...evidenceFiles, mockFile]);
    setShowCameraOptions(false);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      alert('Please provide a description of the issue');
      return;
    }

    setLoading(true);
    
    const disputeData = {
      transactionId: transaction.id,
      reason,
      description,
      evidence: evidenceFiles,
      contactMerchantFirst,
      requestedResolution: 'REFUND_FULL'
    };

    try {
      await onSubmit(disputeData);
    } catch (error) {
      console.error('Failed to submit dispute:', error);
      alert('Failed to submit dispute. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dispute-details">
      <div className="transaction-summary">
        <h3>Dispute Details</h3>
        <div className="summary-card">
          <p><strong>Merchant:</strong> @{transaction.merchantUsername}</p>
          <p><strong>Amount:</strong> ${transaction.amount.toFixed(2)}</p>
          <p><strong>Date:</strong> {new Date(transaction.createdAt).toLocaleDateString()}</p>
          <p><strong>Reason:</strong> {reason}</p>
        </div>
      </div>

      <div className="description-section">
        <h4>Description</h4>
        <textarea
          placeholder="Describe what went wrong. Example: 'Ordered latte, got espresso. Tried contacting @coffee-shop but no response.'"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="description-textarea"
          rows={4}
        />
      </div>

      <div className="evidence-section">
        <h4>Evidence</h4>
        <div className="evidence-list">
          {evidenceFiles.map((file, index) => (
            <div key={index} className="evidence-item">
              <span>{file}</span>
              <button 
                onClick={() => setEvidenceFiles(evidenceFiles.filter((_, i) => i !== index))}
                className="remove-evidence"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="add-photo-button" onClick={handleAddPhoto}>
          📷 Add Photo Evidence
        </button>
      </div>

      <div className="options-section">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={contactMerchantFirst}
            onChange={(e) => setContactMerchantFirst(e.target.checked)}
          />
          Contact merchant first before escalating
        </label>
      </div>

      <button 
        className="submit-button"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Submitting...' : 'Submit Dispute'}
      </button>

      {showCameraOptions && (
        <CameraOptionsDialog
          onSelect={handleCameraOption}
          onClose={() => setShowCameraOptions(false)}
        />
      )}
    </div>
  );
};

// Camera Options Dialog
interface CameraOptionsDialogProps {
  onSelect: (option: 'camera' | 'gallery') => void;
  onClose: () => void;
}

const CameraOptionsDialog: React.FC<CameraOptionsDialogProps> = ({
  onSelect,
  onClose
}) => {
  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-header">
          <h2>Add Photo</h2>
        </div>
        <div className="dialog-content">
          <button className="camera-option" onClick={() => onSelect('camera')}>
            📷 Take Photo
          </button>
          <button className="camera-option" onClick={() => onSelect('gallery')}>
            🖼️ Choose from Gallery
          </button>
        </div>
        <div className="dialog-actions">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Dispute Status Tracking Screen
export const DisputeStatusActivity: React.FC<{
  disputeId: string;
}> = ({ disputeId }) => {
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock dispute data - in real app, fetch from API
    const mockDispute = {
      id: disputeId,
      status: 'UNDER_REVIEW',
      transactionId: 'TX-789012',
      timeline: [
        {
          event: 'Dispute submitted',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          icon: '✅',
          completed: true
        },
        {
          event: 'Merchant notified',
          timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000), // 1.8 hours ago
          icon: '📧',
          completed: true
        },
        {
          event: 'Evidence under review',
          timestamp: new Date(),
          icon: '🔍',
          completed: false
        },
        {
          event: 'Resolution decision',
          timestamp: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
          icon: '⚖️',
          completed: false
        },
        {
          event: 'Funds returned',
          timestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          icon: '💰',
          completed: false
        }
      ],
      estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      messages: [
        {
          sender: 'System',
          content: "We've asked @coffee-shop to respond within 48 hours",
          timestamp: new Date(Date.now() - 1.8 * 60 * 60 * 1000),
          isSystem: true
        },
        {
          sender: '@coffee-shop',
          content: 'Checking with our staff about your order',
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
          isSystem: false
        }
      ]
    };

    setTimeout(() => {
      setDispute(mockDispute);
      setLoading(false);
    }, 1000);
  }, [disputeId]);

  if (loading) {
    return <div className="loading">Loading dispute status...</div>;
  }

  if (!dispute) {
    return <div className="error">Dispute not found</div>;
  }

  return (
    <div className="dispute-status">
      <div className="status-header">
        <h2>Dispute Status: {dispute.id}</h2>
        <div className="status-badge">{dispute.status}</div>
      </div>

      <div className="timeline-section">
        <h3>Timeline</h3>
        <div className="timeline">
          {dispute.timeline.map((event: any, index: number) => (
            <div key={index} className={`timeline-item ${event.completed ? 'completed' : 'pending'}`}>
              <div className="timeline-icon">{event.icon}</div>
              <div className="timeline-content">
                <h4>{event.event}</h4>
                <p>{event.timestamp.toLocaleString()}</p>
                {!event.completed && index === 2 && (
                  <p className="current-status">Currently in progress</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="messages-section">
        <h3>Dispute Chat</h3>
        <div className="messages">
          {dispute.messages.map((message: any, index: number) => (
            <div 
              key={index} 
              className={`message ${message.isSystem ? 'system' : 'merchant'}`}
            >
              <div className="message-header">
                <strong>{message.sender}</strong>
                <span>{message.timestamp.toLocaleTimeString()}</span>
              </div>
              <p>{message.content}</p>
            </div>
          ))}
        </div>
        <div className="message-input">
          <input type="text" placeholder="Type a message..." />
          <button>Send</button>
        </div>
      </div>

      <div className="actions-section">
        <button className="action-button">Add More Evidence</button>
        <button className="action-button">Message Merchant</button>
        <button className="action-button">View Dispute Policy</button>
      </div>
    </div>
  );
};

// Dispute Submission Confirmation
export const DisputeSubmittedDialog: React.FC<{
  disputeId: string;
  onClose: () => void;
  onTrackStatus: () => void;
}> = ({ disputeId, onClose, onTrackStatus }) => {
  return (
    <div className="dialog-overlay">
      <div className="dialog success-dialog">
        <div className="dialog-header">
          <div className="success-icon">✓</div>
          <h2>Dispute Submitted ✓</h2>
        </div>
        <div className="dialog-content">
          <p>We've received your dispute.</p>
          <div className="next-steps">
            <h4>✅ What happens next:</h4>
            <ol>
              <li>We'll notify the merchant about your dispute</li>
              <li>You can communicate through our secure dispute channel</li>
              <li>We'll review all evidence within 3-5 business days</li>
              <li>You'll receive updates in the app</li>
            </ol>
          </div>
          <div className="dispute-info">
            <p><strong>Dispute ID:</strong> {disputeId}</p>
            <p><strong>Expected resolution:</strong> 5-10 business days</p>
          </div>
        </div>
        <div className="dialog-actions">
          <button className="track-button" onClick={onTrackStatus}>
            Track Status
          </button>
          <button className="close-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced QR Payment with Dispute Prevention
export const EnhancedQRPaymentActivity: React.FC<{
  transaction: any;
  onConfirm: () => void;
  onReviewItems: () => void;
}> = ({ transaction, onConfirm, onReviewItems }) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  const generateQRWithVerification = () => {
    return {
      version: "2.0",
      type: "duoplus.verified.payment",
      transactionId: transaction.id,
      amount: transaction.amount,
      merchant: transaction.merchantUsername,
      merchantVerified: true,
      merchantRating: 4.5,
      items: transaction.items,
      timestamp: transaction.timestamp,
      location: transaction.location,
      disputePrevention: {
        requiresPhotoConfirmation: true,
        requiresCustomerSignature: false,
        deliveryVerification: transaction.requiresDelivery
      }
    };
  };

  const handlePaymentClick = () => {
    setShowConfirmation(true);
  };

  const qrData = generateQRWithVerification();

  return (
    <div className="enhanced-qr-payment">
      <div className="qr-code">
        {/* QR code visualization would go here */}
        <div className="qr-placeholder">QR Code</div>
      </div>

      <div className="payment-details">
        <h3>Payment to @{transaction.merchantUsername}</h3>
        <p className="amount">${transaction.amount.toFixed(2)}</p>
      </div>

      <button className="pay-button" onClick={handlePaymentClick}>
        Confirm & Pay
      </button>

      <button className="review-button" onClick={onReviewItems}>
        Review Items
      </button>

      {showConfirmation && (
        <PaymentConfirmationDialog
          transaction={transaction}
          qrData={qrData}
          onConfirm={onConfirm}
          onCancel={() => setShowConfirmation(false)}
        />
      )}
    }
  );
};

// Payment Confirmation Dialog
interface PaymentConfirmationDialogProps {
  transaction: any;
  qrData: any;
  onConfirm: () => void;
  onCancel: () => void;
}

const PaymentConfirmationDialog: React.FC<PaymentConfirmationDialogProps> = ({
  transaction,
  qrData,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-header">
          <h2>Confirm Payment to @{transaction.merchantUsername}</h2>
        </div>
        <div className="dialog-content">
          <p><strong>Amount:</strong> ${transaction.amount.toFixed(2)}</p>
          
          <div className="dispute-prevention">
            <h4>🛡️ Dispute Prevention Enabled:</h4>
            <ul>
              <li>✓ Merchant is verified by Venmo</li>
              <li>✓ Transaction includes itemized receipt</li>
              <li>✓ Location verified: {qrData.location?.address || '123 Coffee St'}</li>
              <li>✓ Photo confirmation required</li>
            </ul>
          </div>

          <div className="confirmation-checklist">
            <h4>By paying, you confirm:</h4>
            <label>
              <input type="checkbox" defaultChecked />
              You're purchasing: {transaction.items?.[0]?.name || 'Latte (Large)'}
            </label>
            <label>
              <input type="checkbox" defaultChecked />
              You've received the items
            </label>
            <label>
              <input type="checkbox" defaultChecked />
              The amount is correct
            </label>
          </div>

          <p className="dispute-note">
            <strong>Note:</strong> Disputes for verified transactions require stronger evidence.
          </p>
        </div>
        <div className="dialog-actions">
          <button className="confirm-pay-button" onClick={onConfirm}>
            Confirm & Pay
          </button>
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
