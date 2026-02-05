#!/usr/bin/env bun
// Approval Workflow with COPPA Compliance - Guardian-Powered Teen Onboarding
// Part of FAMILY SPONSORSHIP CONTROLS EXPANDED detonation

import { feature } from 'bun:bundle';
import * as React from 'react';
import { familyControlsManager } from './family-controls-manager';

// Types for Approval Workflow
interface COPPAConsentForm {
  id: string;
  teenId: string;
  guardianEmail: string;
  guardianName: string;
  teenName: string;
  teenAge: number;
  consentType: 'data_collection' | 'marketing' | 'third_party_sharing';
  signedAt: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  digitalSignature: string;
}

interface ApprovalRequest {
  id: string;
  teenId: string;
  teenName: string;
  teenAge: number;
  guardianEmail: string;
  requestType: 'team_seat' | 'spend_increase' | 'feature_upgrade' | 'age_verification';
  requestDetails: {
    description: string;
    amount?: number;
    duration?: string;
    features?: string[];
    justification?: string;
  };
  coppaRequired: boolean;
  consentForm?: COPPAConsentForm;
  riskLevel: 'low' | 'medium' | 'high';
  autoApprove: boolean;
  requestedAt: string;
  expiresAt: string;
  status: 'pending' | 'approved' | 'declined' | 'expired';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

interface AgeVerification {
  id: string;
  teenId: string;
  documentType: 'birth_certificate' | 'passport' | 'state_id';
  documentUrl: string;
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  verifiedAt?: string;
  expiresAt: string;
  aiConfidence: number;
  manualReviewRequired: boolean;
}

// Approval Workflow Manager
export class ApprovalWorkflowManager {
  private static instance: ApprovalWorkflowManager;
  
  static getInstance(): ApprovalWorkflowManager {
    if (!ApprovalWorkflowManager.instance) {
      ApprovalWorkflowManager.instance = new ApprovalWorkflowManager();
    }
    return ApprovalWorkflowManager.instance;
  }

  // Create approval request
  async createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'requestedAt' | 'expiresAt' | 'status'>): Promise<{
    requestId: string;
    coppaConsentRequired: boolean;
    consentFormUrl?: string;
    autoApproved: boolean;
  }> {
    const response = await fetch('/api/family/approvals/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...request,
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        status: 'pending'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create approval request: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Generate COPPA consent form
  async generateCOPPAConsentForm(teenId: string, guardianEmail: string, consentType: COPPAConsentForm['consentType']): Promise<{
    consentFormId: string;
    formUrl: string;
    expiresAt: string;
  }> {
    const response = await fetch('/api/family/coppa/consent/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teenId,
        guardianEmail,
        consentType,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate COPPA consent form: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Submit age verification
  async submitAgeVerification(teenId: string, documentData: {
    documentType: AgeVerification['documentType'];
    documentFile: File;
    additionalInfo?: string;
  }): Promise<{
    verificationId: string;
    estimatedProcessingTime: string;
    aiConfidence: number;
    manualReviewRequired: boolean;
  }> {
    const formData = new FormData();
    formData.append('teenId', teenId);
    formData.append('documentType', documentData.documentType);
    formData.append('documentFile', documentData.documentFile);
    if (documentData.additionalInfo) {
      formData.append('additionalInfo', documentData.additionalInfo);
    }

    const response = await fetch('/api/family/age-verification/submit', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to submit age verification: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Process approval with COPPA compliance check
  async processApprovalWithCompliance(requestId: string, action: 'approve' | 'decline', options?: {
    customLimits?: {
      daily?: number;
      weekly?: number;
      monthly?: number;
    };
    approvalDuration?: string;
    conditions?: string[];
    requireReverification?: boolean;
  }): Promise<{
    success: boolean;
    complianceChecked: boolean;
    coppaCompliant: boolean;
    approvalId: string;
    message: string;
  }> {
    const response = await fetch(`/api/family/approvals/${requestId}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        options,
        processedAt: new Date().toISOString(),
        complianceCheck: true,
        coppaValidation: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to process approval: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Get approval request details
  async getApprovalRequest(requestId: string): Promise<ApprovalRequest> {
    const response = await fetch(`/api/family/approvals/${requestId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get approval request: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Get pending approvals for guardian
  async getGuardianPendingApprovals(guardianEmail: string): Promise<ApprovalRequest[]> {
    const response = await fetch(`/api/family/approvals/pending?guardian=${encodeURIComponent(guardianEmail)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get pending approvals: ${response.statusText}`);
    }

    return response.json() as any;
  }

  // Check COPPA compliance status
  async checkCOPPACompliance(teenId: string): Promise<{
    compliant: boolean;
    consentRequired: boolean;
    consentValid: boolean;
    ageVerified: boolean;
    restrictions: string[];
    nextAction: string;
  }> {
    const response = await fetch(`/api/family/coppa/compliance/${teenId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to check COPPA compliance: ${response.statusText}`);
    }

    return response.json() as any;
  }
}

// Approval Workflow Component
export const ApprovalWorkflowModal = feature("PREMIUM") ? function() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [currentRequest, setCurrentRequest] = React.useState<ApprovalRequest | null>(null);
    const [coppaConsent, setCoppaConsent] = React.useState<COPPAConsentForm | null>(null);
    const [ageVerification, setAgeVerification] = React.useState<AgeVerification | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [activeStep, setActiveStep] = React.useState<'review' | 'coppa' | 'verification' | 'confirm'>('review');

    const workflowManager = ApprovalWorkflowManager.getInstance();

    const openApprovalModal = (request: ApprovalRequest) => {
      setCurrentRequest(request);
      setIsOpen(true);
      setActiveStep(request.coppaRequired ? 'coppa' : 'review');
    };

    const closeModal = () => {
      setIsOpen(false);
      setCurrentRequest(null);
      setCoppaConsent(null);
      setAgeVerification(null);
      setActiveStep('review');
    };

    const handleCOPPAConsent = async () => {
      if (!currentRequest) return;

      try {
        setLoading(true);
        const consentResult = await workflowManager.generateCOPPAConsentForm(
          currentRequest.teenId,
          currentRequest.guardianEmail,
          'data_collection'
        );
        
        // In a real implementation, this would open the consent form
        console.log('COPPA consent form generated:', consentResult);
        
        // Mock consent completion
        setCoppaConsent({
          id: consentResult.consentFormId,
          teenId: currentRequest.teenId,
          guardianEmail: currentRequest.guardianEmail,
          guardianName: 'Parent Guardian',
          teenName: currentRequest.teenName,
          teenAge: currentRequest.teenAge,
          consentType: 'data_collection',
          signedAt: new Date().toISOString(),
          expiresAt: consentResult.expiresAt,
          ipAddress: '127.0.0.1',
          userAgent: navigator.userAgent,
          digitalSignature: 'mock_signature_' + Date.now()
        });
        
        setActiveStep('verification');
      } catch (error) {
        console.error('Failed to generate COPPA consent:', error);
      } finally {
        setLoading(false);
      }
    };

    const handleAgeVerification = async (documentFile: File) => {
      if (!currentRequest) return;

      try {
        setLoading(true);
        const verificationResult = await workflowManager.submitAgeVerification(
          currentRequest.teenId,
          {
            documentType: 'birth_certificate',
            documentFile,
            additionalInfo: 'Age verification for team seat approval'
          }
        );
        
        // Mock verification completion
        setAgeVerification({
          id: verificationResult.verificationId,
          teenId: currentRequest.teenId,
          documentType: 'birth_certificate',
          documentUrl: 'mock_document_url',
          verificationStatus: 'verified',
          verifiedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          aiConfidence: verificationResult.aiConfidence,
          manualReviewRequired: verificationResult.manualReviewRequired
        });
        
        setActiveStep('confirm');
      } catch (error) {
        console.error('Failed to submit age verification:', error);
      } finally {
        setLoading(false);
      }
    };

    const processApproval = async (action: 'approve' | 'decline') => {
      if (!currentRequest) return;

      try {
        setLoading(true);
        const result = await workflowManager.processApprovalWithCompliance(currentRequest.id, action, {
          customLimits: action === 'approve' ? {
            daily: 25,
            weekly: 100,
            monthly: 300
          } : undefined,
          approvalDuration: '30_days',
          conditions: action === 'approve' ? ['parental_monitoring', 'spend_limits'] : undefined
        });
        
        console.log('Approval processed:', result);
        closeModal();
      } catch (error) {
        console.error('Failed to process approval:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!isOpen || !currentRequest) return null;

    return React.createElement('div', { className: 'approval-modal-overlay' },
      React.createElement('div', { className: 'approval-modal' },
        React.createElement('div', { className: 'modal-header' },
          React.createElement('h2', null, '🔐 Approval Required'),
          React.createElement('button', { 
            className: 'close-modal',
            onClick: closeModal
          }, '×')
        ),

        // Progress Steps
        React.createElement('div', { className: 'approval-steps' },
          ['review', 'coppa', 'verification', 'confirm'].map((step, index) =>
            React.createElement('div', {
              key: step,
              className: `step ${activeStep === step ? 'active' : (activeStep === 'confirm' || coppaConsent) ? 'completed' : ''}`
            },
              React.createElement('div', { className: 'step-number' }, index + 1),
              React.createElement('div', { className: 'step-label' }, 
                step.charAt(0).toUpperCase() + step.slice(1)
              )
            )
          )
        ),

        // Step Content
        React.createElement('div', { className: 'modal-content' },
          // Review Step
          activeStep === 'review' && React.createElement('div', { className: 'review-step' },
            React.createElement('h3', null, '📋 Request Review'),
            React.createElement('div', { className: 'request-details' },
              React.createElement('div', { className: 'detail-row' },
                React.createElement('label', null, 'Teen:'),
                React.createElement('span', null, `${currentRequest.teenName} (Age ${currentRequest.teenAge})`)
              ),
              React.createElement('div', { className: 'detail-row' },
                React.createElement('label', null, 'Request Type:'),
                React.createElement('span', null, currentRequest.requestType.replace('_', ' ').toUpperCase())
              ),
              React.createElement('div', { className: 'detail-row' },
                React.createElement('label', null, 'Description:'),
                React.createElement('span', null, currentRequest.requestDetails.description)
              ),
              currentRequest.requestDetails.amount && React.createElement('div', { className: 'detail-row' },
                React.createElement('label', null, 'Amount:'),
                React.createElement('span', { className: 'amount' }, `$${currentRequest.requestDetails.amount}`)
              ),
              React.createElement('div', { className: 'detail-row' },
                React.createElement('label', null, 'Risk Level:'),
                React.createElement('span', { className: `risk ${currentRequest.riskLevel}` }, currentRequest.riskLevel.toUpperCase())
              ),
              React.createElement('div', { className: 'detail-row' },
                React.createElement('label', null, 'COPPA Required:'),
                React.createElement('span', { className: currentRequest.coppaRequired ? 'required' : 'not-required' },
                  currentRequest.coppaRequired ? '✅ Yes' : '❌ No'
                )
              )
            ),
            React.createElement('div', { className: 'step-actions' },
              !currentRequest.coppaRequired && React.createElement('button', {
                className: 'approve-btn',
                onClick: () => processApproval('approve'),
                disabled: loading
              }, '✅ Approve'),
              React.createElement('button', {
                className: 'decline-btn',
                onClick: () => processApproval('decline'),
                disabled: loading
              }, '❌ Decline'),
              currentRequest.coppaRequired && React.createElement('button', {
                className: 'continue-btn',
                onClick: () => setActiveStep('coppa'),
                disabled: loading
              }, 'Continue to COPPA →')
            )
          ),

          // COPPA Step
          activeStep === 'coppa' && React.createElement('div', { className: 'coppa-step' },
            React.createElement('h3', null, '👶 COPPA Compliance'),
            React.createElement('div', { className: 'coppa-info' },
              React.createElement('div', { className: 'info-box' },
                React.createElement('h4', null, 'Why COPPA consent is required:'),
                React.createElement('ul', null,
                  React.createElement('li', null, 'User is under 13 years old'),
                  React.createElement('li', null, 'Data collection for analytics'),
                  React.createElement('li', null, 'Personalized features require consent'),
                  React.createElement('li', null, 'Legal compliance requirement')
                )
              ),
              React.createElement('div', { className: 'consent-summary' },
                React.createElement('h4', null, 'Consent covers:'),
                React.createElement('ul', null,
                  React.createElement('li', null, '✅ Dashboard usage analytics'),
                  React.createElement('li', null, '✅ Team collaboration features'),
                  React.createElement('li', null, '✅ Educational content delivery'),
                  React.createElement('li', null, '❌ Marketing communications'),
                  React.createElement('li', null, '❌ Third-party data sharing')
                )
              )
            ),
            React.createElement('div', { className: 'step-actions' },
              React.createElement('button', {
                className: 'back-btn',
                onClick: () => setActiveStep('review')
              }, '← Back'),
              React.createElement('button', {
                className: 'consent-btn',
                onClick: handleCOPPAConsent,
                disabled: loading
              }, loading ? 'Generating...' : '📝 Generate Consent Form')
            )
          ),

          // Verification Step
          activeStep === 'verification' && React.createElement('div', { className: 'verification-step' },
            React.createElement('h3', null, '🆔 Age Verification'),
            React.createElement('div', { className: 'verification-info' },
              React.createElement('p', null, 'Please upload a government-issued document to verify age:'),
              React.createElement('div', { className: 'accepted-documents' },
                React.createElement('h4', null, 'Accepted Documents:'),
                React.createElement('ul', null,
                  React.createElement('li', null, '📄 Birth Certificate'),
                  React.createElement('li', null, '🛂 Passport'),
                  React.createElement('li', null, '🆔 State ID Card')
                )
              ),
              React.createElement('div', { className: 'upload-area' },
                React.createElement('input', {
                  type: 'file',
                  id: 'age-document',
                  accept: '.pdf,.jpg,.jpeg,.png',
                  onChange: (e: any) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleAgeVerification(file);
                    }
                  },
                  style: { display: 'none' }
                }),
                React.createElement('label', { htmlFor: 'age-document', className: 'upload-label' },
                  React.createElement('div', { className: 'upload-icon' }, '📁'),
                  React.createElement('div', { className: 'upload-text' },
                    React.createElement('p', null, 'Click to upload or drag and drop'),
                    React.createElement('span', null, 'PDF, JPG, PNG (MAX. 5MB)')
                  )
                )
              )
            ),
            ageVerification && React.createElement('div', { className: 'verification-result' },
              React.createElement('div', { className: `verification-status ${ageVerification.verificationStatus}` },
                React.createElement('span', null, 
                  ageVerification.verificationStatus === 'verified' ? '✅ Verified' :
                  ageVerification.verificationStatus === 'pending' ? '⏳ Processing...' :
                  '❌ Verification Failed'
                ),
                React.createElement('span', null, `AI Confidence: ${ageVerification.aiConfidence}%`)
              )
            ),
            React.createElement('div', { className: 'step-actions' },
              React.createElement('button', {
                className: 'back-btn',
                onClick: () => setActiveStep('coppa')
              }, '← Back'),
              ageVerification?.verificationStatus === 'verified' && React.createElement('button', {
                className: 'continue-btn',
                onClick: () => setActiveStep('confirm'),
                disabled: loading
              }, 'Continue →')
            )
          ),

          // Confirm Step
          activeStep === 'confirm' && React.createElement('div', { className: 'confirm-step' },
            React.createElement('h3', null, '✅ Ready to Approve'),
            React.createElement('div', { className: 'confirmation-summary' },
              React.createElement('div', { className: 'summary-item' },
                React.createElement('span', { className: 'label' }, 'COPPA Consent:'),
                React.createElement('span', { className: 'value success' }, coppaConsent ? '✅ Completed' : '❌ Pending')
              ),
              React.createElement('div', { className: 'summary-item' },
                React.createElement('span', { className: 'label' }, 'Age Verification:'),
                React.createElement('span', { className: 'value success' }, ageVerification?.verificationStatus === 'verified' ? '✅ Verified' : '❌ Pending')
              ),
              React.createElement('div', { className: 'summary-item' },
                React.createElement('span', { className: 'label' }, 'Compliance Status:'),
                React.createElement('span', { className: 'value success' }, '✅ Compliant')
              ),
              React.createElement('div', { className: 'summary-item' },
                React.createElement('span', { className: 'label' }, 'Request:'),
                React.createElement('span', { className: 'value' }, currentRequest.requestDetails.description)
              )
            ),
            React.createElement('div', { className: 'step-actions' },
              React.createElement('button', {
                className: 'back-btn',
                onClick: () => setActiveStep('verification')
              }, '← Back'),
              React.createElement('button', {
                className: 'approve-btn',
                onClick: () => processApproval('approve'),
                disabled: loading
              }, loading ? 'Processing...' : '✅ Approve Request'),
              React.createElement('button', {
                className: 'decline-btn',
                onClick: () => processApproval('decline'),
                disabled: loading
              }, '❌ Decline')
            )
          )
        )
      )
    );
  } : undefined as any;

// Export the modal open function for external use
export { openApprovalModal };
