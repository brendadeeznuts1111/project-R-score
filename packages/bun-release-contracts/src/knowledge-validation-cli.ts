import { resolve } from 'node:path';
import { normalizeVersion } from './generator.ts';
import {
  validateReleaseKnowledgeDirectory,
  validateReleaseKnowledgeFile,
} from './knowledge-validation-io.ts';
import { writeKnowledgeValidationReports } from './knowledge-validation-report.ts';
import {
  KNOWLEDGE_VALIDATION_REPORT_FORMATS,
  type KnowledgeValidationConfig,
  type KnowledgeValidationReportFormat,
} from './knowledge-validation-types.ts';

export type KnowledgeValidationCliValues = {
  version?: string;
  source?: string;
  catalog: string;
  feeds: string;
  report?: string;
  strict?: boolean;
  maxWarnings?: string;
};

function reportFormat(value: string | undefined): KnowledgeValidationReportFormat {
  const format = value ?? 'console';
  if (!KNOWLEDGE_VALIDATION_REPORT_FORMATS.some(candidate => candidate === format)) {
    throw new Error('--report must be console, json, or junit');
  }
  return format as KnowledgeValidationReportFormat;
}

function validationOverrides(
  values: KnowledgeValidationCliValues
): Partial<KnowledgeValidationConfig> {
  const config: Partial<KnowledgeValidationConfig> = {};
  if (values.strict !== undefined) config.strict = values.strict;
  if (values.maxWarnings !== undefined) {
    const maxWarnings = Number(values.maxWarnings);
    if (!Number.isSafeInteger(maxWarnings) || maxWarnings < 0) {
      throw new Error('--max-warnings must be a non-negative integer');
    }
    config.maxWarnings = maxWarnings;
  }
  return config;
}

export async function runKnowledgeValidationCommand(
  command: string,
  args: string[],
  values: KnowledgeValidationCliValues,
  defaultDirectory: string
): Promise<boolean> {
  if (command !== 'validate' && command !== 'validate-all') return false;
  const format = reportFormat(values.report);
  const options = {
    catalogPath: resolve(values.catalog),
    feedsPath: resolve(values.feeds),
    config: validationOverrides(values),
  };
  if (command === 'validate') {
    if (args.length > 1 || (args.length === 1 && values.version)) {
      throw new Error('validate accepts either <knowledge.json> or --version, not both');
    }
    const inputPath =
      args[0] ??
      (values.version
        ? resolve(defaultDirectory, `bun-v${normalizeVersion(values.version)}.json`)
        : null);
    if (!inputPath) throw new Error('validate requires <knowledge.json> or --version');
    const report = await validateReleaseKnowledgeFile(inputPath, {
      ...options,
      sourcePath: values.source ? resolve(values.source) : undefined,
    });
    writeKnowledgeValidationReports([report], format, true);
    if (!report.valid) process.exitCode = 1;
    return true;
  }
  if (values.version) throw new Error('--version is only valid with build or validate');
  if (values.source) throw new Error('--source is only valid with validate');
  if (args.length > 1) throw new Error('validate-all accepts at most one directory');
  const reports = await validateReleaseKnowledgeDirectory(args[0] ?? defaultDirectory, options);
  writeKnowledgeValidationReports(reports, format, false);
  if (reports.some(report => !report.valid)) process.exitCode = 1;
  return true;
}
