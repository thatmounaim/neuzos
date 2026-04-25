---
description: Generate a concise educational guide explaining the technical decisions, patterns, and concepts applied during feature implementation — designed to help early-career engineers learn senior-level reasoning from AI-assisted work.
scripts:
  sh: ../scripts/bash/check-prerequisites.sh
  ps: ../scripts/powershell/check-prerequisites.ps1
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

The user may optionally scope the guide to a specific phase, ticket, or topic (e.g., `Phase 3`, `PROJ-456`, `state management`). When provided, focus the guide on that scope. When omitted, cover the entire feature.

## Outline

Goal: After implementation (via `/speckit.implement` or `/speckit.jira.implement`), produce a `learn.md` file that teaches the user the reasoning behind what was built — the "why" behind every significant technical choice, the alternatives that existed, and the concepts worth internalizing.

This command is **read-only with respect to existing artifacts** — it only creates or updates `learn.md`. It does not modify spec, plan, tasks, or source code.

## Execution Steps

### 1. Load Feature Context

Run `{SCRIPT} --json --paths-only` from repo root and parse `FEATURE_DIR`, `FEATURE_SPEC`. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

Load all available artifacts from FEATURE_DIR:

- **REQUIRED**: `spec.md` — what was supposed to be built
- **REQUIRED**: `plan.md` — architecture, tech stack, file structure
- **REQUIRED**: `tasks.md` — what was actually executed (check completion status)
- **IF EXISTS**: `research.md` — decisions, rationale, alternatives considered
- **IF EXISTS**: `data-model.md` — entity design
- **IF EXISTS**: `contracts/` — API design
- **IF EXISTS**: `jira-map.md` — phase-to-ticket mapping (for scoped guides)

If `tasks.md` has zero completed tasks, **STOP** and report: "No implementation found yet. Run `/speckit.implement` first, then come back to learn from it."

### 2. Analyze the Implementation

Scan the completed tasks and referenced source files to build an internal inventory of:

**a. Technical Decisions** — choices made during planning/implementation where alternatives existed:
   - Read `research.md` for explicitly documented decisions and alternatives
   - Read `plan.md` for architecture choices (patterns, state management, data flow, API design)
   - Scan completed task descriptions and referenced files for implicit decisions (e.g., chose a pipe over a directive, used a subject instead of a signal, client-side vs server-side logic)

**b. Patterns & Concepts Applied** — recurring engineering patterns visible in the code:
   - Design patterns (observer, strategy, facade, etc.)
   - Framework-specific patterns (smart/dumb components, dependency injection, reactive streams, etc.)
   - Data patterns (normalization, denormalization, caching strategies, state shape)
   - Testing patterns (arrange-act-assert, test doubles, integration vs unit boundaries)

**c. Architecture Choices** — structural decisions about how things are organized:
   - Module/feature boundaries
   - Layer separation (data, presentation, business logic)
   - Routing strategy
   - Shared vs feature-scoped code

**d. Non-Obvious Implementation Details** — things a junior might miss or not understand:
   - Why something was done a certain way for performance, accessibility, or maintainability
   - Defensive coding choices (error handling, null checks, edge cases)
   - Framework conventions followed and why they matter

### 3. Prioritize Content

Not everything needs explaining. Filter to items where:
- A meaningful alternative existed (if there was only one sensible way, skip it)
- The reasoning isn't immediately obvious from reading the code
- Understanding the "why" builds transferable engineering judgment

Sort by educational value — concepts that generalize to future features first, feature-specific minutiae last.

If user provided a scope (phase, ticket, or topic), filter to only items relevant to that scope.

### 4. Generate learn.md

Write `FEATURE_DIR/learn.md` using the structure below. If the file already exists (e.g., from a prior run or partial feature), **merge** new content — append new sections, update existing ones if the implementation has progressed, but never remove prior content.

```markdown
# What I Learned: [Feature Name]

**Feature**: [feature short description from spec]
**Generated**: YYYY-MM-DD
**Scope**: [Full feature | Phase N | Ticket KEY] (based on user input or default)
**Implementation status**: [X/Y tasks completed]

---

## Key Decisions

For each significant decision (aim for 3–8 total, quality over quantity):

### [N]. [Decision Title — e.g., "Client-Side Filtering Instead of Server-Side"]

**What we did**: [1-2 sentences — the concrete choice made]

**Why**: [2-3 sentences — the reasoning, connecting it to project constraints, scale, UX goals, or simplicity]

**Alternatives considered**:
| Approach | Why it wasn't chosen |
|----------|---------------------|
| [Alternative A] | [1 sentence — the specific drawback in this context] |
| [Alternative B] | [1 sentence — the specific drawback in this context] |

**When you'd choose differently**: [1-2 sentences — under what conditions the alternative would be better. This is the most valuable part — it builds judgment for future projects.]

---

## Concepts to Know

For each notable pattern or concept (aim for 3–6):

### [Concept Name — e.g., "Smart vs Presentational Components"]

**What it is**: [2-3 sentences — plain-language explanation of the concept]

**Where we used it**: [reference specific files/components from the implementation]

**Why it matters**: [1-2 sentences — what problem it solves, what goes wrong without it]

---

## Architecture Overview

[Brief explanation of how the feature's code is organized and why — connect structure to the decisions above. Keep to 1 short paragraph + an optional ASCII/text diagram if the feature has 3+ distinct layers or modules.]

---

## Glossary

[Only include if the feature introduced domain-specific or framework-specific terms that a junior might need to look up. 3-8 terms max. Skip this section entirely if all terms are common knowledge.]

| Term | Meaning |
|------|---------|
| [Term] | [1 sentence definition in context of this feature] |
```

### 5. Content Quality Rules

- **Concise over comprehensive**: Each explanation should be the shortest version that still teaches the concept. If it takes more than 3 sentences, it's too long.
- **Concrete over abstract**: Always reference the actual files, components, or decisions from this feature — never generic textbook explanations.
- **Judgment over facts**: The most valuable content is "when you'd choose differently" and "why it matters" — these build decision-making skills, not just knowledge.
- **Honest about tradeoffs**: If the chosen approach has downsides, say so. Engineering is about tradeoffs, not "right answers."
- **No implementation walkthroughs**: This is NOT a code tour or line-by-line explanation. It's about the thinking, not the typing.
- **Mentoring tone**: Write as if explaining to a smart junior teammate over coffee — direct, practical, respectful. No condescension, no jargon without explanation.

### 6. Report Completion

After writing `learn.md`, output:
- Path to the generated file
- Count of decisions documented
- Count of concepts covered
- A one-line suggestion: if the user wants to dive deeper into any specific topic, they can re-run with a scoped argument (e.g., `/speckit.learn.review state management`)
