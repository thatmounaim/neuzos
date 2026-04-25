# spec-kit-bugfix

A [Spec Kit](https://github.com/github/spec-kit) extension that adds a structured bugfix workflow — capture bugs discovered during implementation, trace them to spec artifacts, and surgically patch specs without regenerating from scratch.

## Problem

When bugs surface during implementation, the SDD workflow breaks down:

- No structured way to capture bugs and trace them back to spec requirements
- Spec gaps and conflicts are discovered but not recorded anywhere
- Developers fix code without updating spec, plan, or tasks — causing artifact drift
- Tasks marked complete turn out to be wrong, but there is no reopen mechanism
- No way to verify that bugfix changes are consistent across all artifacts

## Solution

The Bugfix Workflow extension adds three commands that close the gap between bug discovery and spec correction:

| Command | Purpose | Modifies Files? |
|---------|---------|-----------------|
| `/speckit.bugfix.report` | Capture a bug and trace it back to the relevant spec, plan, and task artifacts | Yes — creates bug report file |
| `/speckit.bugfix.patch` | Surgically update spec, plan, and tasks to address the reported bug | Yes — spec.md, plan.md, tasks.md |
| `/speckit.bugfix.verify` | Verify that bugfix patches are consistent across all spec artifacts | No — read-only |

## Installation

```bash
specify extension add --from https://github.com/Quratulain-bilal/spec-kit-bugfix/archive/refs/tags/v1.0.0.zip
```

## Bug Types

The extension classifies bugs into five categories:

| Type | Description | Example |
|------|-------------|---------|
| Spec gap | Requirement missing from spec | Auth flow doesn't handle expired tokens |
| Spec conflict | Two requirements contradict | "Must be stateless" vs "Must track sessions" |
| Implementation drift | Code diverges from spec | Spec says REST, code uses GraphQL |
| Untested flow | Edge case not covered | Concurrent user updates not handled |
| Dependency issue | External dependency changed | API response format differs from assumption |

## Workflow

```
Bug discovered during /speckit.implement
       │
       ▼
/speckit.bugfix.report     ← Capture bug, trace to artifacts, classify
       │
       ▼
/speckit.bugfix.patch      ← Surgically update spec, plan, tasks
       │
       ▼
/speckit.bugfix.verify     ← Confirm all artifacts are consistent
       │
       ▼
/speckit.implement         ← Resume implementation with corrected specs
```

## Commands

### `/speckit.bugfix.report`

Captures a bug and produces a structured report with full artifact traceability:

- Classifies the bug type (spec gap, conflict, drift, untested flow, dependency)
- Maps to affected user stories, requirements, and tasks by ID
- Identifies root cause (spec oversight, changed requirement, or implementation error)
- Saves report to `specs/{feature}/bugs/BUG-{NNN}.md`

### `/speckit.bugfix.patch`

Surgically updates spec artifacts based on a bug report:

- Adds missing requirements to spec.md under the affected user story
- Marks conflicting text with strikethrough and reason (never deletes)
- Reopens falsely completed tasks with `(reopened — BUG-NNN)` annotation
- Adds new tasks with sequential IDs and proper dependencies
- Updates Wave DAG if present
- Tracks all changes with bugfix notes and dates

### `/speckit.bugfix.verify`

Read-only consistency check after patching:

- Verifies all bug reports are patched
- Checks spec requirements have corresponding plan sections and tasks
- Confirms reopened tasks are properly annotated
- Validates task ID sequencing and dependency DAG
- Reports cross-artifact traceability status

## Hooks

The extension registers an optional hook:

- **after_implement**: Runs bugfix consistency check after implementation completes

## Design Decisions

- **Report before patch** — always capture and classify the bug before modifying artifacts
- **Surgical updates** — only change what is necessary, never regenerate from scratch
- **Never delete content** — superseded text gets strikethrough, preserving history
- **Reopen, don't delete tasks** — falsely completed tasks are reopened with annotation
- **Bug report files** — each bug gets its own file for traceability and history
- **Consistent with Spec Kit patterns** — uses the same refinement note format and staleness tracking

## Requirements

- Spec Kit >= 0.4.0

## Related

- Issue [#619](https://github.com/github/spec-kit/issues/619) — New `/bugfix` Slash Command (25+ upvotes, maintainer-approved as extension)

## License

MIT
