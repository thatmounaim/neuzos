# Design Document

This document explains how the Security Review extension is structured and how it aligns with the Spec-Kit Extension Development Guide.

## Overview

The extension is intentionally lightweight. It does not ship a compiled runtime or a custom binary. Instead, it registers a prompt-backed slash command that Spec-Kit exposes to the agent after installation.

Core model:

- `specify` installs and manages the extension
- `extension.yml` declares metadata and command registration
- `prompts/security-review.prompt.md` is the command file executed by the agent
- The agent runs the command as `/speckit.security-review.audit`

## Guide Alignment

The upstream Extension Development Guide establishes four important conventions that this repository now follows:

1. Manifest schema uses top-level `extension`, `requires`, and `provides` sections.
2. Registered command names follow `speckit.<extension>.<command>`.
3. Command files start with YAML frontmatter and then use Markdown body content.
4. Local installation and registration are project-scoped under `.specify/` and `.claude/`.

## Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                      Spec-Kit Project                        │
│                                                              │
│  specify extension add ...                                   │
│            │                                                 │
│            ▼                                                 │
│   .specify/extensions/                                       │
│   .claude/commands/speckit.security-review.audit.md                │
│            │                                                 │
│            ▼                                                 │
│   /speckit.security-review.audit                                   │
│            │                                                 │
│            ▼                                                 │
│   prompts/security-review.prompt.md                          │
│            │                                                 │
│            ▼                                                 │
│   Security report with findings and remediation tasks        │
└──────────────────────────────────────────────────────────────┘
```

## Repository Structure

```text
security-review-extension/
├── extension.yml
├── config-template.yml
├── prompts/
│   └── security-review.prompt.md
├── docs/
│   ├── installation.md
│   ├── usage.md
│   └── design.md
├── examples/
│   └── example-output.md
└── assets/
```

## Manifest Design

The manifest is declarative and minimal.

- `extension`: identity, version, repository, and descriptive metadata
- `requires`: Spec-Kit compatibility requirement
- `provides.commands`: slash-command registration
- `tags`: catalog and discovery metadata

The command remains named `speckit.security-review.audit` because the development guide reserves that namespace for extension commands even though installation and management are done through the `specify` CLI.

## Command File Design

The command file follows the guide's command-file format:

1. YAML frontmatter for metadata
2. Markdown body for the actual command instructions
3. `$ARGUMENTS` passthrough so the user can supply natural-language scoping input

This lets the extension stay prompt-driven while still supporting targeted reviews such as focusing on authentication, secrets, or specific directories.

## Security Coverage Model

The prompt is organized around these review layers:

### OWASP Top 10 (2025)

| Category                                  | Coverage Summary                           |
| ----------------------------------------- | ------------------------------------------ |
| A01 Broken Access Control                 | Authorization gaps, IDOR, SSRF             |
| A02 Security Misconfiguration             | Headers, defaults, exposed internals       |
| A03 Software Supply Chain Failures        | Dependencies, lockfiles, build integrity   |
| A04 Cryptographic Failures                | Weak crypto, key handling, TLS             |
| A05 Injection                             | SQL, NoSQL, command, template injection    |
| A06 Insecure Design                       | Missing controls, unsafe workflows         |
| A07 Authentication Failures               | Session, password, MFA, token flaws        |
| A08 Software or Data Integrity Failures   | Deserialization, update trust, CI/CD abuse |
| A09 Security Logging & Alerting Failures  | Logging coverage and alerting quality      |
| A10 Mishandling of Exceptional Conditions | Fail-open paths and unsafe error handling  |

### Additional Analysis Layers

- Secure coding practices
- Architecture and trust boundaries
- Supply-chain and dependency review
- DevSecOps configuration review
- STRIDE-oriented threat framing

## Installation and Registration Model

The extension guide treats installation as project-local.

### Release install

```bash
cd /path/to/spec-kit-project
specify extension add security-review --from <release-zip>
```

### Development install

```bash
cd /path/to/spec-kit-project
specify extension add --dev /path/to/spec-kit-security-review
```

### Registration checks

```bash
specify extension list
ls .claude/commands/speckit.security-review.audit.*
cat .specify/extensions/.registry
```

## Output Design

The report format is optimized for remediation, not just detection. Each finding should include:

- Severity and location
- OWASP mapping
- Risk explanation
- Exploit scenario where relevant
- Concrete remediation guidance
- Spec-Kit-ready follow-up tasks

## Design Tradeoffs

### Why a Prompt-Backed Command

- Easier to maintain than a language-specific scanner
- Works across mixed-language repositories
- Lets the agent explain why a finding matters

### Why Natural-Language Scoping Instead of CLI Flags

- Matches the command-file model in the extension guide
- Avoids inventing a parallel standalone CLI interface
- Keeps the prompt flexible for different review contexts

### Why Project-Local Installation

- Matches the upstream development guide
- Makes command registration explicit and inspectable
- Keeps extension behavior tied to the current Spec-Kit project

## Future Enhancements

- Add a manifest-managed config entry if the project moves from an optional review brief to a formal extension configuration file
- Add `.extensionignore` if release packaging should exclude development-only content
- Add automated manifest and command-file validation tests
