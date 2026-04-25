# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-03-26

### Added

- `/speckit.learn.diagrams` command — generates Mermaid-illustrated Markdown files for component diagrams (`--cd`), system design (`--sd`), and software architecture (`--sa`) with reasoning grounded in core spec artifacts
- Scope-aware `--all` flag (default) — automatically determines which diagram types are applicable based on whether the spec describes a new project, major feature, or feature-scoped change
- Added `speckit.plan` to required commands (diagrams depend on planning artifacts)

## [1.0.0] - 2026-03-03

### Added

- `/speckit.learn.review` command — generates educational guides (`learn.md`) from completed implementations, covering key decisions, patterns, architecture, and glossary
- `/speckit.learn.clarify` command — enhanced clarification with "Why this matters" context, pros/cons tables, and recommended options to build senior-level thinking
- `after_implement` hook — optional prompt to generate a learning guide after implementation completes
