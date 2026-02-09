import { describe, expect, test } from 'bun:test';
import { resolveDomainBranding } from '../scripts/lib/domain-branding';

describe('domain branding resolver', () => {
  test('resolves apex defaults', () => {
    const branding = resolveDomainBranding('factory-wager.com');
    expect(branding.apexDomain).toBe('factory-wager.com');
    expect(branding.subdomain).toBe('@');
    expect(branding.baseSeed).toBe(210);
    expect(branding.offset).toBe(0);
    expect(branding.resolvedSeed).toBe(210);
    expect(branding.palette.primary.startsWith('#')).toBe(true);
  });

  test('applies known subdomain offsets', () => {
    const docs = resolveDomainBranding('docs.factory-wager.com');
    const api = resolveDomainBranding('api.factory-wager.com');
    const status = resolveDomainBranding('status.factory-wager.com');

    expect(docs.offset).toBe(-20);
    expect(docs.resolvedSeed).toBe(190);

    expect(api.offset).toBe(15);
    expect(api.resolvedSeed).toBe(225);

    expect(status.offset).toBe(45);
    expect(status.resolvedSeed).toBe(255);
  });

  test('supports host:port input', () => {
    const branding = resolveDomainBranding('dashboard.factory-wager.com:3099');
    expect(branding.subdomain).toBe('dashboard');
    expect(branding.resolvedSeed).toBe(210);
  });

  test('uses nearest apex label offset for nested subdomains', () => {
    const branding = resolveDomainBranding('v2.api.factory-wager.com');
    expect(branding.subdomain).toBe('v2.api');
    expect(branding.offset).toBe(15);
    expect(branding.resolvedSeed).toBe(225);
  });

  test('falls back to three-part apex for common public suffixes', () => {
    const branding = resolveDomainBranding('api.example.co.uk');
    expect(branding.apexDomain).toBe('example.co.uk');
    expect(branding.subdomain).toBe('api');
  });
});
