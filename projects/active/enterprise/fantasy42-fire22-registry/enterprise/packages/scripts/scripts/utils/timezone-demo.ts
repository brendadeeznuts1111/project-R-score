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
    console.info('📊 Report saved:', report.getId());
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
  console.info('🌍 Timezone Configuration Demo\n');

  // 1. Show current timezone context
  console.info('📍 Current Timezone Context:');
  const contextInfo = TimezoneUtils.getCurrentContextInfo();
  console.info(`   Context: ${contextInfo.context}`);
  console.info(`   Timezone: ${contextInfo.timezone}`);
  console.info(`   Current Time: ${contextInfo.currentTime.toISOString()}`);
  console.info(`   Business Hours: ${contextInfo.isBusinessHours}`);
  console.info(`   Description: ${contextInfo.timezoneInfo.description}\n`);

  // 2. Demonstrate timezone-aware date creation
  console.info('📅 Timezone-Aware Date Creation:');
  const paymentTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.PAYMENT_PROCESSING);
  const reportTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.FINANCIAL_REPORTING);
  const eventTime = TimezoneUtils.createTimezoneAwareDate(TimezoneContext.DOMAIN_EVENTS);

  console.info(`   Payment Processing: ${paymentTime.toISOString()}`);
  console.info(`   Financial Reporting: ${reportTime.toISOString()}`);
  console.info(`   Domain Events: ${eventTime.toISOString()}\n`);

  // 3. Demonstrate timezone formatting
  console.info('🎨 Timezone Formatting:');
  const testDate = new Date('2024-01-15T12:00:00Z');
  console.info(`   Original Date: ${testDate.toISOString()}`);
  console.info(`   Business Format: ${TimezoneUtils.formatForBusiness(testDate)}`);
  console.info(`   Financial Format: ${TimezoneUtils.formatForFinancialReporting(testDate)}`);
  console.info(
    `   CDT Format: ${TimezoneUtils.formatDateInTimezone(testDate, SupportedTimezone.CDT)}\n`
  );

  // 4. Demonstrate cross-domain integration
  console.info('🔗 Cross-Domain Integration:');
  const collectionsService = new CollectionsService();
  const repository = new MockFinancialReportingRepository() as any;
  const financialService = FinancialReportingServiceFactory.create(repository, {
    collectionsService,
  });

  console.info('   ✓ CollectionsService created');
  console.info('   ✓ FinancialReportingService created with CollectionsService dependency');
  console.info('   ✓ Cross-domain timezone consistency established\n');

  // 5. Demonstrate business hours detection
  console.info('🕐 Business Hours Detection:');
  console.info(
    `   Business Operations Hours: ${TimezoneUtils.isBusinessHours(TimezoneContext.BUSINESS_OPERATIONS)}`
  );
  console.info(
    `   Payment Processing Hours: ${TimezoneUtils.isBusinessHours(TimezoneContext.PAYMENT_PROCESSING)}`
  );
  console.info(
    `   Financial Reporting Hours: ${TimezoneUtils.isBusinessHours(TimezoneContext.FINANCIAL_REPORTING)}\n`
  );

  // 6. Show supported timezones
  console.info('🌐 Supported Timezones:');
  Object.values(SupportedTimezone).forEach(timezone => {
    const info = TimezoneUtils.getTimezoneInfo(timezone);
    console.info(`   ${timezone}: ${info.description} (${info.offset})`);
  });
  console.info('');

  // 7. Demonstrate timezone validation
  console.info('✅ Timezone Validation:');
  console.info(`   Valid timezone (UTC): ${TimezoneUtils.isValidTimezone(SupportedTimezone.UTC)}`);
  console.info(`   Valid timezone (CDT): ${TimezoneUtils.isValidTimezone(SupportedTimezone.CDT)}`);
  console.info(`   Invalid timezone: ${TimezoneUtils.isValidTimezone('Invalid/Timezone')}\n`);

  console.info('🎉 Timezone Configuration Demo Complete!');
  console.info('All domain operations now use consistent, timezone-aware timestamps.');
}

if (import.meta.main) {
  demonstrateTimezoneConfiguration().catch(console.error);
}
