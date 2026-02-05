# DuoPlus Code of Conduct

> **Building a respectful, inclusive, and professional engineering community**

**Document ID:** `DUO-COC-1.0`
**Effective Date:** 2026-01-16
**Compliance:** SOC2 Type II | ISO-27001

---

## Our Pledge

We as members, contributors, and leaders pledge to make participation in our
community a harassment-free experience for everyone, regardless of age, body
size, visible or invisible disability, ethnicity, sex characteristics, gender
identity and expression, level of experience, education, socio-economic status,
nationality, personal appearance, race, religion, or sexual identity
and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming,
diverse, inclusive, and healthy community.

## Our Standards

### Expected Behavior Matrix

| Behavior | Description | Example |
|----------|-------------|---------|
| **Empathy & Kindness** | Demonstrate understanding toward others | "I see where you're coming from..." |
| **Respectful Disagreement** | Accept differing viewpoints professionally | "I understand your approach, but have you considered..." |
| **Constructive Feedback** | Give and receive feedback gracefully | "This could be improved by..." |
| **Accountability** | Accept responsibility for mistakes | "I made an error here, let me fix it" |
| **Community Focus** | Prioritize project over individual | Collaborative problem-solving |

### Unacceptable Behavior Matrix

| Behavior | Severity | Consequence |
|----------|----------|-------------|
| **Sexualized language/imagery** | CRITICAL | Immediate ban |
| **Trolling/derogatory comments** | HIGH | Warning → temp ban → permanent ban |
| **Personal/political attacks** | HIGH | Warning → temp ban → permanent ban |
| **Harassment (public/private)** | CRITICAL | Immediate ban |
| **Doxxing/privacy violations** | CRITICAL | Immediate ban + legal action |
| **Unprofessional conduct** | MEDIUM | Warning → escalation |

## Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of
acceptable behavior and will take appropriate and fair corrective action in
response to any behavior that they deem inappropriate, threatening, offensive,
or harmful.

Community leaders have the right and responsibility to remove, edit, or reject
comments, commits, code, wiki edits, issues, and other contributions that are
not aligned to this Code of Conduct, and will communicate reasons for moderation
decisions when appropriate.

## Scope

This Code of Conduct applies within all community spaces, and also applies when
an individual is officially representing the community in public spaces.
Examples of representing our community include using an official e-mail address,
posting via an official social media account, or acting as an appointed
representative at an online or offline event.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported to the community leaders responsible for enforcement at
conduct@duoplus.dev.
All complaints will be reviewed and investigated promptly and fairly.

All community leaders are obligated to respect the privacy and security of the
reporter of any incident.

## Enforcement Guidelines

Community leaders will follow these Community Impact Guidelines in determining
the consequences for any action they deem in violation of this Code of Conduct:

### Enforcement Escalation Matrix

| Level | Trigger | Action | Duration |
|-------|---------|--------|----------|
| **1. Correction** | First minor violation | Private written warning | Documented, no restrictions |
| **2. Warning** | Repeated minor OR single moderate | No interaction with involved parties | Specified period |
| **3. Temporary Ban** | Serious violation OR sustained inappropriate behavior | Ban from all community interaction | 7-30 days |
| **4. Permanent Ban** | Pattern of violations OR CRITICAL offense | Permanent removal from community | Indefinite |

### Response Time SLA

| Severity | Initial Response | Resolution Target |
|----------|------------------|-------------------|
| **CRITICAL** | 2 hours | 24 hours |
| **HIGH** | 4 hours | 48 hours |
| **MEDIUM** | 24 hours | 1 week |
| **LOW** | 48 hours | 2 weeks |

### Detailed Consequences

#### 1. Correction

**Community Impact**: Use of inappropriate language or other behavior deemed
unprofessional or unwelcome in the community.

**Consequence**: A private, written warning from community leaders, providing
clarity around the nature of the violation and an explanation of why the
behavior was inappropriate. A public apology may be requested.

#### 2. Warning

**Community Impact**: A violation through a single incident or series
of actions.

**Consequence**: A warning with consequences for continued behavior. No
interaction with the people involved, including unsolicited interaction with
those enforcing the Code of Conduct, for a specified period of time. This
includes avoiding interactions in community spaces as well as external channels
like social media. Violating these terms may lead to a temporary or
permanent ban.

#### 3. Temporary Ban

**Community Impact**: A serious violation of community standards, including
sustained inappropriate behavior.

**Consequence**: A temporary ban from any sort of interaction or public
communication with the community for a specified period of time. No public or
private interaction with the people involved, including unsolicited interaction
with those enforcing the Code of Conduct, is allowed during this period.
Violating these terms may lead to a permanent ban.

#### 4. Permanent Ban

**Community Impact**: Demonstrating a pattern of violation of community
standards, including sustained inappropriate behavior, harassment of an
individual, or aggression toward or disparagement of classes of individuals.

**Consequence**: A permanent ban from any sort of public interaction within
the community.

## Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage],
version 2.1, available at
[https://www.contributor-covenant.org/version/2/1/code_of_conduct.html][v2.1].

Community Impact Guidelines were inspired by
[Mozilla's code of conduct enforcement ladder][mozilla coc].

For answers to common questions about this code of conduct, see the FAQ at
[https://www.contributor-covenant.org/faq][faq]. Translations are available
at [https://www.contributor-covenant.org/translations][translations].

[homepage]: https://www.contributor-covenant.org
[v2.1]: https://www.contributor-covenant.org/version/2/1/code_of_conduct.html
[mozilla coc]: https://github.com/mozilla/diversity
[faq]: https://www.contributor-covenant.org/faq
[translations]: https://www.contributor-covenant.org/translations

---

## Engineering-Specific Guidelines

### Code Review Conduct Matrix

| Do | Don't |
|----|-------|
| Focus on the code, not the author | Make personal comments about skill level |
| Explain the "why" behind suggestions | Just say "this is wrong" |
| Offer alternatives when critiquing | Only criticize without solutions |
| Acknowledge good work | Only point out problems |
| Be timely with reviews | Let PRs languish without feedback |

### PR Interaction Matrix

| Situation | Appropriate Response |
|-----------|---------------------|
| Disagreement on approach | "Have you considered X? Here's why it might work better..." |
| Bug found | "I noticed a potential issue at line X. Here's a suggestion..." |
| Style preference | Defer to existing codebase standards |
| Security concern | Flag immediately, explain impact privately if sensitive |
| Learning opportunity | Offer resources, pair programming sessions |

### Technical Debates

| Principle | Description |
|-----------|-------------|
| **Data-driven decisions** | Back arguments with benchmarks, not opinions |
| **Document trade-offs** | Acknowledge pros and cons of each approach |
| **Time-box debates** | If unresolved after 30 min, escalate to tech lead |
| **Disagree and commit** | Once decided, support the decision fully |
| **Blameless post-mortems** | Focus on systems, not individuals |

---

## AI Code Transparency (P-009)

**Rule**: Code generated or significantly modified by AI tools must be properly disclosed and tagged.

### AI Disclosure Matrix

| AI Usage Level | Required Tag | Disclosure | Review Requirements | Audit Trail |
|----------------|--------------|------------|---------------------|-------------|
| **Fully Generated** | `[AI][GENERATED]` | Full disclosure in PR | Standard + AI review checklist | `{model:*,prompt_hash:*}` |
| **Significantly Modified** | `[AI][MODIFIED]` | Note which sections | Standard review | `{model:*}` |
| **AI-Assisted** | `[AI][ASSISTED]` | Optional note | Standard review | Optional |
| **Human-only** | No tag needed | N/A | Standard review | N/A |

### AI Tag Examples

**Compliant:**
```typescript
// [AI][GENERATED][FEAT][MEDIUM][#REF:AI-1A2B][META:{model:claude-3.5-sonnet,prompt_hash:a1b2c3}]
// Optimize CRC32 checksum calculation
```

**Non-Compliant:**
- Submitting AI-generated code without disclosure
- Using AI to bypass security reviews
- Obfuscating AI involvement in `[SEC]` fixes

### AI Code Review Checklist

| Check | Required For | Verification |
|-------|--------------|--------------|
| **License compliance** | All AI code | No copyleft contamination |
| **Security review** | `[SEC]` tags | Manual security audit |
| **Test coverage** | All AI code | ≥90% for AI-generated |
| **Hallucination check** | API/library calls | Verify methods exist |
| **Performance baseline** | `[PERF]` tags | Benchmark comparison |

---

## Reporting & Support Matrix

| Method | Use Case | Contact | Response SLA |
|--------|----------|---------|--------------|
| **Email** | Confidential reports | conduct@duoplus.dev | 24 hours |
| **Slack DM** | Quick, informal concerns | @community-moderators | 4 hours |
| **GitHub** | Public issues | Security tab | 48 hours |
| **Emergency** | Immediate threats | #hr-team | 2 hours |

---

**Version:** 1.1.0
**Last Updated:** 2026-01-16
**Maintainer:** DuoPlus Community Team
**Review Cycle:** Quarterly
**Schema:** [tag-schema-v6.1.json](../config/tag-schema-v6.1.json)
