/**
 * @domain session
 * @module lib/types/branded/session.ts
 *
 * Session / request lifecycle brands.
 * Mint: system-internal (session factories, request middleware) + wire (parse).
 * Pattern (isomorphic): type + as* + try* + parse* + BRAND_SPECS entry.
 */

import { defineBrandConstructors, type BrandSpec, type BrandedString } from './_core.ts';

export type SessionId = BrandedString<'SessionId'>;
export type TerminalId = BrandedString<'TerminalId'>;
export type RequestId = BrandedString<'RequestId'>;
export type CorrelationId = BrandedString<'CorrelationId'>;
export type SnapshotId = BrandedString<'SnapshotId'>;

const session = defineBrandConstructors('SessionId');
const terminal = defineBrandConstructors('TerminalId');
const request = defineBrandConstructors('RequestId');
const correlation = defineBrandConstructors('CorrelationId');
const snapshot = defineBrandConstructors('SnapshotId');

export const asSessionId = session.as;
export const trySessionId = session.try;
export const parseSessionId = session.parse;

export const asTerminalId = terminal.as;
export const tryTerminalId = terminal.try;
export const parseTerminalId = terminal.parse;

export const asRequestId = request.as;
export const tryRequestId = request.try;
export const parseRequestId = request.parse;

export const asCorrelationId = correlation.as;
export const tryCorrelationId = correlation.try;
export const parseCorrelationId = correlation.parse;

export const asSnapshotId = snapshot.as;
export const trySnapshotId = snapshot.try;
export const parseSnapshotId = snapshot.parse;

/** Machine-readable capability table for this domain. */
export const SESSION_BRAND_SPECS = [
  {
    name: 'SessionId',
    domain: 'session',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'user-input', 'wire-input'],
    description: 'Interactive terminal / agent session identity',
  },
  {
    name: 'TerminalId',
    domain: 'session',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'PTY / terminal instance identity',
  },
  {
    name: 'RequestId',
    domain: 'session',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'HTTP or RPC request correlation handle',
  },
  {
    name: 'CorrelationId',
    domain: 'session',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Cross-service distributed trace correlation',
  },
  {
    name: 'SnapshotId',
    domain: 'session',
    tiers: ['as', 'try', 'parse'],
    mint: ['system-internal', 'wire-input'],
    description: 'Point-in-time state snapshot identity',
  },
] as const satisfies readonly BrandSpec[];
