---
description: 'Security review of staged changes only (git diff --cached)'
---

# Security Review — Staged Changes

## User Input

$ARGUMENTS

## Objective

Review **only the code that is currently staged for commit** — the output of `git diff --cached`. Do not review the rest of the codebase. Produce targeted security findings with severity, location, and remediation guidance.

## Steps

1. Run `git diff --cached` to retrieve the staged diff.
2. If the output is empty, stop and respond:
   > "No staged changes found. Stage files with `git add` before running this command."
3. Analyze only the staged diff for security issues across these domains:
   - Injection vulnerabilities (SQL, NoSQL, command, template)
   - Hardcoded secrets or credentials
   - Broken access control or missing authorization checks
   - Cryptographic failures (weak algorithms, hardcoded keys)
   - Security misconfiguration
   - Input validation gaps
   - Authentication or session weaknesses
   - Insecure data handling
   - Vulnerable or newly added dependencies
   - Supply chain risks in newly added packages
4. For each finding, report:
   - **Severity:** Critical / High / Medium / Low / Informational
   - **Location:** file path and line number from the diff
   - **OWASP Category:** 2025 code (e.g. `A05:2025-Injection`)
   - **Description:** what the issue is and why it matters
   - **Remediation:** specific fix with corrected code example where applicable
   - **Spec-Kit Task:** `TASK-SEC-NNN` action item
5. Produce an Executive Summary section with total finding counts by severity.
6. Explicitly confirm any patterns in the diff that appear secure.

When user input is provided via `$ARGUMENTS`, use it to prioritize specific concerns (e.g. "focus on secrets and injection") within the staged changes.

## Output Format

Use the same report structure as the full audit command:

```
# SECURITY REVIEW REPORT — STAGED CHANGES

## Executive Summary
...

## Staged Diff Reviewed
(show files changed)

## Vulnerability Findings
### [SEVERITY] Title
**Location:** file:line
**OWASP Category:** AXX:2025-...
**Description:** ...
**Remediation:** ...
**Spec-Kit Task:** TASK-SEC-NNN
...

## Confirmed Secure Patterns
...
```
