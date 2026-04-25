# Security Review Extension for Spec-Kit

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Spec-Kit Version](https://img.shields.io/badge/Spec--Kit-%3E%3D0.1.0-blue)](https://github.com/github/spec-kit)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](https://github.com/DyanGalih/spec-kit-security-review)

## Overview

The Security Review extension adds a dedicated security audit command to a Spec-Kit project. It is installed with the `specify` CLI and executed through the registered slash command `/speckit.security-review.audit`.

The command reviews application code, configuration, dependencies, and infrastructure files to surface:

- OWASP Top 10 (2025) issues
- Secure coding weaknesses
- Architecture and trust-boundary risks
- Supply-chain and dependency concerns
- DevSecOps configuration gaps

## How It Fits Spec-Kit

Spec-Kit uses the `specify` CLI to install and manage extensions. Once installed, the extension registers a slash command for your agent.

```text
specify extension add ...              # install/manage the extension
/speckit.security-review.audit         # full codebase security review
/speckit.security-review.staged        # review staged changes only
/speckit.security-review.branch <br>   # review a branch vs base branch
```

### Workflow Integration

```text
┌─────────────────────────────────────────────────────────────┐
│                    Spec-Kit Workflow                        │
├─────────────────────────────────────────────────────────────┤
│  /speckit.requirements    → Requirements Phase             │
│  /speckit.plan            → Planning Phase                 │
│  /speckit.implement       → Implementation Phase           │
│  /speckit.security-review.audit → Security Review Phase          │
│  /speckit.test            → Testing Phase                  │
│  /speckit.deploy          → Deployment Phase               │
└─────────────────────────────────────────────────────────────┘
```

## Installation

Run installation from a Spec-Kit project directory.

### Install from a Release Archive

```bash
cd /path/to/spec-kit-project

specify extension add security-review --from \
  https://github.com/DyanGalih/spec-kit-security-review/archive/refs/tags/v1.0.0.zip
```

### Install a Local Checkout for Development

```bash
cd /path/to/spec-kit-project

specify extension add --dev /path/to/spec-kit-security-review
```

### Verify Registration

```bash
specify extension list
ls .claude/commands/speckit.security-review.audit.*
```

If registration succeeded, open your agent session and run:

```text
/speckit.security-review.audit
```

Detailed setup and troubleshooting steps are in [docs/installation.md](docs/installation.md).

## Usage

Use the registered slash command from your Spec-Kit agent session.

### Basic Review

```text
/speckit.security-review.audit
```

### Scoped Review

The command file accepts free-form user input via `$ARGUMENTS`, so you can narrow the review scope in natural language.

```text
/speckit.security-review.audit focus on authentication, secrets handling, and payment flows
/speckit.security-review.audit review only the api and worker directories
/speckit.security-review.audit prioritize OWASP Top 10 and dependency risk
```

### Staged Changes Review

Review only files staged with `git add` — ideal as a pre-commit check.

```text
/speckit.security-review.staged
/speckit.security-review.staged focus on secrets and injection
```

### Branch Changes Review

Review only the diff between a feature branch and a base branch — ideal as a pre-merge check.

```text
/speckit.security-review.branch feature/payment-gateway
/speckit.security-review.branch feature/payment-gateway develop
```

All three commands produce a structured Markdown report with findings, severity, remediation guidance, and Spec-Kit-ready follow-up tasks.

Detailed examples are in [docs/usage.md](docs/usage.md) and [examples/example-output.md](examples/example-output.md).

## Example Output

Running `/speckit.security-review.audit` produces a report like this:

```markdown
# SECURITY REVIEW REPORT

## Executive Summary

**Overall Security Posture:** MODERATE RISK
**Total Findings:** 23

- Critical: 2
- High: 5
- Medium: 8
- Low: 6
- Informational: 2

## Vulnerability Findings

### [CRITICAL] SQL Injection in User Authentication

**Location:** `src/auth/login.js:45`
**OWASP Category:** A05:2025-Injection
**Description:** User input is concatenated directly into SQL query...
**Exploit Scenario:** Attacker could bypass authentication by...
**Remediation:** Use parameterized queries or ORM...
**Spec-Kit Task:** TASK-SEC-001

### [HIGH] Missing Authentication on Admin Endpoints

**Location:** `src/api/admin/routes.js`
**OWASP Category:** A01:2025-Broken Access Control
...
```

## Security Coverage

### OWASP Top 10 (2025)

- A01: Broken Access Control _(includes SSRF)_
- A02: Security Misconfiguration
- A03: Software Supply Chain Failures
- A04: Cryptographic Failures
- A05: Injection
- A06: Insecure Design
- A07: Authentication Failures
- A08: Software or Data Integrity Failures
- A09: Security Logging & Alerting Failures
- A10: Mishandling of Exceptional Conditions

### Additional Coverage

- Input validation and output encoding
- Secrets management and cryptographic handling
- Session and API security
- Trust boundaries and attack surface review
- Dependency, build, and CI/CD risk analysis

## Repository Structure

```text
.
├── extension.yml
├── config-template.yml
├── prompts/
│   ├── security-review.prompt.md
│   ├── security-review-staged.prompt.md
│   └── security-review-branch.prompt.md
├── docs/
├── examples/
└── assets/
```

## Contributing

Contributions should follow the upstream Spec-Kit extension conventions.

- Use the manifest schema described in the Spec-Kit Extension Development Guide
- Keep the registered command name in the `speckit.<extension>.<command>` format
- Preserve command-file frontmatter and Markdown structure
- Test local installs with `specify extension add --dev /path/to/extension`
- Verify registration with `specify extension list` and `.claude/commands/`

Reference guide: [Spec-Kit Extension Development Guide](https://github.com/github/spec-kit/blob/main/extensions/EXTENSION-DEVELOPMENT-GUIDE.md)

## Support

- Documentation: [docs/](docs/)
- Examples: [examples/](examples/)
- Issues: [GitHub Issues](https://github.com/DyanGalih/spec-kit-security-review/issues)
- Discussions: [GitHub Discussions](https://github.com/DyanGalih/spec-kit-security-review/discussions)

## License

This extension is released under the [MIT License](LICENSE).
