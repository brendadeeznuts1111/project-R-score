// agents/tips-system.ts
export interface AgentTips {
  category: string;
  tip: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionRequired: boolean;
  estimatedTime: string; // e.g., "5 minutes"
}

export class AgentTipsManager {
  static generateTipsForAgent(agentType: string, isNew: boolean): AgentTips[] {
    const baseTips = this.getBaseTips();
    const typeSpecificTips = this.getTypeSpecificTips(agentType);
    const newAgentTips = isNew ? this.getNewAgentTips() : [];
    
    return [...baseTips, ...typeSpecificTips, ...newAgentTips].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  private static getBaseTips(): AgentTips[] {
    return [
      {
        category: 'Security',
        tip: 'Use unique passwords for each payment app and enable 2FA',
        priority: 'critical',
        actionRequired: true,
        estimatedTime: '10 minutes'
      },
      {
        category: 'Security',
        tip: 'Regularly rotate API keys and access tokens',
        priority: 'high',
        actionRequired: true,
        estimatedTime: '5 minutes monthly'
      },
      {
        category: 'Operations',
        tip: 'Maintain consistent transaction patterns - avoid sudden large transfers',
        priority: 'high',
        actionRequired: true,
        estimatedTime: 'Ongoing'
      },
      {
        category: 'Social',
        tip: 'Post occasional updates on social media to maintain account authenticity',
        priority: 'medium',
        actionRequired: true,
        estimatedTime: '5 minutes weekly'
      },
      {
        category: 'Communication',
        tip: 'Regularly send/receive SMS to maintain phone number activity',
        priority: 'medium',
        actionRequired: true,
        estimatedTime: '2 minutes daily'
      }
    ];
  }
  
  private static getTypeSpecificTips(agentType: string): AgentTips[] {
    const tips: { [key: string]: AgentTips[] } = {
      'payment-ops': [
        {
          category: 'Payments',
          tip: 'Keep Venmo/CashApp balances under $1000 to avoid scrutiny',
          priority: 'high',
          actionRequired: true,
          estimatedTime: 'Immediate'
        },
        {
          category: 'Payments',
          tip: 'Use multiple small transactions instead of one large one',
          priority: 'high',
          actionRequired: true,
          estimatedTime: 'Ongoing'
        },
        {
          category: 'Payments',
          tip: 'Link payment apps to the provided phone number, not personal numbers',
          priority: 'critical',
          actionRequired: true,
          estimatedTime: '5 minutes'
        }
      ],
      'phone-intel': [
        {
          category: 'Communication',
          tip: 'Use encrypted messaging for sensitive communications',
          priority: 'critical',
          actionRequired: true,
          estimatedTime: '5 minutes'
        },
        {
          category: 'Security',
          tip: 'Never share actual location in SMS or social posts',
          priority: 'high',
          actionRequired: true,
          estimatedTime: 'Ongoing'
        },
        {
          category: 'Operations',
          tip: 'Maintain call/SMS logs consistent with timezone',
          priority: 'medium',
          actionRequired: true,
          estimatedTime: 'Ongoing'
        }
      ],
      'social-ops': [
        {
          category: 'Social',
          tip: 'Gradually build followers over weeks, not all at once',
          priority: 'high',
          actionRequired: true,
          estimatedTime: 'Ongoing'
        },
        {
          category: 'Social',
          tip: 'Mix professional and casual content for authenticity',
          priority: 'medium',
          actionRequired: true,
          estimatedTime: '10 minutes weekly'
        },
        {
          category: 'Social',
          tip: 'Connect with other team members on professional networks',
          priority: 'low',
          actionRequired: false,
          estimatedTime: '5 minutes'
        }
      ]
    };
    
    return tips[agentType] || [];
  }
  
  private static getNewAgentTips(): AgentTips[] {
    return [
      {
        category: 'Onboarding',
        tip: 'Complete first transaction within 24 hours to establish account',
        priority: 'critical',
        actionRequired: true,
        estimatedTime: '5 minutes'
      },
      {
        category: 'Onboarding',
        tip: 'Add profile picture to all social/payment accounts',
        priority: 'high',
        actionRequired: true,
        estimatedTime: '10 minutes'
      },
      {
        category: 'Onboarding',
        tip: 'Make initial small transactions between team accounts',
        priority: 'high',
        actionRequired: true,
        estimatedTime: '15 minutes'
      },
      {
        category: 'Onboarding',
        tip: 'Verify email and phone on all platforms immediately',
        priority: 'critical',
        actionRequired: true,
        estimatedTime: '20 minutes'
      }
    ];
  }
  
  // Generate a checklist for agent setup
  static generateSetupChecklist(agentId: string): string {
    return `# Agent Setup Checklist: ${agentId}
## Phase 1: Immediate (Day 1)
- [ ] Verify email address on all platforms
- [ ] Verify phone number for SMS/2FA
- [ ] Set up unique passwords + 2FA
- [ ] Complete first small transaction ($5-20)
- [ ] Add profile picture

## Phase 2: First Week
- [ ] Make 3-5 transactions across different platforms
- [ ] Send 10+ SMS messages
- [ ] Make 2-3 social media posts
- [ ] Connect with 5+ colleagues on LinkedIn

## Phase 3: Ongoing (Monthly)
- [ ] Rotate passwords
- [ ] Review transaction patterns
- [ ] Update social profiles
- [ ] Backup account credentials

## Red Flags to Avoid
❌ Don't make transactions over $500 in first month
❌ Don't link personal bank accounts
❌ Don't use same device for multiple agents
❌ Don't post location or sensitive info

## Success Metrics
✅ Daily SMS activity
✅ Weekly transactions
✅ Monthly social engagement
✅ Quarterly security review`;
  }
  
  // Generate risk assessment for new agents
  static assessNewAgentRisk(agentProfile: any): {
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    recommendations: string[];
  } {
    const factors = [];
    const recommendations = [];
    
    // Risk factors
    if (agentProfile.allAccountsNew) factors.push('All accounts are newly created');
    if (agentProfile.sameDevice) factors.push('Multiple agents on same device/IP');
    if (agentProfile.noTransactionHistory) factors.push('No existing transaction history');
    if (agentProfile.identicalPatterns) factors.push('Transaction patterns identical to other agents');
    
    // Recommendations based on risks
    if (factors.includes('All accounts are newly created')) {
      recommendations.push('Gradually build account history over 30 days');
      recommendations.push('Start with small transactions ($1-10)');
    }
    
    if (factors.includes('Multiple agents on same device/IP')) {
      recommendations.push('Use separate Android VM instances');
      recommendations.push('Use VPNs with different endpoints');
    }
    
    // Calculate risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (factors.length >= 3) riskLevel = 'high';
    else if (factors.length >= 1) riskLevel = 'medium';
    
    return {
      riskLevel,
      factors,
      recommendations
    };
  }
}
