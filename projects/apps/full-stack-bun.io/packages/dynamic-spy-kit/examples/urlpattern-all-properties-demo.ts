#!/usr/bin/env bun
/**
 * @dynamic-spy/kit v9.0 - Complete URLPattern Properties Demo
 * 
 * Demonstrates ALL 8 URLPattern properties:
 * protocol, username, password, hostname, port, pathname, search, hash
 */

import { URLPatternSpyFactory } from '../src/core/urlpattern-spy';

// Mock API
const api = {
	fetchSecureOdds: (url: string, market: string, token: string) => {
		console.log(`[API] Fetching secure odds: ${url} | Market: ${market} | Token: ${token}`);
		return { odds: 1.95, market, token };
	}
};

console.log('🔐 COMPLETE URLPattern PROPERTIES DEMO\n');

// FULL URLPatternInit with ALL 8 properties
const completeSpy = URLPatternSpyFactory.create(api, 'fetchSecureOdds', {
	protocol: 'https:',
	username: 'vip',
	password: 'secret123',
	hostname: 'secure.pinnacle.com',
	port: '8443',
	pathname: '/secure/vip/odds/:market',
	search: '?token=:token&expires=:expires',
	hash: '#authenticated'
});

console.log('✅ Complete spy created with ALL 8 properties\n');

// Test URL with ALL components
const testUrl = 'https://vip:secret123@secure.pinnacle.com:8443/secure/vip/odds/BTC-USD?token=abc123&expires=3600#authenticated';

console.log('🧪 Testing URL:');
console.log(`   ${testUrl}\n`);

// Test pattern matching
const testResult = completeSpy.test(testUrl);
console.log(`✅ Pattern test: ${testResult ? 'MATCH' : 'NO MATCH'}\n`);

// LIVE EXECUTION - Extract ALL properties
const result = completeSpy.exec(testUrl);

if (result) {
	console.log('📋 ALL 8 PROPERTIES EXTRACTED:\n');
	// Bun's URLPattern uses 'input' property
	const protocolVal = (result.protocol as any)?.input || '';
	const usernameVal = (result.username as any)?.input || '';
	const passwordVal = (result.password as any)?.input || '';
	const hostnameVal = (result.hostname as any)?.input || '';
	const portVal = (result.port as any)?.input || '';
	const pathnameVal = (result.pathname as any)?.input || '';
	const searchVal = (result.search as any)?.input || '';
	const hashVal = (result.hash as any)?.input || '';
	
	console.log(`  🔒 protocol:  ${protocolVal.padEnd(30)} // "${protocolVal}"`);
	console.log(`  👤 username:  ${usernameVal.padEnd(30)} // "${usernameVal}"`);
	console.log(`  🔑 password:  ${passwordVal.padEnd(30)} // "${passwordVal}"`);
	console.log(`  🌐 hostname:  ${hostnameVal.padEnd(30)} // "${hostnameVal}"`);
	console.log(`  ⚠️  port:     ${portVal.padEnd(30)} // "${portVal}"`);
	console.log(`  📁 pathname:  ${pathnameVal.padEnd(30)} // "${pathnameVal}"`);
	console.log(`  🔍 search:    ${searchVal.padEnd(30)} // "${searchVal}"`);
	console.log(`  #️⃣  hash:     ${hashVal.padEnd(30)} // "${hashVal}"`);
	
	console.log('\n🎯 NAMED GROUPS EXTRACTED:\n');
	const pathnameGroups = (result.pathname as any)?.groups || {};
	const searchGroups = (result.search as any)?.groups || {};
	if (pathnameGroups && Object.keys(pathnameGroups).length > 0) {
		console.log(`  📁 pathname.groups.market:  ${pathnameGroups.market || 'N/A'}`);
	}
	if (searchGroups && Object.keys(searchGroups).length > 0) {
		console.log(`  🔍 search.groups.token:     ${searchGroups.token || 'N/A'}`);
		console.log(`  🔍 search.groups.expires:   ${searchGroups.expires || 'N/A'}`);
	}
	
	console.log('\n✅ ALL 8 URLPattern properties successfully extracted!');
} else {
	console.log('❌ Pattern did not match');
}

// Demonstrate spy verification (call the spy first)
console.log('\n🔍 SPY VERIFICATION:');
try {
	// Call the spy method first
	api.fetchSecureOdds(testUrl, 'BTC-USD', 'abc123');
	const verifiedResult = completeSpy.verify(testUrl);
	console.log('✅ Spy verified - pattern matched and spy was called');
	const verifiedPathname = (verifiedResult.pathname as any)?.input || '';
	console.log(`   Verified pathname: ${verifiedPathname}`);
} catch (error: any) {
	console.log(`⚠️  Verification: ${error.message}`);
}

// Show pattern properties
console.log('\n📊 PATTERN PROPERTIES:');
const spyProtocol = String(completeSpy.protocol?.value || completeSpy.protocol || '');
const spyUsername = String(completeSpy.username?.value || completeSpy.username || '');
const spyPassword = String(completeSpy.password?.value || completeSpy.password || '');
const spyHostname = String(completeSpy.hostname?.value || completeSpy.hostname || '');
const spyPort = String(completeSpy.port?.value || completeSpy.port || '');
const spyPathname = String(completeSpy.pathname?.value || completeSpy.pathname || '');
const spySearch = String(completeSpy.search?.value || completeSpy.search || '');
const spyHash = String(completeSpy.hash?.value || completeSpy.hash || '');

console.log(`  protocol:  ${spyProtocol}`);
console.log(`  username:  ${spyUsername}`);
console.log(`  password:  ${spyPassword}`);
console.log(`  hostname:  ${spyHostname}`);
console.log(`  port:      ${spyPort}`);
console.log(`  pathname:  ${spyPathname}`);
console.log(`  search:    ${spySearch}`);
console.log(`  hash:      ${spyHash}`);

console.log('\n🏆 Complete URLPattern demo - ALL 8 properties working!');

