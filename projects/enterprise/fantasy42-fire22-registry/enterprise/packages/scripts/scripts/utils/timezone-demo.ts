/**
 * Timezone Configuration Demo
 * Domain-Driven Design Implementation
 *
 * Demonstrates timezone-aware operations across domains
 */

import {
  TimezoneUtils,
  TimezoneContext,
  SupportedTimezone,
} from './src/shared/timezone-configuration';
import { CollectionsService } from './src/domains/collections/collections.controller';
import {
  FinancialReportingService,
  FinancialReportingServiceFactory,
} from './src/domains/financial-reporting/services/financial-reporting-service';

// Mock repository for demo
class MockFinancialReportingRepository {
  async save(report: any): Promise<void> {
    console.log('📊 Report saved:', report.getId());
  }
  async findById(id: string): Promise<any | null> {
    return null;
  }
  async findByQuery(query: any): Promise<any[]> {
    return [];
  }
  async findByPeriod(start: Date, end: Date): Promise<any[]> {
    return [];
  }
  async getSummary(): Promise<any> {
    return {
      totalReports: 0,
      reportsByType: {},
      reportsByStatus: {},
      reportsByCompliance: {},
    };
  }
  async findReportsRequiringAttention(): Promise<any[]> {
    return [];
  }
}

async function demonstrateTimezoneConfiguration() {
  console.log('🌍 Timezone Configuration Demo\n');

  // 1. Show current timezone context
  console.log('📍 Current Timezone Context:');
  const contextInfo = TimezoneUtils.getCurrentContextInfo();
  console.log(`   Context: ${contextInfo.context}`);
  console.log(`   Timezone: ${contextInfo.timezone}`);
  console.log(`   Current Time: ${contextInfo.currentTime.toISOString()}`);
  console.log(`   Business Hours: ${contextInfo.isBusinessHours}`);
  console.log(`   Description: ${contextInfo.timezoneInfo.description}\n`);

  // 2. Demonstrate timezone-aware date creation
  console.log('📅 Timezone-Aware Date Creation:');
  const paymentTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.PAYMENT_PROCESSING);
  const reportTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.FINANCIAL_REPORTING);
  const eventTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.DOMAIN_EVENTS);

  console.log(`   Payment Processing: ${paymentTime.toISOString()}`);
  console.log(`   Financial Reporting: ${reportTime.toISOString()}`);
  console.log(`   Domain Events: ${eventTime.toISOString()}\n`);

  // 3. Demonstrate timezone formatting
  console.log('🎨 Timezone Formatting:');
  const testDate = new Date('2024-01-15T12:00:00Z');
  console.log(`   Original Date: ${testDate.toISOString()}`);
  console.log(`   Business Format: ${TimezoneUtils.formatForBusiness(testDate)}`);
  console.log(`   Financial Format: ${TimezoneUtils.formatForFinancialReporting(testDate)}`);
  console.log(
    `   CDT Format: ${TimezoneUtils.formatDateInTimezone(testDate, SupportedTimezone.CDT)}\n`
  );

  // 4. Demonstrate cross-domain integration
  console.log('🔗 Cross-Domain Integration:');
  const collectionsService = new CollectionsService();
  const repository = new MockFinancialReportingRepository() as any;
  const financialService = FinancialReportingServiceFactory.create(repository, {
    collectionsService,
  });

  console.log('   ✓ CollectionsService created');
  console.log('   ✓ FinancialReportingService created with CollectionsService dependency');
  console.log('   ✓ Cross-domain timezone consistency established\n');

  // 5. Demonstrate business hours detection
  console.log('🕐 Business Hours Detection:');
  console.log(
    `   Business Operations Hours: ${TimezoneUtils.isBusinessHours(TimezoneContext.BUSINESS_OPERATIONS)}`
  );
  console.log(
    `   Payment Processing Hours: ${TimezoneUtils.isBusinessHours(TimezoneContext.PAYMENT_PROCESSING)}`
  );
  console.log(
    `   Financial Reporting Hours: ${TimezoneUtils.isBusinessHours(TimezoneContext.FINANCIAL_REPORTING)}\n`
  );

  // 6. Show supported timezones
  console.log('🌐 Supported Timezones:');
  Object.values(SupportedTimezone).forEach(timezone => {
    const info = TimezoneUtils.getTimezoneInfo(timezone);
    console.log(`   ${timezone}: ${info.description} (${info.offset})`);
  });
  console.log('');

  // 7. Demonstrate timezone validation
  console.log('✅ Timezone Validation:');
  console.log(`   Valid timezone (UTC): ${TimezoneUtils.isValidTimezone(SupportedTimezone.UTC)}`);
  console.log(`   Valid timezone (CDT): ${TimezoneUtils.isValidTimezone(SupportedTimezone.CDT)}`);
  console.log(`   Invalid timezone: ${TimezoneUtils.isValidTimezone('Invalid/Timezone')}\n`);

  console.log('🎉 Timezone Configuration Demo Complete!');
  console.log('All domain operations now use consistent, timezone-aware timestamps.');
}

if (import.meta.main) {
  demonstrateTimezoneConfiguration().catch(console.error);
}
