# FactoryWager /fw-release Command Reference

## Overview

The `/fw-release` master orchestrator provides three distinct execution modes to accommodate different operational scenarios:

```bash
/fw-release config.yaml --version=X.Y.Z [OPTIONS]
```

---

## 1️⃣ Interactive Release (Human-Gated)

### Command Syntax

```bash
/fw-release config.yaml --version=1.3.0
```

### Intended Purpose

Production deployments requiring explicit human oversight and confirmation.

### Detailed Flow

1. **Pre-Release Analysis** (automated)
   - `/fw-analyze --json-only`
   - `/fw-validate --env=production --strict`
   - `/fw-changelog --from=last-deploy-tag --to=HEAD`

2. **Release Decision Gate** (human confirmation required)

   ```text
   🚀 FACTORYWAGER RELEASE CANDIDATE

   Version: 1.3.0
   Risk Score: 45/100
   Changes: 3 keys modified

   Type "DEPLOY" to release 1.3.0 to production:
   ____________________________________________________
   ```

3. **Deployment Execution** (upon confirmation)
   - `/fw-deploy --to=production`
   - `/fw-nexus-status --verify`

4. **Release Finalization**
   - Generate comprehensive reports
   - Create git tag
   - Update audit trail

### Recommended Use Cases

- ✅ Production deployments
- ✅ High-risk releases
- ✅ Compliance requirements
- ✅ Manual approval workflows

### Safety & Security Features

- 🔒 Human confirmation required
- 🔒 All security gates enforced
- 🔒 Risk score validation
- 🔒 Complete audit trail

---

## 2️⃣ Automated Release (CI/CD Ready)

### Automated Command Syntax

```bash
/fw-release config.yaml --version=1.3.0 --yes
```

### Automated Intended Purpose

Fully automated releases for CI/CD pipelines and deployment automation.

### Automated Detailed Flow

1. **Pre-Release Analysis** (automated)
   - Same analysis as interactive mode

2. **Release Decision Gate** (auto-confirmed)

   ```text
   🤖 --yes FLAG DETECTED
   ✅ Auto-confirmed for deployment
   ```

3. **Deployment Execution** (automated)
   - Same deployment as interactive mode

4. **Release Finalization** (automated)
   - Same finalization as interactive mode

### Automated Use Cases

- ✅ GitHub Actions workflows
- ✅ GitLab CI/CD pipelines
- ✅ Automated deployment systems
- ✅ Scheduled releases

### Automated Safety Features

- 🔒 All security gates still enforced
- 🔒 Risk score validation maintained
- 🔒 Complete audit trail preserved
- 🔒 No human interaction required

---

## 3️⃣ Safe Testing (Dry Run Mode)

### Testing Command Syntax

```bash
/fw-release config.yaml --version=1.3.0 --dry-run
```

### Testing Intended Purpose

Safe testing and validation without actual infrastructure changes.

### Testing Detailed Flow

1. **Pre-Release Analysis** (real execution)
   - Actual analysis workflows executed
   - Real risk assessment performed
   - Real security validation completed

2. **Release Decision Gate** (skipped in dry-run)

   ```text
   🔍 DRY RUN MODE - Skipping confirmation
   ```

3. **Deployment Execution** (simulated)

   ```text
   🔍 DRY RUN: Simulating deployment...
   ✅ Development deployment completed
   ✅ Staging deployment completed
   ✅ Production deployment completed
   ```

4. **Release Finalization** (real execution)
   - Real reports generated
   - Simulated git tag created
   - Real audit trail updated

### Testing Use Cases

- ✅ Pre-deployment validation
- ✅ Stakeholder demonstrations
- ✅ Pipeline testing
- ✅ Risk assessment validation

### Testing Safety Features

- 🔒 No actual infrastructure changes
- 🔒 Real analysis and validation
- 🔒 Complete artifact generation
- 🔒 Full audit trail maintained

---

## 📊 Comparison Matrix

| Feature                 | Interactive | Automated | Dry Run  |
|-------------------------|-------------|------------|----------|
| **Human Confirmation**  | ✅ Required | ❌ Bypassed | ❌ Skipped |
| **Actual Deployment**   | ✅ Real     | ✅ Real     | ❌ Simulated |
| **Security Gates**      | ✅ Enforced | ✅ Enforced | ✅ Enforced |
| **Risk Validation**     | ✅ Real     | ✅ Real     | ✅ Real |
| **Report Generation**   | ✅ Real     | ✅ Real     | ✅ Real |
| **Audit Trail**         | ✅ Real     | ✅ Real     | ✅ Real |
| **CI/CD Integration**   | ❌ Manual   | ✅ Perfect  | ✅ Testing |
| **Stakeholder Demos**   | ✅ Possible | ✅ Possible | ✅ Perfect |

---

## 🎯 Usage Recommendations

### Development Environment Usage

```bash
/fw-release config.yaml --version=1.3.0-dev --dry-run
```

### Staging Environment Usage

```bash
/fw-release config.yaml --version=1.3.0-staging --yes
```

### Production Environment Usage

```bash
/fw-release config.yaml --version=1.3.0
```

### Emergency Hotfix Usage

```bash
/fw-release config.yaml --version=1.3.1-hotfix --yes
```

---

## 🔒 Safety Guarantees

All three modes maintain these safety guarantees:

1. **Zero-Trust Validation**: 5 security gates always enforced
2. **Risk Assessment**: Risk scores always calculated and validated
3. **Audit Trail**: Complete structured logging always maintained
4. **Rollback Capability**: One-command rollback always available
5. **Artifact Generation**: Comprehensive reports always created

---

## 🚀 Integration Examples

### GitHub Actions Integration

```yaml
- name: Release FactoryWager
  run: /fw-release config.yaml --version=${{ github.ref_name }} --yes
```

### GitLab CI Integration

```yaml
release:
  script:
    - /fw-release config.yaml --version=$CI_COMMIT_TAG --yes
```

### Manual Production Deployment

```bash
/fw-release config.yaml --version=1.3.0
# Type "DEPLOY" when prompted
```

---

*Generated by FactoryWager v1.1.0 Master Orchestrator*
