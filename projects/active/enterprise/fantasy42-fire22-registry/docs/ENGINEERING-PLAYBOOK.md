# 🏛️ Fantasy42-Fire22 Engineering Playbook

**Version:** 2.0 **Status:** 🔐 Enforced - Integrated into CI/CD & ARB
Governance **Owner:** Architecture Review Board (ARB) **Last Audit:**
`{{CI_AUDIT_DATE}}` | **Compliance:** 98% | **Dashboard:**
[Live View](https://grafana.internal/dashboards/playbook-compliance)

## 📜 Preamble: Our Constitution

This document is the active constitution for the Fantasy42-Fire22 engineering
organization. It translates our core identity—**a secure, scalable, real-time
sports-tech & gaming platform**—into a system of enforceable rules, validated
patterns, and measurable outcomes.

Adherence is not optional. It is the baseline requirement for production. All
technical decisions **must be traceable** to these principles. This playbook is
the primary mechanism for reducing entropy, minimizing technical debt, and
ensuring we can move fast with confidence.

---

## 🧭 Supreme Tenets (The Non-Negotiables)

These tenets are our highest-order goals. They override all other considerations
and are the ultimate arbiter of architectural disputes.

1.  **🗣️ User Trust Through Real-Time Performance:** The user experience is the
    product. We guarantee sub-second latency for all critical path interactions.
    Performance is a feature designed in, not measured in later. **Validated by
    SLOs with automated performance budgets in CI.**
2.  **🔒 Security & Compliance by Primacy:** We are a fintech and gaming
    company. Security is our license to operate. We assume a hostile environment
    and implement the principle of least privilege by default. **Enforced by
    automated security gates and immutable, auditable pipelines.**
3.  **📈 Scale as a First-Class Citizen:** Our architecture is inherently
    elastic. We design for the draft day peak, ensuring consistent performance
    and cost-effectiveness. **Governed by predictive scaling alerts and a
    continuously optimized cost-per-transaction metric.**

---

## ⚖️ Decision Framework: The Lenses of Evaluation

Every proposal, from a new service to a library dependency, must be evaluated
through these lenses. **Automated checks and ARB review are the mechanisms that
enforce this framework.**

### 1. Architectural Integrity

- **🔗 Event-Driven & Decoupled:** Does the design promote loose coupling via
  `event-driven` patterns, avoiding synchronous chatty calls?<br>**→
  Enforcement:** Static analysis fails PRs on disallowed inter-context HTTP
  calls.
- **📦 Domain-Aligned Boundaries:** Does the service respect our DDD bounded
  contexts? Does it avoid creating a monolith-in-disguise?<br>**→ Enforcement:**
  Dependency analysis tools; **→ Governance:** ARB approval mandatory for new
  context creation.
- **🔄 CQRS for Performance:** For read-heavy use cases, does it leverage `CQRS`
  to optimize queries independently of writes?<br>**→ Enforcement:** Automated
  performance tests against predefined latency targets for read models.
- **🌐 Edge-Native Deployment:** Is the workload deployed at the edge on
  `Cloudflare Workers`? If not, a formal exception is required.<br>**→
  Enforcement:** IaC pipeline blocks deployment to non-whitelisted, non-edge
  platforms.
- **🧩 Microservice Fitness:** Does the service have a single, clear
  responsibility and well-defined API/event contracts?<br>**→ Enforcement:** API
  schema linting and contract-test generation in CI.

### 2. Technology & Tooling Vigilance

- **🦊 Bun & TypeScript First:** Is the tool a first-class citizen in the
  `Bun`/`TypeScript` ecosystem, leveraging its performance and type
  safety?<br>**→ Enforcement:** `bun install --frozen-lockfile` and
  `tsc --noEmit` are non-bypassable CI gates.
- **☁️ Cloudflare Native Integration:** Does the solution use our core platform
  primitives (`Workers`, `R2`, `D1`, `KV`) before considering external, complex
  infrastructure?<br>**→ Enforcement:** IaC scans using a strict Cloudflare
  resource whitelist.
- **🔐 Proactive Security Posture:** Has the tool been vetted for
  vulnerabilities and does it support our compliance needs?<br>**→
  Enforcement:** Shift-left security scanning (Snyk/Trivy) fails the build on
  critical/high CVEs; zero exceptions.
- **📊 Observability by Default:** Does the component emit metrics, logs, and
  traces in our standard format? "Black boxes" are forbidden.<br>**→
  Enforcement:** PR check for mandatory telemetry instrumentation before merge.

### 3. Operational Excellence

- **🤖 Full CI/CD Automation:** Can the component be built, tested, scanned, and
  deployed without manual intervention?<br>**→ Enforcement:** Pipeline
  definition linting for required stages and quality gates.
- **🧐 Built-in Observability:** Is the component instrumented to provide the
  four golden signals (Latency, Traffic, Errors, Saturation)?<br>**→
  Enforcement:** Synthetic monitoring probes are automatically created for new
  endpoints; health checks must pass for deployment.
- **💸 Cost-Efficient by Design:** Does the design leverage serverless,
  pay-per-use models to align cost with business value?<br>**→ Governance:** ARB
  review includes a mandatory cost-impact analysis for all new resources.
- **🛡️ Resiliency Through Design:** Have failure modes been documented? Does it
  implement retries, circuit breakers, and graceful degradation?<br>**→
  Governance:** Design doc template requires a "Failure Modes & Mitigations"
  section. **→ Enforcement:** Chaos engineering tests in staging.

---

## 🗺️ Applied Guidance: From Principle to Practice

| Scenario                | The Playbook Question                                                      | Mandatory Action                                                                    | **Enforcement & Verification**                                                                |
| :---------------------- | :------------------------------------------------------------------------- | :---------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| **New Feature**         | "What are the SLOs for latency and throughput at peak load?"               | Model load, prototype on `Workers`, use event-driven patterns.                      | **Load test results from staging are a required CI gate.** Results linked in PR.              |
| **New Data Store**      | "Why does this data not belong on D1 or R2?"                               | Default to edge-native storage. Centralized SQL requires exceptional justification. | **IaC pipeline blocks unapproved resources.** ARB exception required.                         |
| **Production Incident** | "What is the trace ID and where is the breach of SLO?"                     | Start with the trace. Diagnose using metrics, not logs.                             | **MTTR is a key team metric.** Post-incident review must identify playbook adherence gaps.    |
| **New npm Package**     | "Does it pass `bun audit` and have a clean security history?"              | Audit the package and its deep dependencies for licenses and CVEs.                  | **CI runs `bun audit` and license checks.** Failure blocks merge.                             |
| **Service Failure**     | "Is the failure contained, or does it cascade?"                            | Implement circuit breakers and timeouts on all external calls.                      | **Chaos tests verify resiliency.** Lack of circuit breakers is a critical bug.                |
| **Submitting a PR**     | "Does this PR have the required `ARB-Design-Doc:` tag and pass all gates?" | All changes must be traceable to an agreed-upon, playbook-aligned design.           | **CI gates check for valid ARB doc tag and required approvals.** Without it, merge is locked. |

---

## ✅ Governance & Compliance Framework

- **Architecture Review Board (ARB):**

  - **Authority:** The ARB is the governing body responsible for interpreting
    and enforcing this playbook.
  - **Process:** Mandatory design review for all epics and new services.
    Meetings are bi-weekly; decisions are logged in `org/arb-decisions`.
  - **Output:** Approval, Rejection, or Conditional Approval with specific
    playbook-based requirements.

- **Playbook Evolution:**

  - Changes to this document are made via Pull Request.
  - Requires a ⅔ majority vote from the ARB and a one-week review period for the
    entire engineering team.
  - All changes must be backward compatible or include a clear, funded migration
    path.

- **Onboarding & Certification:**

  - Reading this playbook is Day 1 onboarding.
  - **Certification:** All engineers must pass a practical, scenario-based
    certification quiz within their first 30 days.

- **Continuous Compliance Audit:**
  - An automated script (`scripts/playbook-auditor`) runs weekly, scanning all
    repos.
  - **Metrics Tracked:** PR compliance, ARB exceptions, security gate failures,
    observability coverage.
  - Results are published to the compliance dashboard and reviewed quarterly by
    engineering leadership. **Teams are accountable for their compliance
    metrics.**

**This playbook is our blueprint for excellence. Let's build with discipline,
measure what matters, and deploy with confidence.**

---

## 📋 Implementation Status

### 🔧 Automated Enforcement (Current Status)

- [x] **ARB Design Document Validation** - CI gates for PR tagging
- [x] **Security Gate Enforcement** - Snyk/Trivy integration
- [x] **Performance Budgets** - Automated SLO validation
- [ ] **Dependency Analysis** - Deep dependency security scanning
- [ ] **IaC Resource Whitelisting** - Cloudflare-only deployments
- [ ] **Contract Testing** - API schema validation
- [ ] **Chaos Engineering** - Automated resiliency testing

### 📊 Compliance Metrics Dashboard

**Live Dashboard:**
[Engineering Playbook Compliance](https://grafana.internal/dashboards/playbook-compliance)

| Metric                        | Current | Target | Status |
| ----------------------------- | ------- | ------ | ------ |
| ARB Design Doc Compliance     | 94%     | 100%   | ⚠️     |
| Security Gate Pass Rate       | 98%     | 100%   | ✅     |
| Performance Budget Violations | 2%      | 0%     | ⚠️     |
| Observability Coverage        | 89%     | 95%    | 🔶     |

### 🏗️ ARB Decision Log

**Latest Decisions:**

- **ARB-2025-001:** Approved CQRS implementation for betting engine (2025-08-30)
- **ARB-2025-002:** Rejected centralized PostgreSQL for user data (2025-08-28)
- **ARB-2025-003:** Conditional approval for external payment processor
  (2025-08-25)

---

### 📚 Glossary

- **ARB:** Architecture Review Board
- **CQRS:** Command Query Responsibility Segregation
- **IaC:** Infrastructure as Code
- **SLO:** Service Level Objective
- **CVE:** Common Vulnerabilities and Exposures
- **MTTR:** Mean Time To Recovery

### 📋 Change Log

- **v2.0 (Current):** Elevated to "Constitution" status. Strengthened
  enforcement language, clarified ARB authority, and introduced the concept of a
  "Compliance Framework" and team accountability.
- **v1.1 (2025-08-30):** Enhanced with automated validation steps, integrated
  compliance dashboard, and explicit ARB processes.
- **v1.0 (2025-08-15):** Initial version ratified and published.
