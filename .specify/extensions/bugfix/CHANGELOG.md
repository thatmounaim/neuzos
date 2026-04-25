# Changelog

## 1.0.0 (2026-04-09)

- Initial release
- Add `/speckit.bugfix.report` command for bug capture and artifact traceability
- Add `/speckit.bugfix.patch` command for surgical spec, plan, and task updates
- Add `/speckit.bugfix.verify` command for post-patch consistency verification
- Bug classification: spec gap, spec conflict, implementation drift, untested flow, dependency issue
- Sequential bug reports stored in `specs/{feature}/bugs/BUG-{NNN}.md`
- Optional `after_implement` hook for consistency checking
- Addresses community request in issue #619 (25+ upvotes, maintainer-approved)
