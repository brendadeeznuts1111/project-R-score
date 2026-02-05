# 📧 Security Communication: GPG Setup for Department Heads

**From**: Security Team  
**To**: All Department Heads  
**Subject**: **CRITICAL ACTION REQUIRED**: GPG Key Setup - 2:30:05.000005000
Resolution SLA  
**Priority**: CRITICAL  
**Deadline**: 2 hours, 30 minutes, 5 seconds, and 5000 nanoseconds from receipt

---

## 🚨 ACTION REQUIRED: Department Head GPG Configuration

Dear Department Head,

As part of Fire22's enhanced security protocols, **all department heads must
configure GPG commit signing** for repository access. This communication
provides your secure setup instructions.

### 🔐 Your GPG Key Information

**Your GPG Key ID**: `[TO_BE_PROVIDED_BY_SECURITY]`  
**Key Fingerprint**: `[TO_BE_PROVIDED_BY_SECURITY]`  
**Expiration Date**: `[TO_BE_PROVIDED_BY_SECURITY]`

### 📋 Required Setup Commands

Execute these commands in your terminal **after receiving your GPG key
package**:

```bash
# 1. Import your private GPG key (provided by Security team)
gpg --import [your-name]-private.asc

# 2. Trust your imported key
gpg --edit-key [YOUR_GPG_KEY_ID]
# Type: trust
# Select: 5 (ultimate trust)
# Type: quit

# 3. Configure Git for GPG signing (REQUIRED FOR ALL COMMITS)
git config --global commit.gpgsign true
git config --global user.signingkey [YOUR_GPG_KEY_ID]
git config --global gpg.program gpg

# 4. Set up co-author trailers for collaboration
git config --global trailer.co-authored-by.key "Co-authored-by"
```

### ✅ Verification Steps

**You MUST complete verification within 24 hours**:

```bash
# 1. Verify GPG key installation
gpg --list-secret-keys --keyid-format LONG
# Should show your key with [YOUR_GPG_KEY_ID]

# 2. Verify Git configuration
git config --global --get commit.gpgsign    # Should return: true
git config --global --get user.signingkey   # Should return: [YOUR_GPG_KEY_ID]
git config --global --get gpg.program       # Should return: gpg

# 3. Test signed commit (in any Fire22 repository)
git commit -S -m "security: verify GPG signing setup for [DEPARTMENT]

Department head GPG configuration verification commit.

Signed-off-by: [Your Name] <[your-email]@[department].fire22>"

# 4. Verify signature was created
git log --show-signature -1
# Should show "Good signature from [Your Name] <[email]>"
```

### 📤 Key Distribution Method

Your GPG key package will be delivered via:

1. **Encrypted Email** to your official Fire22 department email
2. **Secure File Share** via Fire22 internal systems
3. **Video Verification Call** to confirm key fingerprint (scheduled separately)

### 🛡️ Security Requirements

- **Never share** your private GPG key with anyone
- **Store securely** - Use password manager or secure storage
- **Report immediately** any suspected key compromise
- **Use only** on authorized Fire22 development machines
- **Update annually** when key expires (automatic renewal reminder)

### 📋 Department-Specific Information

**Your Department**: `[DEPARTMENT_NAME]`  
**Your Email**: `[department-head]@[department].fire22`  
**Repository Access**: All Fire22 repositories require signed commits  
**Compliance**: Required for SOX, security audits, and regulatory compliance

### 🚨 Troubleshooting

**Common Issues and Solutions:**

#### GPG Key Import Fails

```bash
# Check GPG version
gpg --version

# Re-import with verbose output
gpg --import --verbose [your-name]-private.asc
```

#### Git Signing Fails

```bash
# Test GPG directly
echo "test" | gpg --clearsign

# Check Git configuration
git config --global --list | grep -E "(gpg|sign)"

# Test with explicit key
git commit -S --gpg-sign=[YOUR_GPG_KEY_ID] -m "test commit"
```

#### "Bad signature" or "Can't check signature"

```bash
# Trust your key
gpg --edit-key [YOUR_GPG_KEY_ID]
# Type: trust → 5 → quit

# Verify key fingerprint matches Security-provided fingerprint
gpg --fingerprint [YOUR_GPG_KEY_ID]
```

### 📞 Support Contacts

**Immediate Technical Support**:

- **Mike Hunt** (Technology): `mike.hunt@technology.fire22`
- **Sarah Martinez** (Communications): `sarah.martinez@communications.fire22`

**Security Issues**:

- **Security Team**: `head@security.fire22`
- **Security Emergency**: `security-emergency@fire22.com`

**General Questions**:

- **Communications Team**: `sarah.martinez@communications.fire22`

### ⏰ CRITICAL TIMING REQUIREMENTS

**MAXIMUM RESOLUTION TIME**: 2 hours, 30 minutes, 5 seconds, and 5000
nanoseconds

**Precise Timeline** (Bun-native nanosecond tracking):

- **T+0**: Receive GPG key package from Security (timer starts)
- **T+30 minutes**: Key import and Git configuration must be completed
- **T+60 minutes**: Verification steps and test commit completed
- **T+90 minutes**: Confirmation email sent to Security team
- **T+2:30:05.000005000**: **CRITICAL DEADLINE** - All setup must be complete

**Escalation Trigger**: Any issues not resolved within the precise timeframe
above trigger automatic critical escalation procedures.

**Compliance Requirements**:

- All commits **must** be GPG signed starting [EFFECTIVE_DATE]
- Unsigned commits will be **rejected** by repository protection rules
- Department heads without GPG setup will **lose repository access**
- Security audit trail required for regulatory compliance

### 📋 Confirmation Required

**Please reply to this email confirming**:

- [ ] GPG key package received and imported successfully
- [ ] Git configuration completed and verified
- [ ] Test signed commit created and signature verified
- [ ] Understanding of ongoing security requirements

**Reply Template**:

```
Subject: GPG Setup Complete - [DEPARTMENT] Department

Security Team,

I confirm completion of GPG setup for [DEPARTMENT] department:

✅ GPG Key ID: [YOUR_GPG_KEY_ID]
✅ Git configuration verified
✅ Test commit signed successfully
✅ Security requirements understood

Department: [DEPARTMENT_NAME]
Name: [YOUR_NAME]
Email: [your-email]@[department].fire22
Verification Date: [DATE]
Test Commit SHA: [COMMIT_SHA]

Best regards,
[Your Name]
[Department] Department Head
```

### 📚 Additional Resources

- [Fire22 Commit Standards](COMMIT_STANDARDS.md)
- [GPG Best Practices Guide](docs/security/gpg-best-practices.md)
- [Department Head Security Manual](docs/security/department-head-manual.md)
- [Repository Access Guidelines](docs/development/repository-access.md)

---

**This communication is classified as INTERNAL and contains security-sensitive
information. Do not forward or share outside of authorized Fire22 personnel.**

**Security Team**  
Fire22 Gaming Platform  
`security@fire22.com`

---

**Distribution List**:

- Sarah Martinez - Communications (`sarah.martinez@communications.fire22`)
- Mike Hunt - Technology (`mike.hunt@technology.fire22`)
- [All Department Heads - Upon Appointment]
