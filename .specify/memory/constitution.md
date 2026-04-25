<!--
Sync Impact Report
- Version change: 1.2.0 -> 1.2.1
- Modified principles: Code Quality and Maintainability (clarified enforcement floor); Testing Standards and Verification (compressed task completion gate wording); Performance and Responsiveness (added explicit workload bounds); Platform and Security Constraints (generalized destructive operation rule and retained IPC completeness rule); Governance and Decision Rules (added sub-headers and compressed spec traceability wording)
- Added sections: none
- Removed sections: none
- Templates requiring updates: none
- Follow-up TODOs: none
-->

# neuzOS Constitution

## Core Principles

### I. Code Quality and Maintainability
All production code MUST be easy to read, easy to test, and easy to change. Public APIs, IPC payloads, persisted data, and shared types MUST be explicit and strongly typed. Prefer small focused functions, direct control flow, and clear names over clever abstractions. New work MUST leave the codebase more consistent than it found it, with duplication removed only when the replacement is simpler and easier to understand. TypeScript strict mode and ESLint define the minimum enforcement floor; deviations require explicit rationale in review.

### II. Testing Standards and Verification
Every meaningful change MUST have a clear verification path that matches its risk. Small local code changes MUST have at least a targeted smoke check; stateful, cross-process, persistence, or security-sensitive changes MUST have a stronger regression check or manual validation plan. When practical, tests SHOULD be written before implementation and should fail before the fix lands. If automated coverage is not practical, the change MUST include a precise manual test procedure that another engineer can repeat.

A task (`[X]`) is complete only when observable behavior has been verified at runtime; code-only review does not count. Tasks touching IPC handlers, persistence, file system operations, or UI rendering MUST include at least one manual smoke check of the end-to-end outcome (e.g., mutation persists after restart; element is visible and interactive). This applies equally to AI-assisted work.

### III. User Experience Consistency
User-facing changes MUST follow the product's existing vocabulary, layout patterns, motion patterns, and interaction conventions unless a deliberate improvement is justified and documented. New UI should feel like the same application, not a separate design system. Keyboard behavior, focus handling, empty states, copy, and error messaging are part of the UX contract and MUST be treated as first-class implementation details. When adding a new interaction, prefer the simplest pattern that matches adjacent screens and preserves predictable behavior.

### IV. Performance and Responsiveness
Interactive paths MUST stay responsive under the application's expected workload (<=100 sessions, <=20 groups, local operations). Avoid unnecessary rerenders, polling, expensive per-keystroke work, unbounded allocations, and blocking operations on the hot path. For stateful UI, prefer derived state and local mutation patterns that minimize churn. When a change could affect startup, typing latency, scrolling, window switching, or launch flows, it MUST be reviewed with an explicit performance expectation instead of assumed to be acceptable.

## Platform and Security Constraints

neuzOS is built on Bun, Electron, Svelte 5, Tailwind CSS, and TypeScript. The main and renderer processes MUST remain separated, and renderer code MUST not bypass the IPC bridge for privileged operations. Security-sensitive features such as webviews, detached windows, shortcuts, and protocol handling MUST follow Electron best practices with context isolation, sandboxing where applicable, and explicit input validation.

Any code that constructs a file system path from a platform API or framework convention (e.g., `app.getPath`, Electron partition paths, user data directories) MUST verify the actual runtime layout against authoritative documentation or a confirmed runtime log before use. Assumed paths MUST NOT be committed without confirmation, because destructive operations can succeed silently on non-existent paths. For any cross-process feature spanning renderer and main process, BOTH sides of the IPC contract MUST be implemented before the feature is considered complete.

## Development Workflow and Release Gates

Development SHOULD proceed on feature branches, then be merged into a local integration or staging branch for combined validation. Main MUST stay stable and should only receive reviewed, release-ready work. A release candidate is not considered complete until the integrated branch has been built and smoke-tested on the target platform, with special attention to Windows `.exe` output for release builds.

## Governance and Decision Rules

### Decision Priority
This constitution supersedes informal conventions and lower-level guidance when conflicts arise. Technical decisions MUST be justified against the core principles above before implementation begins. When principles conflict, prefer the option that best preserves correctness, then maintainability, then user experience consistency, then performance.

### Spec Traceability
Any substantial feature MUST begin with a Speckit `spec.md` that defines user scenarios, acceptance criteria, edge cases, and measurable success criteria; implementation plans and tasks MUST trace back to it, especially for renderer/UI changes, IPC contracts, persistence, or multi-step workflow features.

### Reviewer Gates and Exceptions
Reviewers MUST reject work that lacks a matching verification plan, that introduces avoidable UX inconsistency, or that adds performance risk without explanation. If a change must violate a principle, the implementation MUST be reworked or the exception MUST be documented with a clear rationale, scope, and follow-up plan. Exceptions are allowed only when the benefit is explicit and the cost is bounded.

### Amendments and Versioning
Any amendment MUST be recorded in this file, MUST include a version bump, and MUST update the last amended date. Versioning follows semantic rules: MAJOR for principle removals or redefinitions, MINOR for new principles or materially expanded guidance, and PATCH for clarifications or wording fixes.

Feature specs, plans, and tasks SHOULD remain aligned with this constitution so the workflow stays predictable across the repository.

**Version**: 1.2.1 | **Ratified**: 2026-04-20 | **Last Amended**: 2026-04-25
