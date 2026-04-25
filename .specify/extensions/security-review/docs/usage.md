# Usage Guide

This extension is used as a Spec-Kit slash command. Install it with the `specify` CLI, then run `/speckit.security-review.audit` inside your agent session.

## Basic Usage

From your Spec-Kit project, open your agent and run:

```text
/speckit.security-review.audit
```

That triggers a full review of the current project context and produces a security report with findings, remediation guidance, and follow-up tasks.

## Scoping the Review

The command accepts free-form user input through `$ARGUMENTS`. Use plain language to steer the review rather than CLI flags.

Examples:

```text
/speckit.security-review.audit focus on authentication and authorization flows
/speckit.security-review.audit review only the api, worker, and infra directories
/speckit.security-review.audit prioritize OWASP Top 10, secrets exposure, and dependency risk
/speckit.security-review.audit use speckit-security.yml as the team review brief
```

## What the Report Contains

The generated report is structured for engineering follow-up. Typical sections include:

1. Executive summary and overall risk posture
2. Finding-by-finding vulnerability details
3. Architecture and trust-boundary risks
4. Missing security controls
5. Dependency and supply-chain concerns
6. Secrets exposure findings
7. DevSecOps configuration issues
8. Spec-Kit-ready remediation tasks
9. STRIDE-oriented threat summary

See [../examples/example-output.md](../examples/example-output.md) for a representative report.

## Working with Findings

The report is intended to feed back into your normal Spec-Kit workflow.

- Use `/speckit.plan` to organize remediation work.
- Use `/speckit.implement` to apply fixes.
- Re-run `/speckit.security-review.audit` after changes to confirm the risk was reduced.

## Workflow Integration

```text
┌─────────────────────────────────────────────────────────────┐
│  1. /speckit.requirements    → Define requirements         │
│  2. /speckit.plan            → Plan implementation         │
│  3. /speckit.implement       → Ship changes                │
│  4. /speckit.security-review.audit → Audit security posture      │
│  5. /speckit.test            → Validate fixes              │
│  6. /speckit.deploy          → Release with confidence     │
└─────────────────────────────────────────────────────────────┘
```

## Recommended Review Patterns

### Baseline Review

```text
/speckit.security-review.audit establish a baseline for the whole repository
```

### Area-Specific Review

```text
/speckit.security-review.audit inspect the authentication, session, and admin flows
```

### Release Readiness Review

```text
/speckit.security-review.audit check release readiness with emphasis on exposed secrets, dependency risk, and missing controls
```

## Targeted Reviews

Use these commands when you want to review only changes, not the entire codebase.

### Staged Changes Review

Review only the files you have staged with `git add`, before you commit.

```text
/speckit.security-review.staged
```

With additional focus:

```text
/speckit.security-review.staged focus on secrets and injection risks
```

If nothing is staged, the command will tell you and stop. This is the fastest way to catch issues before a commit.

### Branch Changes Review

Review only the changes introduced on a branch compared to a base branch.

```text
/speckit.security-review.branch feature/payment-gateway
```

Specify a custom base branch (defaults to `main` if omitted):

```text
/speckit.security-review.branch feature/payment-gateway develop
```

With additional focus:

```text
/speckit.security-review.branch feature/auth main focus on authentication and session handling
```

This is ideal for pre-merge security checks in code review or CI workflows.

## Troubleshooting

### Command Not Found

Verify the extension is installed and registered:

```bash
specify extension list
ls .claude/commands/speckit.security-review.*
cat .specify/extensions/.registry
```

If needed, reinstall from your Spec-Kit project:

```bash
specify extension add security-review --from \
  https://github.com/DyanGalih/spec-kit-security-review/archive/refs/tags/v1.0.0.zip
```

### Review Is Too Noisy

Provide narrower instructions in the slash command input.

```text
/speckit.security-review.audit review only externally reachable APIs
```

### Review Missed Important Context

Point the command at the relevant area explicitly.

```text
/speckit.security-review.audit include the background worker, terraform, and deployment manifests
```

## Related Docs

- [installation.md](installation.md)
- [design.md](design.md)
- [../README.md](../README.md)
