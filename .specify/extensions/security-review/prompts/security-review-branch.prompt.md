---
description: 'Security review of changes introduced on a branch compared to a base branch'
---

# Security Review — Branch Changes

## User Input

$ARGUMENTS

## Objective

Review **only the code changes introduced between a target branch and a base branch** — the output of `git diff <base>..<target>`. Do not review unchanged code in the full codebase. Produce targeted security findings with severity, location, and remediation guidance.

## Steps

1. Parse `$ARGUMENTS` to extract:
   - **target branch** — the branch to review (required)
   - **base branch** — the branch to compare against (default: `main`)
   - Format: `<target>` or `<target> <base>`
   - Examples: `feature/auth` or `feature/payment main` or `feature/payment develop`
   - If no target branch is provided, ask the user to specify one before continuing.
2. Run `git diff <base>..<target>` to retrieve the branch diff.
3. If the output is empty, stop and respond:
   > "No differences found between `<base>` and `<target>`. Ensure both branches exist and the target has commits not in the base."
4. Analyze only the diff for security issues across these domains:
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
5. For each finding, report:
   - **Severity:** Critical / High / Medium / Low / Informational
   - **Location:** file path and line number from the diff
   - **OWASP Category:** 2025 code (e.g. `A05:2025-Injection`)
   - **Description:** what the issue is and why it matters
   - **Remediation:** specific fix with corrected code example where applicable
   - **Spec-Kit Task:** `TASK-SEC-NNN` action item
6. Produce an Executive Summary section with total finding counts by severity.
7. Explicitly confirm any patterns in the diff that appear secure.

When user input contains additional instructions beyond branch names (e.g. "focus on auth flows"), use them to prioritize specific concerns within the diff.

## Output Format

Use the same report structure as the full audit command:

```
# SECURITY REVIEW REPORT — BRANCH: <target> vs <base>

## Executive Summary
...

## Branch Diff Reviewed
Target: <target>
Base:   <base>
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
