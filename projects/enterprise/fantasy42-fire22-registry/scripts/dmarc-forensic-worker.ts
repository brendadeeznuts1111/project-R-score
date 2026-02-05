/**
 * Fantasy42-Fire22 DMARC Forensic Worker
 * Advanced security monitoring for DMARC forensic reports (ruf)
 * Handles detailed email authentication failures and security incidents
 */

import { XMLParser } from 'fast-xml-parser';

interface DMARCForensicReport {
  version: string;
  report_metadata: {
    org_name: string;
    email: string;
    extra_contact_info?: string;
    report_id: string;
    date_range: {
      begin: number;
      end: number;
    };
  };
  policy_published: {
    domain: string;
    adkim?: string;
    aspf?: string;
    p: string;
    sp?: string;
    pct?: number;
  };
  record: Array<{
    row: {
      source_ip: string;
      count: number;
      policy_evaluated: {
        disposition: string;
        dkim: string;
        spf: string;
        reason?: Array<{
          type: string;
          comment?: string;
        }>;
      };
    };
    identifiers: {
      header_from: string;
      envelope_from?: string;
      envelope_to?: string;
    };
    auth_results: {
      dkim?: Array<{
        domain: string;
        result: string;
        selector?: string;
        human_result?: string;
      }>;
      spf?: Array<{
        domain: string;
        scope: string;
        result: string;
        human_result?: string;
      }>;
    };
  }>;
}

interface SecurityAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spoofing_attempt' | 'dkim_failure' | 'spf_failure' | 'policy_violation';
  source_ip: string;
  source_domain: string;
  target_domain: string;
  timestamp: number;
  details: string;
  evidence: any;
}

export default {
  async email(message: any, env: any) {
    try {
      console.log('🔍 Processing DMARC Forensic Report');

      // Extract the forensic report from email
      const reportContent = await extractReportContent(message);
      if (!reportContent) {
        console.log('⚠️ No forensic report content found');
        return;
      }

      // Parse XML report
      const forensicReport = await parseForensicReport(reportContent);
      if (!forensicReport) {
        console.log('⚠️ Failed to parse forensic report');
        return;
      }

      // Analyze security incidents
      const securityAlerts = await analyzeSecurityIncidents(forensicReport);

      // Process alerts
      await processSecurityAlerts(securityAlerts, env);

      // Generate forensic summary
      await generateForensicSummary(forensicReport, securityAlerts, env);

      console.log(`✅ Processed forensic report with ${securityAlerts.length} security alerts`);
    } catch (error) {
      console.error('❌ Error processing DMARC forensic report:', error);

      // Alert security team of processing failure
      await alertSecurityTeam(
        'forensic_processing_failure',
        {
          error: error.message,
          timestamp: Date.now(),
          report_id: message.headers.get('report-id') || 'unknown',
        },
        env
      );
    }
  },
};

async function extractReportContent(message: any): Promise<string | null> {
  try {
    // Extract from email body or attachments
    const body = await message.text();

    // Look for XML content in the email
    const xmlMatch = body.match(/<\?xml.*<\/feedback>/s);
    if (xmlMatch) {
      return xmlMatch[0];
    }

    // Check attachments for XML files
    if (message.attachments) {
      for (const attachment of message.attachments) {
        if (attachment.filename?.endsWith('.xml') || attachment.contentType?.includes('xml')) {
          const content = await attachment.text();
          if (content.includes('<feedback>')) {
            return content;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting report content:', error);
    return null;
  }
}

async function parseForensicReport(xmlContent: string): Promise<DMARCForensicReport | null> {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });

    const parsed = parser.parse(xmlContent);

    // Validate it's a DMARC forensic report
    if (!parsed.feedback || !parsed.feedback.record) {
      console.log('Invalid DMARC forensic report format');
      return null;
    }

    return parsed.feedback as DMARCForensicReport;
  } catch (error) {
    console.error('Error parsing forensic report:', error);
    return null;
  }
}

async function analyzeSecurityIncidents(report: DMARCForensicReport): Promise<SecurityAlert[]> {
  const alerts: SecurityAlert[] = [];

  for (const record of report.record) {
    const alert = await analyzeRecord(record, report);
    if (alert) {
      alerts.push(alert);
    }
  }

  return alerts;
}

async function analyzeRecord(
  record: any,
  report: DMARCForensicReport
): Promise<SecurityAlert | null> {
  const sourceIP = record.row.source_ip;
  const count = record.row.count;
  const disposition = record.row.policy_evaluated.disposition;
  const dkimResult = record.row.policy_evaluated.dkim;
  const spfResult = record.row.policy_evaluated.spf;
  const headerFrom = record.identifiers.header_from;

  // High severity: Both DKIM and SPF failed (potential spoofing)
  if (dkimResult === 'fail' && spfResult === 'fail') {
    return {
      severity: 'critical',
      type: 'spoofing_attempt',
      source_ip: sourceIP,
      source_domain: headerFrom,
      target_domain: report.policy_published.domain,
      timestamp: Date.now(),
      details: `Critical: Both DKIM and SPF failed for ${count} messages from ${sourceIP}`,
      evidence: {
        dkim_result: dkimResult,
        spf_result: spfResult,
        disposition,
        message_count: count,
        reasons: record.row.policy_evaluated.reason,
      },
    };
  }

  // Medium severity: DKIM fail with quarantine/reject
  if (dkimResult === 'fail' && ['quarantine', 'reject'].includes(disposition)) {
    return {
      severity: 'high',
      type: 'dkim_failure',
      source_ip: sourceIP,
      source_domain: headerFrom,
      target_domain: report.policy_published.domain,
      timestamp: Date.now(),
      details: `DKIM failure with ${disposition} disposition for ${count} messages`,
      evidence: {
        dkim_result: dkimResult,
        spf_result: spfResult,
        disposition,
        message_count: count,
      },
    };
  }

  // Medium severity: SPF fail with strict policy
  if (spfResult === 'fail' && report.policy_published.p === 'reject') {
    return {
      severity: 'high',
      type: 'spf_failure',
      source_ip: sourceIP,
      source_domain: headerFrom,
      target_domain: report.policy_published.domain,
      timestamp: Date.now(),
      details: `SPF failure with reject policy for ${count} messages`,
      evidence: {
        dkim_result: dkimResult,
        spf_result: spfResult,
        policy: report.policy_published.p,
        message_count: count,
      },
    };
  }

  // Low severity: Policy violations
  if (disposition !== 'none') {
    return {
      severity: 'medium',
      type: 'policy_violation',
      source_ip: sourceIP,
      source_domain: headerFrom,
      target_domain: report.policy_published.domain,
      timestamp: Date.now(),
      details: `Policy violation: ${disposition} for ${count} messages`,
      evidence: {
        disposition,
        dkim_result: dkimResult,
        spf_result: spfResult,
        message_count: count,
      },
    };
  }

  return null;
}

async function processSecurityAlerts(alerts: SecurityAlert[], env: any) {
  // Group alerts by severity
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const highAlerts = alerts.filter(a => a.severity === 'high');
  const mediumAlerts = alerts.filter(a => a.severity === 'medium');

  // Process critical alerts immediately
  for (const alert of criticalAlerts) {
    await handleCriticalAlert(alert, env);
  }

  // Process high alerts
  for (const alert of highAlerts) {
    await handleHighAlert(alert, env);
  }

  // Log medium alerts
  for (const alert of mediumAlerts) {
    await logMediumAlert(alert, env);
  }
}

async function handleCriticalAlert(alert: SecurityAlert, env: any) {
  console.log(`🚨 CRITICAL ALERT: ${alert.details}`);

  // Send immediate security alert
  await sendSecurityAlert(
    {
      ...alert,
      action_required: true,
      escalation_level: 'immediate',
    },
    env
  );

  // Log to security database
  await logToSecurityDatabase(alert, 'critical', env);

  // Trigger automated response if configured
  await triggerAutomatedResponse(alert, env);
}

async function handleHighAlert(alert: SecurityAlert, env: any) {
  console.log(`⚠️ HIGH ALERT: ${alert.details}`);

  // Send security alert
  await sendSecurityAlert(
    {
      ...alert,
      action_required: true,
      escalation_level: 'urgent',
    },
    env
  );

  // Log to security database
  await logToSecurityDatabase(alert, 'high', env);
}

async function logMediumAlert(alert: SecurityAlert, env: any) {
  console.log(`ℹ️ MEDIUM ALERT: ${alert.details}`);

  // Log to security database
  await logToSecurityDatabase(alert, 'medium', env);
}

async function sendSecurityAlert(alert: any, env: any) {
  // Implementation would integrate with your alerting system
  // This could be email, Slack, PagerDuty, etc.
  console.log(`📧 Sending security alert for ${alert.type}`);
}

async function logToSecurityDatabase(alert: SecurityAlert, severity: string, env: any) {
  // Implementation would store in your security database
  console.log(`📊 Logging ${severity} alert to security database`);
}

async function triggerAutomatedResponse(alert: SecurityAlert, env: any) {
  // Implementation could include:
  // - IP blocking
  // - Rate limiting
  // - Additional authentication requirements
  // - Automated incident response
  console.log(`🤖 Triggering automated response for ${alert.type}`);
}

async function generateForensicSummary(
  report: DMARCForensicReport,
  alerts: SecurityAlert[],
  env: any
) {
  const summary = {
    report_id: report.report_metadata.report_id,
    domain: report.policy_published.domain,
    reporting_org: report.report_metadata.org_name,
    date_range: report.report_metadata.date_range,
    total_records: report.record.length,
    total_alerts: alerts.length,
    alert_breakdown: {
      critical: alerts.filter(a => a.severity === 'critical').length,
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
    },
    top_threats: alerts.slice(0, 5).map(a => ({
      type: a.type,
      severity: a.severity,
      source_ip: a.source_ip,
      details: a.details,
    })),
  };

  console.log('📋 Forensic Report Summary:', JSON.stringify(summary, null, 2));

  // Store summary for reporting
  await storeForensicSummary(summary, env);
}

async function storeForensicSummary(summary: any, env: any) {
  // Implementation would store in your reporting database
  console.log('💾 Storing forensic summary');
}

async function alertSecurityTeam(alertType: string, details: any, env: any) {
  // Implementation would alert your security team
  console.log(`🚨 Alerting security team: ${alertType}`);
}

// Export for use as Cloudflare Worker
export {};
