# 🔐 Fire22 GPG Key Distribution System - Team Lead Security Protocol

**Document Classification:** CONFIDENTIAL - Fire22 Security Operations  
**Distribution:** Team Leads Only  
**Version:** 1.0  
**Date:** August 28, 2025

---

## 🎯 **Executive Summary**

This document provides Fire22 team leads with secure procedures for GPG key
storage, distribution, and management across all departments.

## 🏢 **Team Structure & Responsibilities**

### **Department Team Leads:**

- **Security Team Lead:** Primary GPG authority, master key holder
- **Infrastructure Team Lead:** Database/system commits, secondary authority
- **DevOps Team Lead:** Configuration/deployment commits
- **Data Team Lead:** Schema/migration commits
- **Development Team Lead:** Application code commits

### **Chain of Authority:**

```
Security Head
    ↓
Security Team Lead (Master Key Holder)
    ↓
Department Team Leads
    ↓
Team Members
```

---

## 🔒 **Secure Key Storage System**

### **Primary Storage: Bun.secrets Integration**

Each team lead must use Fire22's native credential storage:

```bash
# Store GPG keys securely using Bun.secrets
bun run gpg:store --team=[team-name] --member=[member-name]
bun run gpg:retrieve --team=[team-name] --member=[member-name]
bun run gpg:list --team=[team-name]
bun run gpg:audit --comprehensive
```

### **Platform-Specific Storage:**

- **macOS:** Keychain Services (encrypted, biometric protected)
- **Linux:** libsecret with GNOME Keyring integration
- **Windows:** Windows Credential Manager (enterprise domain)

### **Storage Structure:**

```
Service: fire22-dashboard-worker-gpg
Account Pattern: [department]-[member]-gpg-private
Account Pattern: [department]-[member]-gpg-public
Account Pattern: [department]-team-master-key
```

---

## 📋 **Team Lead Distribution Workflow**

### **Phase 1: Secure Key Generation (Security Team Lead)**

```bash
# 1. Generate master signing key for department
gpg --batch --generate-key << EOF
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: Fire22 [Department] Team Lead
Name-Email: [teamlead]@fire22.ag
Expire-Date: 2y
Passphrase: [SECURE-PASSPHRASE-FROM-BUN-SECRETS]
%commit
EOF

# 2. Export keys for secure storage
gpg --armor --export [KEY-ID] > [department]-public.asc
gpg --armor --export-secret-keys [KEY-ID] > [department]-private.asc

# 3. Store in Bun.secrets
bun run gpg:store --team=[department] --type=master --file=[department]-private.asc
bun run gpg:store --team=[department] --type=public --file=[department]-public.asc
```

### **Phase 2: Member Key Generation (Team Leads)**

```bash
# Generate keys for each team member
for member in $(bun run team:members --department=[department]); do
  # Generate individual member key
  gpg --batch --generate-key << EOF
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: $member
Name-Email: ${member}@fire22.ag
Expire-Date: 1y
Passphrase: $(bun run secrets:generate --type=gpg --user=$member)
%commit
EOF

  # Sign with team lead master key
  gpg --default-key [TEAM-LEAD-KEY] --sign-key ${member}@fire22.ag

  # Store securely
  KEY_ID=$(gpg --list-secret-keys --with-colons ${member}@fire22.ag | grep ^sec | cut -d: -f5)
  gpg --armor --export $KEY_ID > ${member}-public.asc
  gpg --armor --export-secret-keys $KEY_ID > ${member}-private.asc

  bun run gpg:store --team=[department] --member=$member --type=private --file=${member}-private.asc
  bun run gpg:store --team=[department] --member=$member --type=public --file=${member}-public.asc
done
```

### **Phase 3: Secure Distribution (Automated)**

```bash
# Team lead distributes keys via secure channels
bun run gpg:distribute --team=[department] --method=secure-email
bun run gpg:distribute --team=[department] --method=slack-encrypted
bun run gpg:distribute --team=[department] --method=in-person-qr
```

---

## 🛡️ **Distribution Methods by Security Level**

### **Method 1: Secure Email (Moderate Security)**

```bash
# Encrypted email with GPG-encrypted attachments
bun run gpg:email --recipient=[member]@fire22.ag --key-bundle=[member] --encrypt-to=[recipient-public-key]
```

### **Method 2: Slack Encrypted Messages (High Security)**

```bash
# Slack with end-to-end encryption and auto-deletion
bun run gpg:slack --channel=#[department]-security --member=[member] --auto-delete=24h
```

### **Method 3: In-Person QR Codes (Maximum Security)**

```bash
# Generate time-limited QR codes for in-person key exchange
bun run gpg:qr-generate --member=[member] --expires=30min --location=[meeting-room]
bun run gpg:qr-scan --verify-identity=[member] --biometric-check
```

### **Method 4: Hardware Security Keys (Enterprise)**

```bash
# Store on YubiKey or similar hardware tokens
bun run gpg:hardware-store --device=yubikey --member=[member] --pin-required
bun run gpg:hardware-distribute --tracking-number=[fedex-tracking]
```

---

## 📊 **Security Compliance Matrix**

### **Access Control Matrix:**

| Role               | Generate Keys | Store Keys | Distribute Keys | Revoke Keys | Audit Keys |
| ------------------ | ------------- | ---------- | --------------- | ----------- | ---------- |
| Security Head      | ✅            | ✅         | ✅              | ✅          | ✅         |
| Security Team Lead | ✅            | ✅         | ✅              | ✅          | ✅         |
| Dept Team Lead     | ✅            | ✅         | ✅              | ❌          | ✅         |
| Senior Developer   | ❌            | ✅         | ❌              | ❌          | ✅         |
| Developer          | ❌            | ✅         | ❌              | ❌          | ❌         |

### **Security Requirements:**

- ✅ **Two-Factor Authentication:** Required for all key operations
- ✅ **Biometric Verification:** Required for sensitive key access
- ✅ **Audit Logging:** All key operations logged with timestamps
- ✅ **Encryption at Rest:** All stored keys encrypted with AES-256
- ✅ **Key Rotation:** Annual key rotation for all team members
- ✅ **Revocation Support:** Immediate key revocation capability

---

## 🔧 **Team Lead CLI Commands**

### **Key Management:**

```bash
# Generate department master key
bun run gpg:master-gen --department=[dept] --security-level=high

# Generate team member keys (bulk)
bun run gpg:team-gen --department=[dept] --members-file=team-roster.json

# Store keys securely
bun run gpg:store --batch --department=[dept] --encryption=aes256

# Audit key compliance
bun run gpg:audit --department=[dept] --compliance-check
```

### **Distribution Commands:**

```bash
# Secure distribution workflow
bun run gpg:distribute-workflow --department=[dept] --method=auto-select

# Emergency key distribution
bun run gpg:emergency-distribute --member=[member] --reason="[incident-id]"

# Key verification
bun run gpg:verify-distribution --department=[dept] --check-signatures
```

### **Monitoring & Compliance:**

```bash
# Real-time key status
bun run gpg:status --department=[dept] --live-monitor

# Compliance reporting
bun run gpg:compliance-report --department=[dept] --export-pdf

# Security audit trail
bun run gpg:audit-trail --department=[dept] --date-range="2025-08-01,2025-08-31"
```

---

## 🚨 **Emergency Procedures**

### **Compromised Key Protocol:**

```bash
# 1. Immediate revocation
bun run gpg:revoke --key-id=[compromised-key] --reason=compromised --urgent

# 2. Team notification
bun run gpg:alert-team --department=[dept] --type=security-incident --key=[compromised-key]

# 3. Emergency key regeneration
bun run gpg:emergency-regen --member=[affected-member] --expedited

# 4. Git history validation
bun run gpg:validate-commits --repository=fire22-dashboard-worker --since=[incident-date]
```

### **Team Lead Unavailability:**

```bash
# Escalate to Security Head
bun run gpg:escalate --team-lead=[unavailable-lead] --emergency-contact=[security-head]

# Temporary key delegation
bun run gpg:delegate --from=[team-lead] --to=[deputy] --duration=72h --approval=[security-head]
```

---

## 📋 **Implementation Checklist for Team Leads**

### **Initial Setup (Week 1):**

- [ ] Install and configure Bun.secrets GPG integration
- [ ] Generate master key for department with secure passphrase
- [ ] Set up secure key storage using platform-native encryption
- [ ] Configure automated backup procedures
- [ ] Test key generation and storage workflows

### **Team Rollout (Week 2):**

- [ ] Generate keys for all team members
- [ ] Distribute keys using appropriate security method
- [ ] Verify Git configuration for all team members
- [ ] Conduct signing tests with sample commits
- [ ] Document team-specific procedures

### **Ongoing Operations:**

- [ ] Monthly key status audits
- [ ] Quarterly security compliance reviews
- [ ] Annual key rotation procedures
- [ ] Emergency response drills
- [ ] Security awareness training

---

## 🔍 **Audit & Compliance**

### **Automated Compliance Monitoring:**

```bash
# Daily automated checks
0 8 * * * bun run gpg:daily-audit --all-departments --report-email=security@fire22.ag

# Weekly compliance reporting
0 9 * * 1 bun run gpg:compliance-report --format=pdf --distribution=team-leads

# Monthly security reviews
0 10 1 * * bun run gpg:security-review --comprehensive --stakeholders=security-committee
```

### **Manual Audit Procedures:**

1. **Key Integrity Verification:** Validate all stored keys against known good
   hashes
2. **Access Pattern Analysis:** Review unusual access patterns or failed
   attempts
3. **Signature Validation:** Verify recent commits have valid GPG signatures
4. **Compliance Gap Assessment:** Identify and remediate compliance gaps

---

## 📞 **Support & Escalation**

### **Team Lead Support Channels:**

- **Primary:** Fire22 Security Team Lead
- **Secondary:** Infrastructure Team Lead
- **Emergency:** Security Head (24/7 hotline)
- **Technical:** DevOps Team Lead

### **Escalation Matrix:**

- **Level 1:** Key generation/distribution issues → Department Team Lead
- **Level 2:** Security compliance issues → Security Team Lead
- **Level 3:** System compromise/emergency → Security Head
- **Level 4:** Business critical incident → Executive team

---

**🔒 This document contains sensitive security procedures. Distribution is
restricted to authorized Fire22 team leads only. Unauthorized sharing is
prohibited and subject to disciplinary action.**

**Document Owner:** Fire22 Security Team  
**Review Date:** Monthly  
**Next Update:** September 28, 2025
