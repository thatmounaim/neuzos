# spec-kit-learn

A [Spec Kit](https://github.com/github/spec-kit) extension that generates educational guides from AI-assisted implementations and enhances spec clarifications with mentoring context — designed to help early-career engineers build senior-level engineering judgment.

## What it does

This extension adds three commands:

| Command | Description |
|---------|-------------|
| `/speckit.learn.review` | Generates a `learn.md` guide explaining the technical decisions, patterns, and concepts applied during implementation |
| `/speckit.learn.clarify` | Enhanced `/speckit.clarify` that includes "Why this matters" context, pros/cons analysis, and recommended options for each clarification |
| `/speckit.learn.diagrams` | Generates Mermaid-illustrated Markdown files for component diagrams, system design, and software architecture with spec-grounded reasoning |

### `/speckit.learn.review` — Learn from what was built

After running `/speckit.implement`, this command analyzes the completed work and produces a concise `learn.md` that covers:

- **Key Decisions** — what was chosen, why, what alternatives existed, and when you'd choose differently
- **Concepts to Know** — design patterns, framework conventions, and data patterns used in the implementation
- **Architecture Overview** — how the feature's code is organized and why
- **Glossary** — domain-specific or framework-specific terms worth knowing

The guide is written in a mentoring tone — direct, practical, and focused on building transferable judgment rather than narrating code.

### `/speckit.learn.diagrams` — Visualize the architecture

After running `/speckit.plan`, this command generates Mermaid-illustrated Markdown files that visualize the designed architecture with reasoning explaining **why** each structural choice was made. Supports three diagram types:

- **Component Diagram** (`--cd`) — components, data flow, module boundaries, and dependency relationships
- **System Design** (`--sd`) — infrastructure topology: databases, caches, queues, external services, and request flows
- **Software Architecture** (`--sa`) — architectural layers, patterns, dependency direction, and module organization

The `--all` flag (default) is scope-aware: it detects whether the spec describes a new project, a major feature introducing new infrastructure, or a feature-scoped change — and generates only the diagram types that are meaningful for that scope.

### `/speckit.learn.clarify` — Clarify with context

A drop-in enhancement for `/speckit.clarify` that adds:

- **"Why this matters"** block before each question — explains the risk of leaving it unresolved and what downstream decision it unlocks
- **Pros/Cons table** for multiple-choice options — quick signal on tradeoffs
- **Recommended option** with reasoning — so you learn what an experienced engineer would pick and why
- **Mentoring tone** throughout — connects each explanation to real consequences

## Requirements

- [Spec Kit](https://github.com/github/spec-kit) >= 0.1.0

No external MCP servers or tools are required — this extension works entirely with Spec Kit's core artifacts.

## Installation

### From the community catalog

```bash
specify extension add learn
```

Or install from the repository directly:

```bash
specify extension add learn --from https://github.com/imviancagrace/spec-kit-learn/archive/refs/tags/v1.1.0.zip
```

### From a local clone

```bash
git clone https://github.com/imviancagrace/spec-kit-learn.git
cd /path/to/your-speckit-project
specify extension add --dev /path/to/spec-kit-learn
```

After installation, verify:

```bash
specify extension list

# Should show:
#  ✓ Learning Extension (v1.1.0)
#     Generate educational guides from implementations and enhance clarifications with mentoring context
#     Commands: 3 | Hooks: 1 | Status: Enabled
```

## Usage

### Generating a learning guide

After completing implementation, run:

```
/speckit.learn.review
```

Optionally scope to a specific phase, ticket, or topic:

```
/speckit.learn.review Phase 3
/speckit.learn.review PROJ-456
/speckit.learn.review state management
```

This will:
- Load all spec artifacts (spec, plan, tasks, research, data model, contracts)
- Analyze completed tasks and referenced source files
- Prioritize content by educational value
- Write `learn.md` to your feature directory

### Generating architecture diagrams

After planning, run:

```
/speckit.learn.diagrams
```

This generates all applicable diagram types based on the spec's scope. To generate specific diagram types:

```
/speckit.learn.diagrams --cd
/speckit.learn.diagrams --sd --sa
/speckit.learn.diagrams --cd Phase 3
```

| Flag | Output |
|------|--------|
| `--all` (default) | Scope-dependent: all applicable diagrams |
| `--cd` | `component-diagram.md` |
| `--sd` | `system-design.md` |
| `--sa` | `software-architecture.md` |

Each generated file contains Mermaid diagrams and reasoning sections explaining why each architectural choice was made, grounded in `plan.md`, `research.md`, and `spec.md`.

### Clarifying with learning context

Before planning, run:

```
/speckit.learn.clarify
```

This works like `/speckit.clarify` but each question includes:
- Why the clarification matters (risk and downstream impact)
- A recommended answer with reasoning
- Pros/cons for each option

### Hook: after_implement

When enabled, the extension prompts you to generate a learning guide automatically after `/speckit.implement` completes.

## Artifacts

### component-diagram.md / system-design.md / software-architecture.md

Created by `/speckit.learn.diagrams` in your feature directory. Each file contains Mermaid diagrams with reasoning sections. Example structure (`component-diagram.md`):

```markdown
# Component Diagram: [Feature Name]

**Feature**: Browse filing guides by state
**Generated**: 2026-03-26

---

## Component Diagram

(Mermaid diagram here)

## Component Breakdown
### StateSelector
**Role**: Handles state selection and validates against available jurisdictions
**Why this exists as a separate component**: ...

## Design Reasoning
### Why this structure?
...
```

### learn.md

Created by `/speckit.learn.review` in your feature directory. Structured as:

```markdown
# What I Learned: [Feature Name]

**Feature**: Browse filing guides by state
**Generated**: 2026-03-03
**Scope**: Full feature
**Implementation status**: 18/18 tasks completed

---

## Key Decisions
### 1. Client-Side Filtering Instead of Server-Side
...

## Concepts to Know
### Smart vs Presentational Components
...

## Architecture Overview
...

## Glossary
| Term | Meaning |
|------|---------|
| ...  | ...     |
```

## License

MIT
