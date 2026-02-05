# Cloud Number Verification Guide

## Overview

The Cloud Number Verification system enables automated SMS verification for Cash App account creation using virtual phone numbers. This eliminates the need for manual SMS verification and improves the automation success rate.

## Features

- **Automated SMS Retrieval**: Automatically fetches verification codes from cloud number services
- **Smart Code Extraction**: Uses multiple regex patterns to extract verification codes from SMS messages
- **Fallback Support**: Includes mock verification for testing and development
- **Error Handling**: Comprehensive error handling with timeout protection
- **Service Agnostic**: Works with multiple SMS service providers

## Configuration

### Cloud Number Config (`config/cloud-number.js`)

```javascript
export const CLOUD_NUMBER_CONFIG = {
  service: 'cloudNumberService', // Service provider name
  country: 'US',                  // Country for phone number
  type: 'non-voip',              // Number type (non-voip recommended)
  phoneNumber: '+1234567890',    // Your purchased cloud number
  apiKey: 'your_api_key',        // API key for the service
  apiUrl: 'https://api.cloudnumberservice.com/sms', // API endpoint
  checkInterval: 2000,            // Check interval in milliseconds
  timeout: 120000                 // Maximum wait time for SMS
};
```

## Usage

### CLI Commands

```bash
# Create Cash App account with cloud number verification
bun run create-cashapp --cloud-number

# Create with mock SMS verification (for testing)
bun run create-cashapp --cloud-number --mock-sms

# Create multiple accounts with cloud verification
bun run create-cashapp --count=3 --cloud-number

# Direct script usage
bun run cashapp-signup-cloud user@example.com
bun run cashapp-signup-mock user@example.com
```

### Programmatic Usage

```javascript
import { CloudNumberManager } from '../src/sms/cloud-number-manager.js';

// Initialize with config
const cloudManager = new CloudNumberManager(CLOUD_NUMBER_CONFIG);

// Get verification code
const code = await cloudManager.getVerificationCode('+1234567890', 'cashapp');

// Use mock for testing
const mockCode = await cloudManager.getVerificationCodeMock('+1234567890', 'cashapp');
```

## API Methods

### CloudNumberManager

#### `getVerificationCode(phoneNumber, service)`

- **Description**: Retrieves verification code from SMS messages
- **Parameters**:
  - `phoneNumber`: The cloud number to check
  - `service`: Service name (e.g., 'cashapp')
- **Returns**: `Promise<string>` - Verification code
- **Throws**: Error if timeout or no code found

#### `getVerificationCodeMock(phoneNumber, service)`

- **Description**: Mock verification for testing
- **Returns**: `Promise<string>` - Generated mock code

#### `fetchMessages()`

- **Description**: Fetches SMS messages from the cloud service
- **Returns**: `Promise<Array>` - Array of message objects

#### `extractVerificationCode(message)`

- **Description**: Extracts verification code from message text
- **Parameters**: `message` - Message object with `body` property
- **Returns**: `string|null` - Extracted code or null

## Message Pattern Matching

The system uses multiple regex patterns to extract verification codes:

```javascript
const patterns = [
  /code[:\s]+(\d{4,6})/i,
  /verification[:\s]+(\d{4,6})/i,
  /(\d{4,6})\s+is\s+your/i,
  /your\s+code[:\s]+is\s+(\d{4,6})/i,
  /enter[:\s]+(\d{4,6})/i
];
```

## Supported Message Formats

- "Your Cash App verification code is 123456"
- "Enter code: 789012 to verify your Cash App account"
- "Your verification code is 456789"
- "Code 654321 is your Cash App verification"

## Error Handling

### Common Errors and Solutions

1. **Timeout Error**
   - **Cause**: No SMS received within timeout period
   - **Solution**: Increase timeout or check number configuration

2. **API Authentication Error**
   - **Cause**: Invalid API key or credentials
   - **Solution**: Verify API key and service configuration

3. **Number Not Found**
   - **Cause**: Phone number not registered with service
   - **Solution**: Rent or configure the number properly

4. **Network Error**
   - **Cause**: Connection issues with SMS service
   - **Solution**: Check internet connection and API URL

## Testing

### Mock Verification

```bash
# Test cloud number manager
bun run test-cloud-number

# Test Cash App signup with mock
bun run cashapp-signup-mock test@example.com
```

### Integration Testing

```bash
# Test with real cloud number (requires valid config)
bun run cashapp-signup-cloud test@example.com

# Test via CLI
bun run create-cashapp --cloud-number --count=1
```

## Service Integration

### Supported Services

The system is designed to work with various SMS service providers:

- **Twilio**: Configure with Twilio API
- **Virtual-SMS**: Use Virtual-SMS API endpoints
- **5SIM**: Integration with 5SIM service
- **Custom Services**: Adapt API calls as needed

### Custom Service Integration

1. Update `config/cloud-number.js` with your service details
2. Modify API endpoints in `CloudNumberManager.fetchMessages()`
3. Adjust message parsing if needed for your service format

## Security Considerations

- Store API keys securely (environment variables recommended)
- Use HTTPS endpoints for all API calls
- Implement rate limiting for API requests
- Log verification attempts for audit trails
- Rotate API keys periodically

## Troubleshooting

### Debug Mode

Enable debug logging to troubleshoot issues:

```javascript
// Enable debug logging
DEBUG=true bun run cashapp-signup-cloud test@example.com
```

### Common Issues

1. **No Messages Received**
   - Check phone number configuration
   - Verify service account status
   - Test with manual SMS sending

2. **Code Extraction Fails**
   - Review message format from service
   - Check regex patterns
   - Add custom patterns if needed

3. **API Connection Issues**
   - Verify API URL and credentials
   - Check network connectivity
   - Test API endpoints directly

## Performance Optimization

- **Caching**: Cache recent messages to reduce API calls
- **Batch Processing**: Process multiple accounts efficiently
- **Connection Pooling**: Reuse HTTP connections
- **Rate Limiting**: Respect service rate limits

## Monitoring

Track these metrics for optimal performance:

- SMS retrieval success rate
- Average verification time
- API response times
- Error rates by type
- Number utilization efficiency

## Future Enhancements

- Multi-service support with failover
- Real-time webhook integration
- Advanced pattern matching with ML
- Number pool management
- Cost optimization algorithms
