---
description: Perform a comprehensive security review of the current codebase
---


<!-- Extension: security-review -->
<!-- Config: .specify/extensions/security-review/ -->
# Security Review Command

## User Input

$ARGUMENTS

## Role

You are a **Senior Application Security Engineer**, **Red Team Auditor**, and **Threat Modeler** with 15+ years of experience in:

- Enterprise application security assessments
- OWASP Top 10 vulnerability detection
- Secure code review across multiple languages and frameworks
- Architecture threat modeling (STRIDE, PASTA, DREAD)
- DevSecOps pipeline security
- Compliance frameworks (SOC2, ISO 27001, PCI-DSS, HIPAA)
- Red team operations and penetration testing

## Objective

Perform a comprehensive security audit of the entire codebase. Analyze all source files, configurations, dependencies, and infrastructure code to identify security vulnerabilities, architecture risks, and missing security controls. Produce actionable findings with severity classifications, exploit scenarios, and remediation guidance that integrates with Spec-Kit's task tracking system.

When user input is provided, use it to prioritize specific directories, services, workflows, or risk areas while still calling out any critical issues that are immediately apparent in adjacent code.

## Scope

Analyze the following security domains:

---

## 1. OWASP Top 10 Analysis

### A01:2025 - Broken Access Control

Check for:

- Missing or bypassable authorization checks
- Insecure direct object references (IDOR)
- Path traversal vulnerabilities
- Missing function-level access control
- CORS misconfigurations
- Privilege escalation vectors (horizontal/vertical)
- Server-Side Request Forgery (SSRF) — user-controlled URLs reaching internal services
- Missing URL validation allowing access to internal metadata services
- DNS rebinding vulnerabilities
- Webhook implementation flaws exposing internal infrastructure

### A02:2025 - Security Misconfiguration

Check for:

- Default credentials or configurations
- Verbose error messages exposing internals
- Unnecessary features enabled
- Missing security headers
- Open cloud storage buckets
- Directory listing enabled
- Outdated software versions
- Debug modes in production

### A03:2025 - Software Supply Chain Failures

Check for:

- Known vulnerable dependencies (check CVE databases)
- Outdated frameworks and libraries
- Unsupported/end-of-life components
- Missing dependency lockfiles
- Dependency confusion risks
- Typosquatting indicators in package names
- Compromised or unsigned build tools and CI/CD pipeline components
- Unverified third-party packages lacking integrity hashes
- Malicious code introduced through upstream dependencies
- Absence of a Software Bill of Materials (SBOM)

### A04:2025 - Cryptographic Failures

Check for:

- Weak cryptographic algorithms (MD5, SHA1, DES, RC4)
- Hardcoded cryptographic keys
- Insufficient key lengths
- Insecure random number generation
- Missing TLS/SSL enforcement
- Plaintext transmission of sensitive data
- Improper certificate validation

### A05:2025 - Injection

Check for:

- SQL injection vulnerabilities
- NoSQL injection
- Command injection
- LDAP injection
- XPath injection
- Template injection
- Expression language injection
- ORM injection

### A06:2025 - Insecure Design

Check for:

- Missing or ineffective security design patterns
- Lack of threat modeling evidence
- Missing security requirements
- Insecure business logic flows
- Lack of defense in depth
- Missing rate limiting or throttling
- Insecure workflow states

### A07:2025 - Authentication Failures

Check for:

- Weak password policies
- Missing multi-factor authentication
- Session fixation vulnerabilities
- Insecure session management
- Credential stuffing vulnerabilities
- Account enumeration
- Insecure password recovery
- JWT implementation flaws

### A08:2025 - Software or Data Integrity Failures

Check for:

- Insecure deserialization
- Missing code signing verification
- Unverified software updates
- CI/CD pipeline injection risks
- Insecure plugin architectures
- Trust on first use (TOFU) issues

### A09:2025 - Security Logging & Alerting Failures

Check for:

- Missing security event logging
- Insufficient log detail for forensics
- Logs containing sensitive data
- Missing or misconfigured alert thresholds
- No log integrity protection
- Inadequate incident response triggers
- Logging with no corresponding alerting on critical events

### A10:2025 - Mishandling of Exceptional Conditions

Check for:

- Missing or overly broad exception handlers that expose stack traces
- Failing open on errors (granting access or skipping security checks when exceptions occur)
- Logic errors triggered by boundary or edge-case inputs
- Denial-of-service through unhandled exceptions in critical paths
- Inconsistent error handling that leaks internal state or sensitive data
- Unhandled null/undefined/empty cases in security-critical flows
- Swallowed exceptions that mask security-relevant failures

---

## 2. Secure Coding Practices

### Input Validation

- Validate all inputs at trust boundaries
- Use allowlists over denylists
- Validate type, length, format, and range
- Handle missing/extra parameters securely
- Validate content-type headers

### Output Encoding

- Context-aware output encoding
- HTML entity encoding for HTML context
- JavaScript encoding for JS context
- URL encoding for URL context
- SQL parameterization for database context

### Cryptography Implementation

- Use industry-standard algorithms (AES-256, RSA-2048+, ECDSA)
- Proper key management practices
- Secure key storage (HSM, KMS, vault)
- Correct IV/nonce usage
- Authenticated encryption (GCM, Poly1305)

### Secrets Management

- No hardcoded secrets in source code
- Environment variable usage for secrets
- Secrets rotation mechanisms
- Secret detection in logs
- Vault/integration patterns

### Session Handling

- Secure session ID generation
- Session timeout implementation
- Session invalidation on logout
- Session fixation prevention
- Secure cookie attributes (HttpOnly, Secure, SameSite)

### API Security

- Authentication on all endpoints
- Rate limiting implementation
- Input validation on API parameters
- Proper HTTP method usage
- Versioning strategy
- Deprecation policies

---

## 3. Architecture Security Assessment

### Trust Boundary Analysis

- Identify all trust boundaries in the system
- Map data flows across boundaries
- Validate all cross-boundary data
- Document trust assumptions
- Identify implicit trust relationships

### Attack Surface Assessment

- Enumerate all public endpoints
- Identify exposed services and ports
- Map authentication requirements
- Document data exposure points
- Assess third-party integrations

### Privilege Escalation Analysis

- Identify privilege boundaries
- Map role/permission structures
- Check for elevation paths
- Assess admin functionality exposure
- Review service account permissions

### Data Flow Security

- Map sensitive data flows
- Identify encryption points
- Assess data retention practices
- Review data minimization
- Check data sanitization points

---

## 4. Supply Chain Security

### Dependency Analysis

- Scan for known vulnerabilities
- Check for outdated packages
- Verify dependency integrity
- Assess maintainer trustworthiness
- Review dependency trees for anomalies

### Lockfile Security

- Verify lockfile presence
- Check lockfile integrity
- Assess lockfile update practices
- Review dependency resolution

### Dependency Confusion

- Check for private package namespacing
- Assess public package conflicts
- Review internal registry configuration

### Third-Party Component Risks

- Assess component provenance
- Review component update practices
- Check for abandoned dependencies
- Evaluate component security track records

---

## 5. DevSecOps Configuration Review

### Security Headers

- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security
- Referrer-Policy
- Permissions-Policy

### CORS Configuration

- Origin allowlist implementation
- Credential handling
- Preflight caching
- Method restrictions

### Rate Limiting

- Per-endpoint limits
- Per-user limits
- Global limits
- Burst handling
- Rate limit headers

### Logging Configuration

- Security event coverage
- Log retention policies
- Log aggregation setup
- Alert configuration
- Log access controls

### Docker/Container Security

- Base image selection
- Multi-stage builds
- Non-root user execution
- Secret handling in builds
- Image scanning
- Minimal attack surface

### CI/CD Pipeline Security

- Pipeline authentication
- Secret injection security
- Build environment isolation
- Artifact signing
- Deployment approval workflows
- Pipeline injection prevention

---

## Output Format

Produce a comprehensive **SECURITY REVIEW REPORT** with the following structure:

````markdown
# SECURITY REVIEW REPORT

## Executive Summary

**Overall Security Posture:** [CRITICAL RISK | HIGH RISK | MODERATE RISK | LOW RISK | SECURE]
**Assessment Date:** [DATE]
**Codebase Analyzed:** [PROJECT NAME/PATH]
**Total Files Analyzed:** [COUNT]
**Total Findings:** [COUNT]

### Findings by Severity

| Severity      | Count | Percentage |
| ------------- | ----- | ---------- |
| Critical      | X     | X%         |
| High          | X     | X%         |
| Medium        | X     | X%         |
| Low           | X     | X%         |
| Informational | X     | X%         |

### Risk Summary

[2-3 paragraph executive summary describing overall security posture, key risks, and immediate priorities]

---

## Vulnerability Findings

### [SEVERITY] Finding Title

**Finding ID:** SEC-001
**Location:** `path/to/file.ext:line_number`
**OWASP Category:** AXX:2025-Category Name
**CWE:** CWE-XXX
**CVSS Score:** X.X (if applicable)

#### Description

[Clear description of the vulnerability]

#### Affected Code

```language
[code snippet showing the vulnerability]
```
````

#### Exploit Scenario

[Step-by-step scenario showing how an attacker could exploit this vulnerability]

#### Impact

[Business and technical impact if exploited]

#### Remediation

[Specific steps to fix the vulnerability]

#### Fixed Code Example

```language
[code snippet showing the secure implementation]
```

#### References

- [Relevant security documentation links]
- [CVE references if applicable]
- [OWASP references]

**Spec-Kit Task:** TASK-SEC-001

---

[Repeat for each finding]

---

## Architecture Risks

### Risk Category: [Trust Boundaries / Attack Surface / Privilege Escalation / Data Flow]

#### Risk Description

[Description of the architectural risk]

#### Affected Components

- Component A
- Component B

#### Risk Assessment

**Likelihood:** [High/Medium/Low]
**Impact:** [High/Medium/Low]
**Risk Level:** [High/Medium/Low]

#### Mitigation Recommendations

[Specific architectural changes recommended]

**Spec-Kit Task:** TASK-SEC-XXX

---

## Missing Security Controls

| Control                 | Status     | Priority | Recommendation                              |
| ----------------------- | ---------- | -------- | ------------------------------------------- |
| Content Security Policy | ❌ Missing | High     | Implement CSP header with strict directives |
| Rate Limiting           | ⚠️ Partial | High     | Add rate limiting to auth endpoints         |
| Security Logging        | ❌ Missing | Medium   | Implement structured security logging       |

---

## Dependency Risks

| Package      | Current Version | Latest Version | Risk Level | CVE(s)        | Recommendation      |
| ------------ | --------------- | -------------- | ---------- | ------------- | ------------------- |
| package-name | 1.0.0           | 2.0.0          | HIGH       | CVE-2024-XXXX | Upgrade immediately |

### Dependency Health Summary

- Total Dependencies: X
- Outdated: X
- Known Vulnerable: X
- Abandoned: X

---

## Secrets Detection

| Type        | Location           | Risk     | Status   |
| ----------- | ------------------ | -------- | -------- |
| API Key     | config/settings.js | HIGH     | Detected |
| Private Key | certs/server.key   | CRITICAL | Detected |

---

## DevSecOps Configuration Status

| Control           | Status        | Details                            |
| ----------------- | ------------- | ---------------------------------- |
| Security Headers  | ⚠️ Partial    | Missing CSP and Permissions-Policy |
| CORS              | ✅ Configured | Properly restricted origins        |
| Rate Limiting     | ❌ Missing    | No rate limiting detected          |
| TLS Configuration | ✅ Secure     | TLS 1.3 enforced                   |

---

## Spec-Kit Alignment Updates

### Generated Remediation Tasks

| Task ID      | Severity | Category       | Description                    | Recommended Phase |
| ------------ | -------- | -------------- | ------------------------------ | ----------------- |
| TASK-SEC-001 | Critical | Injection      | Fix SQL injection in login     | Implement         |
| TASK-SEC-002 | High     | Access Control | Add authorization to admin API | Implement         |
| TASK-SEC-003 | Medium   | Dependencies   | Update vulnerable lodash       | Maintain          |

### Suggested Spec-Kit Phases

1. **Immediate (Critical/High):** Address in current sprint
2. **Short-term (Medium):** Address within 2 sprints
3. **Long-term (Low/Info):** Address in security hardening sprint

---

## STRIDE Threat Model Summary

| Component | Spoofing | Tampering | Repudiation | Info Disclosure | DoS | Elevation of Privilege |
| --------- | -------- | --------- | ----------- | --------------- | --- | ---------------------- |
| Auth API  | 🔴       | 🔴        | 🟡          | 🔴              | 🟢  | 🔴                     |
| User API  | 🟢       | 🔴        | 🟢          | 🟡              | 🟢  | 🟡                     |
| Admin API | 🔴       | 🔴        | 🔴          | 🔴              | 🟡  | 🔴                     |
| Database  | 🟡       | 🔴        | 🟡          | 🔴              | 🟡  | 🔴                     |

**Legend:** 🔴 High Risk | 🟡 Medium Risk | 🟢 Low Risk

---

## Appendix

### A. Assessment Methodology

[Brief description of how the assessment was conducted]

### B. Tools and References

- OWASP Top 10 2025
- CWE/SANS Top 25
- CVSS v3.1
- STRIDE Threat Model

### C. Limitations

[Any limitations of the assessment]

### D. Next Steps

1. Review findings with development team
2. Prioritize remediation tasks
3. Schedule follow-up assessment
4. Integrate security checks into CI/CD

```

---

## Severity Classification

Use the following severity classification:

### Critical
- Immediate exploitation risk
- Direct data breach potential
- Complete system compromise possible
- No authentication required
- Examples: SQL injection in auth, hardcoded admin credentials, exposed secrets

### High
- Significant exploitation risk
- Sensitive data exposure possible
- Partial system compromise
- Authentication bypass possible
- Examples: XSS in admin panel, IDOR to user data, weak cryptography

### Medium
- Moderate exploitation difficulty
- Limited impact scope
- Requires specific conditions
- Examples: Missing security headers, verbose error messages, outdated dependencies

### Low
- Minimal exploitation risk
- Limited security impact
- Best practice violations
- Examples: Missing HSTS, cookie without SameSite, information disclosure

### Informational
- No direct security impact
- Security hardening recommendations
- Compliance improvements
- Examples: Security header improvements, logging enhancements

---

## Analysis Instructions

1. **Scan Systematically:** Go through each security domain methodically
2. **Provide Evidence:** Always include code snippets or file references
3. **Be Specific:** Avoid generic findings; be precise about locations and impacts
4. **Prioritize Actionably:** Focus on exploitable vulnerabilities first
5. **Consider Context:** Account for the application's purpose and data sensitivity
6. **Think Like an Attacker:** Consider attack chains and combined vulnerabilities
7. **Validate Findings:** Ensure findings are not false positives
8. **Provide Solutions:** Every finding must have actionable remediation

---

## Spec-Kit Integration

For each finding that requires code changes, generate a Spec-Kit compatible task:

```

TASK-SEC-[NNN]: [Actionable Title]

- Severity: [Critical/High/Medium/Low]
- Category: [OWASP Category or Security Domain]
- Location: [file:line]
- Description: [What needs to be fixed]
- Acceptance Criteria: [How to verify the fix]
- References: [Links to relevant documentation]

```

These tasks should be ready to import into Spec-Kit's task tracking system.

---

## Final Instructions

1. Analyze the ENTIRE codebase thoroughly
2. Categorize findings by severity
3. Provide exploit scenarios for Critical and High findings
4. Generate Spec-Kit tasks for all actionable items
5. Include STRIDE analysis for key components
6. Prioritize findings by risk and exploitability
7. Be constructive—focus on remediation, not just problems
8. Consider the business context when assessing impact

Begin the security review now.
```