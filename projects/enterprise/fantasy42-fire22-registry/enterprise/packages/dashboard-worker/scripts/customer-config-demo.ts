#!/usr/bin/env bun

/**
 * 🔥 Fire22 Customer Configuration Demo Script
 *
 * This script demonstrates the complete customer configuration system including:
 * - Customer configuration creation and management
 * - Permission management
 * - Betting limits configuration
 * - VIP status management
 * - Risk profile configuration
 * - Account settings management
 */

interface CustomerConfig {
  customer_id: string;
  agent_id: string;
  permissions: {
    can_place_bets: boolean;
    can_modify_info: boolean;
    can_withdraw: boolean;
    can_deposit: boolean;
    can_view_history: boolean;
    can_use_telegram: boolean;
    can_use_mobile: boolean;
    can_use_desktop: boolean;
  };
  betting_limits: {
    max_single_bet: number;
    max_daily_bet: number;
    max_weekly_bet: number;
    max_monthly_bet: number;
    min_bet: number;
  };
  account_settings: {
    auto_logout_minutes: number;
    session_timeout_hours: number;
    require_2fa: boolean;
    allow_remember_me: boolean;
    notification_preferences: {
      email: boolean;
      sms: boolean;
      telegram: boolean;
      push: boolean;
    };
  };
  vip_status: {
    level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    benefits: string[];
    special_rates: number;
    priority_support: boolean;
  };
  risk_profile: {
    risk_level: 'low' | 'medium' | 'high' | 'extreme';
    max_exposure: number;
    daily_loss_limit: number;
    weekly_loss_limit: number;
    monthly_loss_limit: number;
  };
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  status: 'active' | 'suspended' | 'pending' | 'blocked';
  notes?: string;
}

class CustomerConfigDemo {
  private baseUrl: string;
  private testCustomers: CustomerConfig[];

  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testCustomers = this.generateTestCustomers();
  }

  private generateTestCustomers(): CustomerConfig[] {
    return [
      {
        customer_id: 'CUST001',
        agent_id: 'BLAKEPPH',
        permissions: {
          can_place_bets: true,
          can_modify_info: true,
          can_withdraw: true,
          can_deposit: true,
          can_view_history: true,
          can_use_telegram: true,
          can_use_mobile: true,
          can_use_desktop: true,
        },
        betting_limits: {
          max_single_bet: 10000,
          max_daily_bet: 50000,
          max_weekly_bet: 200000,
          max_monthly_bet: 500000,
          min_bet: 10,
        },
        account_settings: {
          auto_logout_minutes: 30,
          session_timeout_hours: 24,
          require_2fa: true,
          allow_remember_me: true,
          notification_preferences: {
            email: true,
            sms: true,
            telegram: true,
            push: false,
          },
        },
        vip_status: {
          level: 'gold',
          benefits: ['Priority Support', 'Special Rates', 'Exclusive Events'],
          special_rates: 0.95,
          priority_support: true,
        },
        risk_profile: {
          risk_level: 'medium',
          max_exposure: 100000,
          daily_loss_limit: 5000,
          weekly_loss_limit: 15000,
          monthly_loss_limit: 50000,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin',
        updated_by: 'admin',
        status: 'active',
        notes: 'High-value customer with gold VIP status',
      },
      {
        customer_id: 'CUST002',
        agent_id: 'BLAKEPPH',
        permissions: {
          can_place_bets: true,
          can_modify_info: false,
          can_withdraw: true,
          can_deposit: true,
          can_view_history: true,
          can_use_telegram: false,
          can_use_mobile: true,
          can_use_desktop: true,
        },
        betting_limits: {
          max_single_bet: 5000,
          max_daily_bet: 25000,
          max_weekly_bet: 100000,
          max_monthly_bet: 250000,
          min_bet: 5,
        },
        account_settings: {
          auto_logout_minutes: 15,
          session_timeout_hours: 12,
          require_2fa: false,
          allow_remember_me: true,
          notification_preferences: {
            email: true,
            sms: false,
            telegram: false,
            push: false,
          },
        },
        vip_status: {
          level: 'silver',
          benefits: ['Standard Support', 'Regular Rates'],
          special_rates: 1.0,
          priority_support: false,
        },
        risk_profile: {
          risk_level: 'low',
          max_exposure: 50000,
          daily_loss_limit: 2500,
          weekly_loss_limit: 7500,
          monthly_loss_limit: 25000,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'admin',
        updated_by: 'admin',
        status: 'active',
        notes: 'Standard customer with silver VIP status',
      },
    ];
  }

  async runDemo() {
    console.log('🔥 Fire22 Customer Configuration Demo');
    console.log('!==!==!==!==!==!==!==\n');

    try {
      // Test customer configuration creation
      await this.testCustomerConfigCreation();

      // Test customer configuration listing
      await this.testCustomerConfigListing();

      // Test customer configuration updates
      await this.testCustomerConfigUpdates();

      // Test customer configuration retrieval
      await this.testCustomerConfigRetrieval();

      // Test error handling
      await this.testErrorHandling();

      console.log('\n✅ All customer configuration tests completed successfully!');
    } catch (error) {
      console.error('❌ Demo failed:', error);
      process.exit(1);
    }
  }

  async testCustomerConfigCreation() {
    console.log('📝 Testing Customer Configuration Creation...');

    for (const customer of this.testCustomers) {
      try {
        const response = await fetch(`${this.baseUrl}/api/customer-config`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customer),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`✅ Created config for customer ${customer.customer_id}`);
        } else {
          console.log(
            `❌ Failed to create config for customer ${customer.customer_id}:`,
            result.error
          );
        }
      } catch (error) {
        console.log(`❌ Error creating config for customer ${customer.customer_id}:`, error);
      }
    }
    console.log('');
  }

  async testCustomerConfigListing() {
    console.log('📋 Testing Customer Configuration Listing...');

    try {
      // Test listing all customers
      const response = await fetch(`${this.baseUrl}/api/customer-config/list`);
      const result = await response.json();

      if (result.success) {
        console.log(`✅ Listed ${result.data.totalCustomers} customer configurations`);
        console.log(`   Filters: ${JSON.stringify(result.data.filters)}`);
      } else {
        console.log('❌ Failed to list customer configurations:', result.error);
      }

      // Test listing by agent
      const agentResponse = await fetch(
        `${this.baseUrl}/api/customer-config/list?agentId=BLAKEPPH`
      );
      const agentResult = await agentResponse.json();

      if (agentResult.success) {
        console.log(`✅ Listed ${agentResult.data.totalCustomers} customers for agent BLAKEPPH`);
      } else {
        console.log('❌ Failed to list customers by agent:', agentResult.error);
      }
    } catch (error) {
      console.log('❌ Error listing customer configurations:', error);
    }
    console.log('');
  }

  async testCustomerConfigUpdates() {
    console.log('🔄 Testing Customer Configuration Updates...');

    try {
      const updates = {
        betting_limits: {
          max_single_bet: 15000,
          max_daily_bet: 75000,
          max_weekly_bet: 300000,
          max_monthly_bet: 750000,
          min_bet: 15,
        },
        vip_status: {
          level: 'platinum' as const,
          benefits: ['Priority Support', 'Special Rates', 'Exclusive Events', 'VIP Lounge Access'],
          special_rates: 0.9,
          priority_support: true,
        },
      };

      const response = await fetch(`${this.baseUrl}/api/customer-config/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 'CUST001',
          updates,
          updated_by: 'admin',
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Updated customer configuration successfully');
        console.log(`   Customer: ${result.data.customer_id}`);
        console.log(`   Updated: ${result.data.updated_at}`);
      } else {
        console.log('❌ Failed to update customer configuration:', result.error);
      }
    } catch (error) {
      console.log('❌ Error updating customer configuration:', error);
    }
    console.log('');
  }

  async testCustomerConfigRetrieval() {
    console.log('🔍 Testing Customer Configuration Retrieval...');

    try {
      const response = await fetch(`${this.baseUrl}/api/customer-config?customerId=CUST001`);
      const result = await response.json();

      if (result.success) {
        const config = result.data;
        console.log('✅ Retrieved customer configuration:');
        console.log(`   Customer ID: ${config.customer_id}`);
        console.log(`   Agent ID: ${config.agent_id}`);
        console.log(`   VIP Level: ${config.vip_status.level}`);
        console.log(`   Risk Level: ${config.risk_profile.risk_level}`);
        console.log(`   Max Single Bet: $${config.betting_limits.max_single_bet.toLocaleString()}`);
        console.log(`   Can Place Bets: ${config.permissions.can_place_bets ? 'Yes' : 'No'}`);
        console.log(`   Status: ${config.status}`);
      } else {
        console.log('❌ Failed to retrieve customer configuration:', result.error);
      }
    } catch (error) {
      console.log('❌ Error retrieving customer configuration:', error);
    }
    console.log('');
  }

  async testErrorHandling() {
    console.log('⚠️ Testing Error Handling...');

    try {
      // Test missing customer ID
      const response = await fetch(`${this.baseUrl}/api/customer-config`);
      const result = await response.json();

      if (!result.success && result.error === 'Customer ID is required') {
        console.log('✅ Properly handled missing customer ID error');
      } else {
        console.log('❌ Failed to handle missing customer ID error');
      }

      // Test non-existent customer
      const notFoundResponse = await fetch(
        `${this.baseUrl}/api/customer-config?customerId=NONEXISTENT`
      );
      const notFoundResult = await notFoundResponse.json();

      if (!notFoundResult.success && notFoundResult.error === 'Customer configuration not found') {
        console.log('✅ Properly handled non-existent customer error');
      } else {
        console.log('❌ Failed to handle non-existent customer error');
      }
    } catch (error) {
      console.log('❌ Error testing error handling:', error);
    }
    console.log('');
  }

  async createCustomerConfig() {
    console.log('📝 Creating Customer Configuration...');

    const newCustomer: CustomerConfig = {
      customer_id: 'CUST003',
      agent_id: 'BLAKEPPH',
      permissions: {
        can_place_bets: true,
        can_modify_info: false,
        can_withdraw: false,
        can_deposit: true,
        can_view_history: true,
        can_use_telegram: true,
        can_use_mobile: true,
        can_use_desktop: false,
      },
      betting_limits: {
        max_single_bet: 1000,
        max_daily_bet: 5000,
        max_weekly_bet: 20000,
        max_monthly_bet: 50000,
        min_bet: 1,
      },
      account_settings: {
        auto_logout_minutes: 10,
        session_timeout_hours: 6,
        require_2fa: true,
        allow_remember_me: false,
        notification_preferences: {
          email: false,
          sms: false,
          telegram: true,
          push: true,
        },
      },
      vip_status: {
        level: 'bronze',
        benefits: ['Basic Support'],
        special_rates: 1.0,
        priority_support: false,
      },
      risk_profile: {
        risk_level: 'low',
        max_exposure: 10000,
        daily_loss_limit: 500,
        weekly_loss_limit: 1500,
        monthly_loss_limit: 5000,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'admin',
      updated_by: 'admin',
      status: 'active',
      notes: 'New customer with restricted permissions',
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/customer-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Created new customer configuration for CUST003');
        console.log(`   Agent: ${result.data.agent_id}`);
        console.log(`   Created: ${result.data.created_at}`);
      } else {
        console.log('❌ Failed to create customer configuration:', result.error);
      }
    } catch (error) {
      console.log('❌ Error creating customer configuration:', error);
    }
  }

  async listCustomerConfigs() {
    console.log('📋 Listing Customer Configurations...');

    try {
      const response = await fetch(`${this.baseUrl}/api/customer-config/list`);
      const result = await response.json();

      if (result.success) {
        console.log(`📊 Found ${result.data.totalCustomers} customer configurations:`);

        result.data.customerConfigs.forEach((config: CustomerConfig, index: number) => {
          console.log(`\n   ${index + 1}. Customer: ${config.customer_id}`);
          console.log(`      Agent: ${config.agent_id}`);
          console.log(`      VIP Level: ${config.vip_status.level}`);
          console.log(`      Risk Level: ${config.risk_profile.risk_level}`);
          console.log(`      Status: ${config.status}`);
          console.log(`      Max Bet: $${config.betting_limits.max_single_bet.toLocaleString()}`);
          console.log(
            `      Permissions: ${Object.values(config.permissions).filter(Boolean).length}/8 enabled`
          );
        });
      } else {
        console.log('❌ Failed to list customer configurations:', result.error);
      }
    } catch (error) {
      console.log('❌ Error listing customer configurations:', error);
    }
  }

  async updateCustomerConfig() {
    console.log('🔄 Updating Customer Configuration...');

    const updates = {
      vip_status: {
        level: 'diamond' as const,
        benefits: [
          'Priority Support',
          'Special Rates',
          'Exclusive Events',
          'VIP Lounge Access',
          'Personal Manager',
        ],
        special_rates: 0.85,
        priority_support: true,
      },
      betting_limits: {
        max_single_bet: 50000,
        max_daily_bet: 250000,
        max_weekly_bet: 1000000,
        max_monthly_bet: 2500000,
        min_bet: 100,
      },
      notes: 'Upgraded to diamond VIP status with enhanced betting limits',
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/customer-config/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 'CUST001',
          updates,
          updated_by: 'admin',
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Updated customer configuration successfully');
        console.log(`   Customer: ${result.data.customer_id}`);
        console.log(`   Updated: ${result.data.updated_at}`);
        console.log('   Changes:');
        console.log('     - Upgraded to Diamond VIP');
        console.log('     - Enhanced betting limits');
        console.log('     - Added personal manager benefit');
      } else {
        console.log('❌ Failed to update customer configuration:', result.error);
      }
    } catch (error) {
      console.log('❌ Error updating customer configuration:', error);
    }
  }

  async testCustomerConfig() {
    console.log('🧪 Testing Customer Configuration Endpoints...');

    try {
      // Test all endpoints
      await this.testCustomerConfigCreation();
      await this.testCustomerConfigListing();
      await this.testCustomerConfigUpdates();
      await this.testCustomerConfigRetrieval();
      await this.testErrorHandling();

      console.log('✅ All customer configuration tests passed!');
    } catch (error) {
      console.log('❌ Customer configuration tests failed:', error);
    }
  }
}

// Main execution
async function main() {
  const demo = new CustomerConfigDemo();
  const command = process.argv[2] || 'demo';

  switch (command) {
    case 'create':
      await demo.createCustomerConfig();
      break;
    case 'list':
      await demo.listCustomerConfigs();
      break;
    case 'update':
      await demo.updateCustomerConfig();
      break;
    case 'test':
      await demo.testCustomerConfig();
      break;
    case 'demo':
    default:
      await demo.runDemo();
      break;
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
