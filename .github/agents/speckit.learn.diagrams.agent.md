---
description: Generate visual diagram files (component, system design, software architecture)
  with Mermaid illustrations and reasoning derived from core spec artifacts — designed
  to help engineers internalize architecture before implementation.
scripts:
  sh: ../scripts/bash/check-prerequisites.sh
  ps: ../scripts/powershell/check-prerequisites.ps1
---


<!-- Extension: learn -->
<!-- Config: .specify/extensions/learn/ -->
## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

### Supported Flags

Parse `$ARGUMENTS` for the following flags. If no flag is provided, default to `--all`.

| Flag | Alias | Output File | Description |
|------|-------|-------------|-------------|
| `--all` | _(default)_ | _(scope-dependent, see below)_ | Generate all diagram types applicable to the spec's scope |
| `--cd` | `--component-diagram` | `component-diagram.md` | Component relationships, data flow, and module boundaries |
| `--sd` | `--system-design` | `system-design.md` | Infrastructure topology — databases, caches, queues, external services |
| `--sa` | `--software-architecture` | `software-architecture.md` | Architectural layers, patterns, and module organization |

Multiple flags can be combined: `--cd --sa` generates both component and architecture diagrams.

Any remaining text after flags is treated as a **scope filter** (e.g., `--cd Phase 3`), limiting the diagram to that phase, ticket, or topic.

## Outline

Goal: After planning artifacts exist (via `/speckit.plan` or equivalent), produce one or more Mermaid-illustrated Markdown files in `FEATURE_DIR` that visually represent the designed architecture — with reasoning that explains **why** each structural choice was made, not just what it is.

This command is **read-only with respect to existing artifacts** — it only creates or updates diagram files. It does not modify spec, plan, tasks, or source code.

**When to run**: After `/speckit.plan` (or `/speckit.task`) and before `/speckit.implement`. The diagrams serve as a visual "study the blueprint" step — they help the developer internalize the architecture before writing code.

## Execution Steps

### 1. Load Feature Context

Run `../scripts/powershell/check-prerequisites.ps1 --json --paths-only` from repo root and parse `FEATURE_DIR`, `FEATURE_SPEC`. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

Load all available artifacts from FEATURE_DIR:

- **REQUIRED**: `spec.md` — what is being built, scope, and constraints
- **REQUIRED**: `plan.md` — architecture decisions, tech stack, file structure, component design
- **IF EXISTS**: `research.md` — decisions, rationale, alternatives considered
- **IF EXISTS**: `data-model.md` — entity design, relationships, storage choices
- **IF EXISTS**: `contracts/` — API design, endpoint definitions
- **IF EXISTS**: `tasks.md` — task breakdown (for scope filtering and completion context)
- **IF EXISTS**: `learn.md` — prior learning guide (for cross-referencing decisions)

If `plan.md` does not exist, **STOP** and report: "No plan found yet. Run `/speckit.plan` first — diagrams are generated from planning artifacts."

### 2. Determine Spec Scope

Analyze the spec to classify the project scope as one of:

- **New project**: The spec describes building a system from scratch (greenfield). Indicators: no existing codebase referenced, infrastructure choices being made, full stack described.
- **Major feature**: The spec introduces significant new infrastructure or architectural patterns to an existing system. Indicators: new database, new service, new architectural layer, new integration.
- **Feature-scoped**: The spec describes a feature, enhancement, or change within an existing system without new infrastructure. Indicators: references existing codebase, extends existing patterns, no new infrastructure decisions.

This classification drives which diagram types are applicable under `--all`.

### 3. Determine Applicable Diagram Types

If the user specified explicit flags (`--cd`, `--sd`, `--sa`), generate exactly those — regardless of scope classification. The user knows what they want.

If the user specified `--all` (or no flags, which defaults to `--all`), apply scope-based filtering:

| Scope | CD | SD | SA |
|-------|----|----|-----|
| New project | ✓ | ✓ | ✓ |
| Major feature | ✓ | ✓ (scoped to new infrastructure) | ✓ (if new patterns introduced) |
| Feature-scoped | ✓ | ✗ | ✗ |

When a diagram type is skipped under `--all`, note it in the completion report with a one-line reason (e.g., "System design diagram skipped — spec is feature-scoped with no new infrastructure").

### 4. Generate Component Diagram (`component-diagram.md`)

Analyze `plan.md` (and `spec.md`, `data-model.md`, `contracts/` if present) to identify:

- Components/modules and their responsibilities
- Data flow between components (inputs, outputs, events)
- Dependencies (which component depends on which)
- External boundaries (APIs, databases, third-party services the feature touches)

Write `FEATURE_DIR/component-diagram.md`:

```markdown
# Component Diagram: [Feature Name]

**Feature**: [feature short description from spec]
**Generated**: YYYY-MM-DD
**Scope**: [Full feature | Phase N | Ticket KEY]

---

## Overview

[1-2 sentences: what this diagram shows and at what level of abstraction.]

## Component Diagram

```mermaid
[Mermaid flowchart, C4 component, or class diagram — whichever best represents the component relationships. Use flowchart TD/LR for simpler features, C4Component for larger ones.]
```

## Component Breakdown

For each significant component in the diagram:

### [Component Name]

**Role**: [1 sentence — what this component is responsible for]

**Why this exists as a separate component**: [1-2 sentences — the reasoning. Why not merge it into another component? What separation of concern does it enforce?]

**Key interactions**:
- → [Component B]: [what data/events flow and why]
- ← [Component C]: [what it receives and why]

---

## Design Reasoning

### Why this structure?

[2-4 sentences connecting the component structure back to decisions in plan.md and research.md. Reference specific constraints, scale requirements, or patterns that drove the decomposition.]

### Alternatives considered

| Structure | Why it wasn't chosen |
|-----------|---------------------|
| [Alternative decomposition A] | [1 sentence — specific drawback] |
| [Alternative decomposition B] | [1 sentence — specific drawback] |

_(Pull from research.md if available; otherwise infer from plan.md context. If no meaningful alternatives exist, omit this table.)_

### When you'd restructure

[1-2 sentences — under what conditions this component structure would need to change. E.g., "If the feature grows to handle real-time updates, the notification component would need to split into sync and async paths."]
```

If the file already exists, **merge** — update diagrams and reasoning sections, preserve prior content that's still valid, remove outdated content.

### 5. Generate System Design Diagram (`system-design.md`)

Analyze `plan.md`, `spec.md`, `data-model.md`, and `contracts/` to identify:

- Infrastructure components (databases, caches, message queues, object storage, CDN)
- Services and their communication patterns (REST, gRPC, events, webhooks)
- External integrations (third-party APIs, auth providers, payment gateways)
- Data flow at the system level (request path from client to storage and back)
- Scaling boundaries and failure domains

Write `FEATURE_DIR/system-design.md`:

```markdown
# System Design: [Feature/Project Name]

**Feature**: [feature short description from spec]
**Generated**: YYYY-MM-DD
**Scope**: [Full project | New infrastructure for feature]

---

## Overview

[2-3 sentences: what this system does at the highest level, who the actors are, and what the primary data flows look like.]

## System Design Diagram

```mermaid
[Mermaid flowchart or C4 context/container diagram showing infrastructure topology. Include: clients, load balancers, application servers, databases, caches, queues, external services. Use subgraphs for logical groupings.]
```

## Infrastructure Decisions

For each significant infrastructure choice:

### [Decision — e.g., "PostgreSQL for Primary Storage"]

**What**: [1 sentence — the concrete choice]

**Why**: [2-3 sentences — connect to spec constraints. E.g., "The spec requires relational queries across users, organizations, and permissions with strong consistency guarantees. PostgreSQL's ACID compliance and mature JSON support handle both structured relations and flexible metadata without a second store."]

**Alternatives considered**:
| Option | Why it wasn't chosen |
|--------|---------------------|
| [Alternative A] | [1 sentence — specific drawback in this context] |
| [Alternative B] | [1 sentence — specific drawback in this context] |

**When you'd choose differently**: [1-2 sentences — the conditions under which the alternative wins.]

---

## Data Flow

[Describe the primary request path(s) through the system. Use a numbered sequence or a Mermaid sequence diagram for complex flows.]

```mermaid
sequenceDiagram
[Primary happy-path flow through the system components]
```

## Scaling & Reliability Notes

[Brief notes on scaling strategy, failure modes, and recovery — only if the spec/plan addresses them. Skip if not relevant.]
```

### 6. Generate Software Architecture Diagram (`software-architecture.md`)

Analyze `plan.md` to identify:

- Architectural pattern(s) in use (layered, hexagonal, clean, MVC, CQRS, event-driven, etc.)
- Layer responsibilities and boundaries
- Dependency direction (which layers depend on which)
- Cross-cutting concerns (auth, logging, error handling, validation)
- Module organization strategy (by feature, by layer, hybrid)

Write `FEATURE_DIR/software-architecture.md`:

```markdown
# Software Architecture: [Feature/Project Name]

**Feature**: [feature short description from spec]
**Generated**: YYYY-MM-DD
**Scope**: [Full project | Architectural patterns for feature]

---

## Overview

[2-3 sentences: the architectural philosophy — what pattern is being used and why it fits this project.]

## Architecture Diagram

```mermaid
[Mermaid flowchart showing layers/modules, dependency direction, and boundaries. Use subgraphs for layers. Arrows show dependency direction (always point toward abstractions/interfaces).]
```

## Architectural Pattern: [Pattern Name]

**What it is**: [2-3 sentences — plain-language explanation of the pattern for someone unfamiliar.]

**Why this pattern**: [2-3 sentences — connect to project constraints, team size, expected change frequency, or complexity drivers from the spec.]

**Tradeoffs accepted**:
- ✓ [Key benefit this pattern provides in this context]
- ✓ [Another benefit]
- ✗ [Tradeoff accepted — e.g., "More boilerplate than a simpler structure, but the separation pays off as the feature grows"]

## Layer Breakdown

For each architectural layer or module boundary:

### [Layer/Module Name — e.g., "Domain Layer"]

**Responsibility**: [1 sentence]

**Depends on**: [list of layers this one imports from, or "nothing (innermost layer)"]

**Depended on by**: [list of layers that import from this one]

**Why this boundary exists**: [1-2 sentences — what would go wrong if this layer were merged with an adjacent one]

---

## Module Organization

**Strategy**: [By feature | By layer | Hybrid — and why]

[1-2 sentences explaining how files/folders map to the architecture diagram above. Reference the file structure from plan.md.]

## When This Architecture Evolves

[2-3 sentences — what signals would indicate this architecture needs to change. E.g., "If the project adds real-time collaboration, the synchronous request-response pattern would need to evolve toward event sourcing or CQRS for the shared-editing domain."]
```

### 7. Content Quality Rules

- **Reasoning over labels**: Every diagram element should have a "why" — not just "this is the database" but "why PostgreSQL, why not MongoDB, what constraint drove this."
- **Spec-grounded**: All reasoning must trace back to actual decisions in `plan.md`, `research.md`, or constraints in `spec.md`. Never invent rationale not supported by the artifacts.
- **Concrete references**: Name actual components, files, entities from the plan — not generic placeholders.
- **Mermaid best practices**: Keep diagrams readable — max ~15 nodes per diagram. For complex systems, use multiple focused diagrams rather than one cluttered one. Use consistent naming with the plan's terminology.
- **Honest about gaps**: If the plan doesn't specify a rationale for a choice, say so: "The plan doesn't document why X was chosen over Y — this may be worth clarifying with the team."
- **Mentoring tone**: Write as if walking a junior through the architecture at a whiteboard — direct, practical, connecting every element to a real purpose.
- **No redundancy across files**: Each diagram file covers its own abstraction level. Don't repeat component details in the system design file. Cross-reference instead: "See `component-diagram.md` for internal module structure."

### 8. Merge Behavior

If any output file already exists (e.g., from a prior run or an earlier phase):

- **Update** Mermaid diagrams to reflect current plan state
- **Preserve** reasoning sections that are still accurate
- **Remove** outdated content that contradicts current plan
- **Append** new sections for newly planned components or decisions
- Add a `**Last updated**: YYYY-MM-DD` line below the Generated date

### 9. Report Completion

After writing all applicable diagram files, output:

- Paths to generated files
- Scope classification (new project / major feature / feature-scoped) and which diagram types were generated
- For each diagram: count of components/nodes documented
- If any diagram types were skipped under `--all`, explain why in one line
- Suggestion: "Run `/speckit.learn.review` after implementation to pair these diagrams with a learning guide covering the decisions in practice."