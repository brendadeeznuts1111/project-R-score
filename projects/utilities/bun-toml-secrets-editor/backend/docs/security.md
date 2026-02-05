# Security Documentation

## Overview

The Bun Payment Linker implements enterprise-grade security with defense-in-depth architecture, comprehensive data protection, and regulatory compliance. This document outlines our security measures, best practices, and compliance frameworks.

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────┐
│                   Network Security                        │
│  • TLS 1.3 Encryption  • DDoS Protection  • Firewall    │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                Application Security                       │
│  • JWT Authentication  • Rate Limiting  • Input Validation│
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                   Data Security                           │
│  • AES-256 Encryption  • Field-Level Security  • Access  │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                Infrastructure Security                     │
│  • Container Security  • Secrets Management  • Monitoring│
└─────────────────────────────────────────────────────────┘
```

## Authentication & Authorization

### JWT Authentication

#### Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-uuid",
    "email": "user@example.com",
    "role": "underwriter",
    "tenantId": "tenant-uuid",
    "permissions": ["read:applications", "write:decisions"],
    "iat": 1640995200,
    "exp": 1641081600,
    "iss": "bun-payment-linker",
    "aud": "bun-payment-linker-users"
  }
}
```

#### Token Generation
```javascript
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    permissions: user.permissions
  },
  process.env.JWT_SECRET,
  {
    expiresIn: '24h',
    issuer: 'bun-payment-linker',
    audience: 'bun-payment-linker-users'
  }
);
```

#### Refresh Token Flow
```javascript
// Access token (short-lived): 15 minutes
// Refresh token (long-lived): 7 days

// Refresh endpoint
POST /auth/refresh
{
  "refreshToken": "refresh-token-here"
}

// Response
{
  "accessToken": "new-access-token",
  "tokenType": "Bearer",
  "expiresIn": "15m"
}
```

### Role-Based Access Control (RBAC)

#### Roles
- **Super Admin**: Full system access
- **Tenant Admin**: Tenant management and configuration
- **Underwriter**: Application processing and decisions
- **Reviewer**: Manual review and override capabilities
- **Analyst**: Read-only access to reports and analytics
- **User**: Basic application submission

#### Permissions
```javascript
const permissions = {
  // Application permissions
  'read:applications': 'View applications',
  'write:applications': 'Create and update applications',
  'delete:applications': 'Delete applications',
  'approve:applications': 'Approve applications',
  'decline:applications': 'Decline applications',
  
  // Device permissions
  'read:devices': 'View devices',
  'write:devices': 'Manage devices',
  'execute:adb': 'Execute ADB commands',
  
  // Admin permissions
  'read:users': 'View users',
  'write:users': 'Manage users',
  'read:tenants': 'View tenants',
  'write:tenants': 'Manage tenants',
  
  // System permissions
  'read:audit': 'View audit logs',
  'write:system': 'System configuration',
  'read:analytics': 'View analytics'
};
```

### Multi-Factor Authentication (MFA)

#### TOTP Implementation
```javascript
const speakeasy = require('speakeasy');

// Generate secret
const secret = speakeasy.generateSecret({
  name: `Bun Payment Linker (${user.email})`,
  issuer: 'Bun Payment Linker'
});

// Verify token
const verified = speakeasy.totp.verify({
  secret: user.mfaSecret,
  encoding: 'base32',
  token: req.body.totpCode,
  window: 2
});
```

#### MFA Flow
1. User enables MFA in settings
2. System generates TOTP secret
3. User scans QR code with authenticator app
4. System verifies backup codes
5. MFA required for sensitive operations

## Data Protection

### Encryption Standards

#### At Rest (AES-256)
```javascript
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    this.iv = Buffer.from(process.env.ENCRYPTION_IV, 'hex');
  }
  
  encrypt(text) {
    const cipher = crypto.createCipher(this.algorithm, this.key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  decrypt(encryptedText) {
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

#### In Transit (TLS 1.3)
- All API endpoints enforce HTTPS
- TLS 1.3 with strong cipher suites
- HSTS headers for browser security
- Certificate pinning for mobile apps

#### Field-Level Encryption
```javascript
// Sensitive fields encrypted at database level
const sensitiveFields = {
  ssn: 'encrypted_ssn',
  bankAccount: 'encrypted_bank_account',
  creditCard: 'encrypted_credit_card',
  personalData: 'encrypted_personal_data'
};

// Automatic encryption/decryption middleware
const encryptSensitiveData = (data) => {
  Object.keys(sensitiveFields).forEach(field => {
    if (data[field]) {
      data[sensitiveFields[field]] = encryptionService.encrypt(data[field]);
      delete data[field];
    }
  });
  return data;
};
```

### Data Masking

#### PII Masking for Logs
```javascript
const maskPII = (data) => {
  return {
    ...data,
    ssn: data.ssn ? data.ssn.replace(/\d(?=\d{4})/g, '*') : undefined,
    email: data.email ? data.email.replace(/(.{2}).*(@.*)/, '$1***$2') : undefined,
    phone: data.phone ? data.phone.replace(/\d(?=\d{4})/g, '*') : undefined
  };
};
```

#### Audit Log Redaction
```javascript
const redactAuditData = (logEntry) => {
  const sensitivePatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
    /\b\d{9,}\b/g // Account numbers
  ];
  
  let redacted = JSON.stringify(logEntry);
  sensitivePatterns.forEach(pattern => {
    redacted = redacted.replace(pattern, '***REDACTED***');
  });
  
  return JSON.parse(redacted);
};
```

## Network Security

### TLS Configuration

#### Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name api.bun-payment-linker.com;
    
    # SSL certificates
    ssl_certificate /etc/ssl/certs/api-bun-payment-linker.com.crt;
    ssl_certificate_key /etc/ssl/private/api-bun-payment-linker.com.key;
    
    # TLS 1.3 only
    ssl_protocols TLSv1.3;
    ssl_prefer_server_ciphers on;
    
    # Strong cipher suites
    ssl_ciphers TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    
    # Other security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### API Security

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// General API limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: 'Too many requests from this IP'
});

// Sensitive operation limiting
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true
});

// User-specific limiting
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip
});
```

#### Input Validation
```javascript
const { body, validationResult } = require('express-validator');

const applicationValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('ssn').matches(/^\d{3}-\d{2}-\d{4}$/),
  body('income').isFloat({ min: 0, max: 10000000 }),
  body('email').optional().isEmail().normalizeEmail(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];
```

#### SQL Injection Prevention
```javascript
// Use parameterized queries
const getUserApplications = async (userId, filters) => {
  let query = db('applications').where('user_id', userId);
  
  if (filters.status) {
    query = query.where('status', filters.status);
  }
  
  if (filters.dateFrom) {
    query = query.where('created_at', '>=', filters.dateFrom);
  }
  
  return query.select();
};

// Never use string interpolation for SQL
// BAD: db.raw(`SELECT * FROM applications WHERE status = '${status}'`);
// GOOD: db('applications').where('status', status);
```

#### XSS Prevention
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com"]
    }
  }
}));

// Output encoding
const escapeHtml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
```

## Infrastructure Security

### Container Security

#### Docker Security
```dockerfile
# Use non-root user
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Minimal attack surface
RUN apk add --no-cache libc6-compat

# Security scanning
RUN npm audit --audit-level=high
USER nextjs

# Read-only filesystem
COPY --chown=nextjs:nodejs . .
```

#### Kubernetes Security
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
  containers:
  - name: app
    image: bun-payment-linker:latest
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

### Secrets Management

#### Environment Variables
```bash
# Use .env files for development
# Use Kubernetes secrets for production
# Use AWS Secrets Manager or HashiCorp Vault for enterprise

# Example Kubernetes secret
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  JWT_SECRET: <base64-encoded-secret>
  DATABASE_URL: <base64-encoded-url>
  STRIPE_SECRET_KEY: <base64-encoded-key>
```

#### Key Rotation
```javascript
// Automated key rotation
const rotateKeys = async () => {
  const newKey = crypto.randomBytes(32).toString('hex');
  
  // Update encrypted data with new key
  await reencryptSensitiveData(oldKey, newKey);
  
  // Update environment variables
  process.env.ENCRYPTION_KEY = newKey;
  
  // Log rotation (without exposing keys)
  logger.info('Encryption keys rotated successfully');
};

// Schedule key rotation every 90 days
setInterval(rotateKeys, 90 * 24 * 60 * 60 * 1000);
```

## Compliance

### PCI DSS Compliance

#### Requirements Met
1. **Install and maintain network security controls**
   - TLS 1.3 encryption
   - Firewall configuration
   - Network segmentation

2. **Protect cardholder data**
   - End-to-end encryption
   - Tokenization via Stripe
   - No raw card data storage

3. **Maintain vulnerability management program**
   - Regular security scans
   - Penetration testing
   - Patch management

4. **Implement strong access control measures**
   - Multi-factor authentication
   - Role-based access control
   - Unique user IDs

5. **Regularly monitor and test networks**
   - Intrusion detection
   - Log monitoring
   - Security incident response

#### PCI Compliance Checklist
```javascript
const pciCompliance = {
  encryption: {
    atRest: 'AES-256',
    inTransit: 'TLS-1.3',
    keyManagement: 'AWS KMS'
  },
  accessControl: {
    authentication: 'JWT + MFA',
    authorization: 'RBAC',
    sessionTimeout: '15 minutes'
  },
  networkSecurity: {
    firewall: 'Configured',
    segmentation: 'Implemented',
    monitoring: '24/7'
  },
  audit: {
    logging: 'Comprehensive',
    monitoring: 'Real-time',
    retention: '3 years'
  }
};
```

### SOC 2 Compliance

#### Trust Service Criteria
- **Security**: System protection against unauthorized access
- **Availability**: System is available for operation and use
- **Processing**: System processing is complete, accurate, timely, and authorized
- **Confidentiality**: Information is protected from unauthorized disclosure

#### SOC 2 Controls
```javascript
const soc2Controls = {
  security: {
    accessControls: 'Implemented',
    encryption: 'AES-256',
    monitoring: 'SIEM integration'
  },
  availability: {
    uptime: '99.9%',
    backup: 'Daily',
    disasterRecovery: 'Implemented'
  },
  processing: {
    dataIntegrity: 'Hashing and verification',
    auditTrail: 'Immutable blockchain',
    accuracy: 'Automated validation'
  },
  confidentiality: {
    dataClassification: 'Implemented',
    ndas: 'Signed',
    training: 'Annual'
  }
};
```

### GDPR Compliance

#### Data Protection Principles
1. **Lawfulness, fairness, and transparency**
2. **Purpose limitation**
3. **Data minimization**
4. **Accuracy**
5. **Storage limitation**
6. **Integrity and confidentiality**
7. **Accountability**

#### GDPR Implementation
```javascript
const gdprCompliance = {
  dataSubjectRights: {
    access: 'GET /api/v1/user/data',
    rectification: 'PATCH /api/v1/user/data',
    erasure: 'DELETE /api/v1/user/data',
    portability: 'GET /api/v1/user/data/export'
  },
  consent: {
    tracking: 'Explicit consent required',
    cookies: 'Consent management',
    marketing: 'Opt-in only'
  },
  dataProtection: {
    encryption: 'AES-256',
    anonymization: 'Pseudonymization',
    retention: 'Configurable per regulation'
  }
};
```

### FCRA Compliance

#### Fair Credit Reporting Act Requirements
- **Permissible purpose**: Verify legitimate need for credit reports
- **Adverse action**: Provide notices for declined applications
- **Data accuracy**: Ensure dispute resolution process
- **Consumer rights**: Provide access to credit information

#### FCRA Implementation
```javascript
const fcraCompliance = {
  permissiblePurpose: {
    underwriting: 'Verified',
    accountReview: 'Limited',
    fraudDetection: 'Implemented'
  },
  adverseAction: {
    noticeRequired: true,
    timing: 'Within 30 days',
    content: 'Specific reasons + credit bureau info'
  },
  dataRetention: {
    creditReports: '25 months',
    inquiries: '25 months',
    decisions: '7 years'
  }
};
```

## Security Monitoring

### Logging and Monitoring

#### Security Events
```javascript
const securityEvents = {
  authentication: {
    loginSuccess: 'User authenticated successfully',
    loginFailure: 'Authentication failed',
    mfaRequired: 'MFA verification required',
    accountLocked: 'Account locked due to failed attempts'
  },
  authorization: {
    accessDenied: 'Access denied to resource',
    privilegeEscalation: 'Attempted privilege escalation',
    unauthorizedApi: 'Unauthorized API access'
  },
  data: {
    dataExfiltration: 'Potential data exfiltration detected',
    unusualAccess: 'Unusual data access pattern',
    piiAccess: 'PII data accessed'
  },
  infrastructure: {
    ddosAttack: 'DDoS attack detected',
    bruteForce: 'Brute force attack detected',
    anomaly: 'System anomaly detected'
  }
};
```

#### SIEM Integration
```javascript
const sendToSIEM = async (event) => {
  const siemEvent = {
    timestamp: new Date().toISOString(),
    source: 'bun-payment-linker-api',
    event_type: event.type,
    severity: event.severity,
    user_id: event.userId,
    ip_address: event.ipAddress,
    details: event.details
  };
  
  await axios.post(process.env.SIEM_WEBHOOK_URL, siemEvent, {
    headers: {
      'Authorization': `Bearer ${process.env.SIEM_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
};
```

### Intrusion Detection

#### Anomaly Detection
```javascript
const detectAnomalies = (userAction) => {
  const anomalies = [];
  
  // Check for unusual access patterns
  if (userAction.frequency > NORMAL_THRESHOLD) {
    anomalies.push({
      type: 'high_frequency_access',
      severity: 'medium',
      description: 'User accessing resources at unusual frequency'
    });
  }
  
  // Check for geographic anomalies
  if (isUnusualLocation(userAction.location, user.userId)) {
    anomalies.push({
      type: 'unusual_location',
      severity: 'high',
      description: 'Access from unusual geographic location'
    });
  }
  
  // Check for time-based anomalies
  if (isUnusualTime(userAction.timestamp, user.userId)) {
    anomalies.push({
      type: 'unusual_time',
      severity: 'medium',
      description: 'Access during unusual hours'
    });
  }
  
  return anomalies;
};
```

## Incident Response

### Security Incident Response Plan

#### Phases
1. **Preparation**: Tools, procedures, training
2. **Identification**: Detection and analysis
3. **Containment**: Short-term and long-term
4. **Eradication**: Root cause removal
5. **Recovery**: System restoration
6. **Lessons Learned**: Post-incident review

#### Incident Classification
```javascript
const incidentSeverity = {
  critical: {
    description: 'System compromise, data breach',
    responseTime: '15 minutes',
    escalation: 'Immediate C-level notification'
  },
  high: {
    description: 'Security control bypass, significant impact',
    responseTime: '1 hour',
    escalation: 'Security team + management'
  },
  medium: {
    description: 'Policy violation, limited impact',
    responseTime: '4 hours',
    escalation: 'Security team'
  },
  low: {
    description: 'Minor security issue, no impact',
    responseTime: '24 hours',
    escalation: 'Individual contributor'
  }
};
```

## Security Best Practices

### Development Security

#### Secure Coding Guidelines
1. **Input validation**: Validate all inputs
2. **Output encoding**: Encode all outputs
3. **Error handling**: Don't expose sensitive information
4. **Authentication**: Use strong authentication
5. **Authorization**: Implement least privilege
6. **Cryptography**: Use standard algorithms
7. **Logging**: Log security events

#### Code Review Checklist
```javascript
const securityChecklist = {
  authentication: [
    'Is authentication properly implemented?',
    'Are sessions properly managed?',
    'Is MFA implemented for sensitive operations?'
  ],
  authorization: [
    'Is authorization checked for all operations?',
    'Is least privilege principle followed?',
    'Are role permissions properly defined?'
  ],
  dataProtection: [
    'Is sensitive data encrypted?',
    'Are secrets properly managed?',
    'Is data retention policy followed?'
  ],
  infrastructure: [
    'Are security headers configured?',
    'Is rate limiting implemented?',
    'Is monitoring configured?'
  ]
};
```

### Operational Security

#### Security Operations
- **24/7 monitoring**: Real-time threat detection
- **Vulnerability scanning**: Weekly automated scans
- **Penetration testing**: Quarterly external testing
- **Security training**: Monthly security awareness
- **Incident response**: Annual drill exercises

#### Backup Security
```javascript
const backupSecurity = {
  encryption: 'AES-256 encrypted backups',
  storage: 'Geographically distributed',
  access: 'Role-based access controls',
  testing: 'Monthly restore testing',
  retention: '90 days daily, 1 year weekly'
};
```

## Security Testing

### Security Testing Types

1. **Static Application Security Testing (SAST)**
   - Code analysis for vulnerabilities
   - Dependency scanning
   - Configuration review

2. **Dynamic Application Security Testing (DAST)**
   - Running application testing
   - API security testing
   - Authentication testing

3. **Penetration Testing**
   - External network testing
   - Internal network testing
   - Social engineering testing

### Security Tools
```javascript
const securityTools = {
  sast: ['SonarQube', 'CodeQL', 'Semgrep'],
  dast: ['OWASP ZAP', 'Burp Suite', 'Nessus'],
  dependency: ['Snyk', 'Dependabot', 'WhiteSource'],
  infrastructure: ['Terraform Security', 'Checkov', 'Polaris']
};
```

## Conclusion

Security is a continuous process that requires vigilance, regular updates, and ongoing improvement. The Bun Payment Linker implements comprehensive security measures to protect sensitive financial data and maintain regulatory compliance.

For security questions or to report vulnerabilities, contact: **security@bun-payment-linker.com**
