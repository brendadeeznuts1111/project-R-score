/**
 * Test file demonstrating variable naming issues
 * This file contains intentional examples of confusing variable names
 */

// ❌ PROBLEMATIC: High similarity in same scope
function configureAccount(_agent: AccountAgent) {
	const _userProxy = "proxy1.example.com"; // Similar names
	const _userProxies = ["proxy2.example.com"]; // Risk of confusion
	const _usrProxy = "proxy3.example.com"; // Developer typo?

	const _phoneNumber = "+1234567890";
	const _phoneNum = "+0987654321"; // Very similar
	const _phoneNo = "+1122334455"; // Another variant

	const _emailAddress = "user@example.com";
	const _emailAddr = "user2@example.com"; // Abbreviated version
	const _email = "user3@example.com"; // Too generic
}

// ✅ GOOD: Distinct naming
function configureAccountImproved(_agent: AccountAgent) {
	const _primaryProxy = "proxy1.example.com";
	const _backupProxies = ["proxy2.example.com"];
	const _fallbackProxy = "proxy3.example.com";

	const _primaryPhone = "+1234567890";
	const _secondaryPhone = "+0987654321";
	const _emergencyPhone = "+1122334455";

	const _personalEmail = "user@example.com";
	const _workEmail = "user2@company.com";
	const _recoveryEmail = "user3@recovery.com";
}

interface AccountAgent {
	id: string;
	config: any;
}

export { configureAccount, configureAccountImproved };
