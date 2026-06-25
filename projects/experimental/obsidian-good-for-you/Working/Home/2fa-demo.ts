// Demonstration of 2FA phone verification with error handling and fallback
import { APIAppleIDCreator, AppleIDErrorCodes } from './readmeauth';

async function demonstrate2FAVerification() {
  console.info('🔐 Demonstrating 2FA Phone Verification with Error Handling\n');

  const creator = new APIAppleIDCreator({
    enableLogging: true,
    maxRetries: 3
  }, '73.45.123.67');

  const phoneNumber = '+1-555-123-4567';

  try {
    console.info('📱 Step 1: Sending verification code...');
    const verification = await creator.sendPhoneVerificationCode(phoneNumber);
    
    console.info('✅ Verification code sent successfully!');
    console.info(`📧 Method: ${verification.method}`);
    console.info(`📱 Destination: ${verification.destination}`);
    console.info(`🔢 Code length: ${verification.codeLength}`);
    console.info(`⏰ Expires at: ${verification.expiresAt.toISOString()}`);
    console.info(`🔄 Attempts remaining: ${verification.attemptsRemaining}/${verification.maxAttempts}`);

    // Simulate user entering code
    console.info('\n🔤 Step 2: Simulating user code entry...');
    
    // Test cases for different scenarios
    const testCases = [
      { code: '123456', description: 'Valid code format' },
      { code: '123', description: 'Invalid code length' },
      { code: 'abcdef', description: 'Non-numeric code' },
      { code: '', description: 'Empty code' }
    ];

    for (const testCase of testCases) {
      console.info(`\n🧪 Testing: ${testCase.description}`);
      
      try {
        const result = await creator.verifyPhoneCode(phoneNumber, testCase.code);
        
        if (result.success) {
          console.info('✅ Verification successful!');
          console.info(`🔓 Verified: ${result.verified}`);
          console.info(`📱 Method: ${result.method}`);
          console.info(`🔄 Remaining attempts: ${result.remainingAttempts}`);
        }
        
      } catch (error: any) {
        console.info(`❌ Error: ${error.message}`);
        console.info(`🔧 Error Code: ${error.code}`);
        console.info(`🔄 Retryable: ${error.retryable}`);
        console.info(`🔄 Fallback Available: ${error.fallbackAvailable}`);
        
        // Show error handling strategies
        if (error.retryable) {
          console.info('💡 Suggestion: This error can be retried');
        }
        
        if (error.fallbackAvailable) {
          console.info('💡 Suggestion: Fallback methods are available');
        }
        
        if (error.code === AppleIDErrorCodes.SMS_CODE_INVALID && error.details?.attemptsRemaining > 0) {
          console.info(`💡 Suggestion: You have ${error.details.attemptsRemaining} attempts remaining`);
        }
        
        if (error.code === AppleIDErrorCodes.TOO_MANY_ATTEMPTS && error.details?.nextRetryTime) {
          console.info(`💡 Suggestion: Next retry available at ${error.details.nextRetryTime}`);
        }
      }
    }

    console.info('\n🔄 Step 3: Testing resend functionality...');
    
    try {
      const newVerification = await creator.resendPhoneVerificationCode(
        phoneNumber, 
        'previous_verification_id'
      );
      console.info('✅ New verification code sent!');
      console.info(`⏰ New expiry: ${newVerification.expiresAt.toISOString()}`);
      
    } catch (error: any) {
      console.info(`❌ Resend failed: ${error.message}`);
      console.info(`🔧 Error Code: ${error.code}`);
    }

  } catch (error: any) {
    console.info(`❌ Initial verification failed: ${error.message}`);
    console.info(`🔧 Error Code: ${error.code}`);
    
    // Demonstrate fallback strategies
    if (error.fallbackAvailable) {
      console.info('\n🔄 Attempting fallback strategies...');
      
      try {
        // This would trigger the fallback mechanism
        const result = await creator.sendPhoneVerificationCode(phoneNumber);
        console.info('✅ Fallback successful!');
      } catch (fallbackError: any) {
        console.info(`❌ All fallback strategies failed: ${fallbackError.message}`);
      }
    }
  }

  console.info('\n🎯 2FA Verification demonstration complete!');
}

// Demonstrate error code handling
function demonstrateErrorCodes() {
  console.info('\n🔧 Error Code Reference:');
  
  const errorCategories = {
    'Network Errors': [
      AppleIDErrorCodes.NETWORK_TIMEOUT,
      AppleIDErrorCodes.NETWORK_UNREACHABLE,
      AppleIDErrorCodes.DNS_RESOLUTION_FAILED
    ],
    'API Errors': [
      AppleIDErrorCodes.INVALID_REQUEST,
      AppleIDErrorCodes.UNAUTHORIZED,
      AppleIDErrorCodes.RATE_LIMITED,
      AppleIDErrorCodes.SERVER_ERROR
    ],
    'Verification Errors': [
      AppleIDErrorCodes.SMS_CODE_EXPIRED,
      AppleIDErrorCodes.SMS_CODE_INVALID,
      AppleIDErrorCodes.TOO_MANY_ATTEMPTS
    ],
    'Fallback Errors': [
      AppleIDErrorCodes.ALL_METHODS_FAILED,
      AppleIDErrorCodes.FALLBACK_TRIGGERED
    ]
  };

  for (const [category, codes] of Object.entries(errorCategories)) {
    console.info(`\n📂 ${category}:`);
    codes.forEach(code => {
      console.info(`   • ${code}`);
    });
  }
}

// Export for use
export { demonstrate2FAVerification, demonstrateErrorCodes };

// Run if called directly
if (require.main === module) {
  demonstrate2FAVerification()
    .then(() => demonstrateErrorCodes())
    .catch(console.error);
}
